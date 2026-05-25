# Executor Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install Docker CLI (to spawn sibling containers) and curl for health checks
RUN apt-get update && apt-get install -y \
    docker.io \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY executor.py .

EXPOSE 8001

CMD ["uvicorn", "executor:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
