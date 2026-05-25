"""
CampusHub Code Executor Service
Runs user code in isolated Docker containers with strict resource limits.
"""

import logging
import os
import subprocess
import tempfile
import time
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CampusHub Executor", version="1.1.0")

# Hard safety limits
DEFAULT_MEMORY_LIMIT_MB = int(os.getenv("EXECUTOR_MEMORY_MB", "192"))
DEFAULT_TIMEOUT_SEC = int(os.getenv("EXECUTOR_TIMEOUT_SEC", "8"))
MAX_TIMEOUT_SEC = 15
MAX_OUTPUT_SIZE = 16 * 1024  # 16KB
MAX_CODE_SIZE = 50 * 1024  # 50KB
MAX_STDIN_SIZE = 20 * 1024  # 20KB

SQL_RUNNER = """import sqlite3, sys
sql_path = sys.argv[1]
with open(sql_path, "r", encoding="utf-8") as f:
    sql = f.read()
conn = sqlite3.connect(":memory:")
cur = conn.cursor()
parts = [p.strip() for p in sql.split(";") if p.strip()]
for i, stmt in enumerate(parts):
    cur.execute(stmt)
    if i == len(parts) - 1 and stmt.lower().startswith("select"):
        rows = cur.fetchall()
        for r in rows:
            print("\\t".join("" if v is None else str(v) for v in r))
conn.commit()
conn.close()
"""

LANGUAGE_CONFIG = {
    "python": {
        "image": "python:3.11-alpine",
        "filename": "solution.py",
        "run_cmd": ["python", "solution.py"],
        "compile_cmd": None,
    },
    "java": {
        "image": "openjdk:17-alpine",
        "filename": "Solution.java",
        "run_cmd": ["java", "Solution"],
        "compile_cmd": ["javac", "Solution.java"],
    },
    "cpp": {
        "image": "gcc:12-alpine",
        "filename": "solution.cpp",
        "run_cmd": ["./solution"],
        "compile_cmd": ["g++", "-O2", "-std=c++17", "-o", "solution", "solution.cpp"],
    },
    "javascript": {
        "image": "node:18-alpine",
        "filename": "solution.js",
        "run_cmd": ["node", "solution.js"],
        "compile_cmd": None,
    },
    "c": {
        "image": "gcc:12-alpine",
        "filename": "solution.c",
        "run_cmd": ["./solution"],
        "compile_cmd": ["gcc", "-O2", "-std=c17", "-o", "solution", "solution.c"],
    },
    "sql": {
        "image": "python:3.11-alpine",
        "filename": "solution.sql",
        "run_cmd": ["python", "sql_runner.py", "solution.sql"],
        "compile_cmd": None,
    },
    "go": {
        "image": "golang:1.22-alpine",
        "filename": "solution.go",
        "run_cmd": ["go", "run", "solution.go"],
        "compile_cmd": None,
    },
}


class ExecuteRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = ""
    timeout_sec: Optional[int] = DEFAULT_TIMEOUT_SEC
    memory_limit_mb: Optional[int] = DEFAULT_MEMORY_LIMIT_MB


class TestCase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class JudgeRequest(BaseModel):
    language: str
    code: str
    test_cases: List[TestCase]
    timeout_sec: Optional[int] = DEFAULT_TIMEOUT_SEC
    memory_limit_mb: Optional[int] = DEFAULT_MEMORY_LIMIT_MB


class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    execution_time: float
    memory_used: Optional[int] = None
    exit_code: int
    status: str  # success, TLE, MLE, RE, CE


def _sanitize_limits(timeout_sec: Optional[int], memory_mb: Optional[int]):
    timeout = DEFAULT_TIMEOUT_SEC if timeout_sec is None else int(timeout_sec)
    memory = DEFAULT_MEMORY_LIMIT_MB if memory_mb is None else int(memory_mb)
    timeout = max(1, min(timeout, MAX_TIMEOUT_SEC))
    memory = max(64, min(memory, 512))
    return timeout, memory


def _docker_base_args(tmpdir: str, image: str, memory_mb: int, writable: bool):
    volume_mode = "rw" if writable else "ro"
    # Use EXECUTOR_WORK_DIR env var if set (for Docker-in-Docker with shared volume)
    # This maps the container-internal path to the host path that Docker daemon can see
    host_path = tmpdir
    work_dir_mapping = os.getenv("EXECUTOR_WORK_DIR_HOST")
    work_dir_container = os.getenv("EXECUTOR_WORK_DIR", "/tmp")
    if work_dir_mapping and tmpdir.startswith(work_dir_container):
        # Replace container path prefix with host path prefix
        host_path = tmpdir.replace(work_dir_container, work_dir_mapping, 1)

    args = [
        "docker", "run", "--rm", "-i",
        "--memory", f"{memory_mb}m",
        "--memory-swap", f"{memory_mb}m",
        "--cpus", "0.5",
        "--network", "none",
        "--pids-limit", "64",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
    ]

    # If using a named Docker volume, mount it by volume name
    executor_volume = os.getenv("EXECUTOR_VOLUME_NAME")
    if executor_volume and tmpdir.startswith(work_dir_container):
        # Get the relative path within the work dir
        rel_path = os.path.relpath(tmpdir, work_dir_container)
        args += ["-v", f"{executor_volume}:/work_root:{volume_mode}"]
        args += ["-w", f"/work_root/{rel_path}"]
    else:
        args += ["--read-only", "--tmpfs", "/tmp:size=64m"]
        args += ["--user", "65534:65534"]
        args += ["-v", f"{host_path}:/code:{volume_mode}"]
        args += ["-w", "/code"]

    args.append(image)
    return args


def run_in_docker(language: str, code: str, stdin: str = "", timeout_sec: int = DEFAULT_TIMEOUT_SEC, memory_limit_mb: int = DEFAULT_MEMORY_LIMIT_MB) -> dict:
    config = LANGUAGE_CONFIG.get(language)
    if not config:
        raise ValueError(f"Unsupported language: {language}")

    timeout_sec, memory_limit_mb = _sanitize_limits(timeout_sec, memory_limit_mb)

    # Use EXECUTOR_WORK_DIR for temp files (allows shared volume mapping)
    work_dir = os.getenv("EXECUTOR_WORK_DIR", None)
    with tempfile.TemporaryDirectory(dir=work_dir) as tmpdir:
        # Ensure the temp dir is world-readable for the sandboxed container user (65534)
        os.chmod(tmpdir, 0o755)

        code_file = os.path.join(tmpdir, config["filename"])
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)
        os.chmod(code_file, 0o644)

        if language == "sql":
            runner_file = os.path.join(tmpdir, "sql_runner.py")
            with open(runner_file, "w", encoding="utf-8") as f:
                f.write(SQL_RUNNER)

        if config["compile_cmd"]:
            compile_result = subprocess.run(
                _docker_base_args(tmpdir, config["image"], memory_limit_mb, writable=True) + config["compile_cmd"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if compile_result.returncode != 0:
                return {
                    "stdout": "",
                    "stderr": (compile_result.stderr or compile_result.stdout)[:MAX_OUTPUT_SIZE],
                    "execution_time": 0,
                    "exit_code": compile_result.returncode,
                    "status": "CE",
                }

        start_time = time.time()
        try:
            run_result = subprocess.run(
                _docker_base_args(tmpdir, config["image"], memory_limit_mb, writable=False) + config["run_cmd"],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
            )
            execution_time = time.time() - start_time
            stdout = (run_result.stdout or "")[:MAX_OUTPUT_SIZE]
            stderr = (run_result.stderr or "")[:MAX_OUTPUT_SIZE]
            status = "success"

            if run_result.returncode != 0:
                if run_result.returncode == 137 or "killed" in stderr.lower() or "oom" in stderr.lower():
                    status = "MLE"
                else:
                    status = "RE"

            return {
                "stdout": stdout,
                "stderr": stderr,
                "execution_time": round(execution_time, 3),
                "exit_code": run_result.returncode,
                "status": status,
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Time Limit Exceeded",
                "execution_time": timeout_sec,
                "exit_code": -1,
                "status": "TLE",
            }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "executor"}


@app.post("/execute", response_model=ExecuteResponse)
def execute_code(request: ExecuteRequest):
    if request.language not in LANGUAGE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    if len(request.code) > MAX_CODE_SIZE:
        raise HTTPException(status_code=400, detail="Code too large (max 50KB)")
    if len(request.stdin or "") > MAX_STDIN_SIZE:
        raise HTTPException(status_code=400, detail="Input too large (max 20KB)")

    try:
        result = run_in_docker(
            request.language,
            request.code,
            request.stdin or "",
            request.timeout_sec or DEFAULT_TIMEOUT_SEC,
            request.memory_limit_mb or DEFAULT_MEMORY_LIMIT_MB,
        )
        return ExecuteResponse(**result)
    except Exception as e:
        logger.exception("Execution error: %s", e)
        raise HTTPException(status_code=500, detail="Execution failed")


@app.post("/judge")
def judge_code(request: JudgeRequest):
    if request.language not in LANGUAGE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    if len(request.code) > MAX_CODE_SIZE:
        raise HTTPException(status_code=400, detail="Code too large (max 50KB)")

    test_results = []
    overall_stdout = ""
    overall_stderr = ""
    overall_time = 0.0

    for i, tc in enumerate(request.test_cases):
        result = run_in_docker(
            request.language,
            request.code,
            tc.input,
            request.timeout_sec or DEFAULT_TIMEOUT_SEC,
            request.memory_limit_mb or DEFAULT_MEMORY_LIMIT_MB,
        )

        actual_output = (result.get("stdout") or "").strip()
        expected_output = (tc.expected_output or "").strip()
        passed = actual_output == expected_output and result["status"] == "success"

        test_results.append(
            {
                "test_case": i + 1,
                "passed": passed,
                "status": result["status"],
                "actual_output": actual_output if not tc.is_hidden else None,
                "expected_output": expected_output if not tc.is_hidden else None,
                "execution_time": result["execution_time"],
                "is_hidden": tc.is_hidden,
            }
        )

        overall_time += float(result["execution_time"])
        if i == 0:
            overall_stdout = result["stdout"]
            overall_stderr = result["stderr"]
        if result["status"] == "CE":
            break

    return {
        "test_results": test_results,
        "stdout": overall_stdout,
        "stderr": overall_stderr,
        "execution_time": round(overall_time, 3),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
