-- CampusHub PostgreSQL initialization
-- This runs once when the container is first created.

GRANT ALL PRIVILEGES ON DATABASE campushub TO campushub_user;

-- ── Student Master Table ──────────────────────────────────────────────────────
-- Preloaded student registry used to validate registrations.
-- Import your 8000+ records into this table before going live.
-- Format: INSERT INTO student_master (student_id, full_name, branch, academic_year, section, email)
--         VALUES ('12345678', 'John Doe', 'CSE', 1, 'A', 'john@lpu.in');

CREATE TABLE IF NOT EXISTS student_master (
    id           SERIAL PRIMARY KEY,
    student_id   VARCHAR(20) UNIQUE NOT NULL,
    full_name    VARCHAR(255) NOT NULL,
    branch       VARCHAR(100) NOT NULL DEFAULT '',
    academic_year SMALLINT NOT NULL DEFAULT 1,
    section      VARCHAR(10) NOT NULL DEFAULT '',
    email        VARCHAR(254) UNIQUE,
    is_registered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_master_student_id ON student_master(student_id);
CREATE INDEX IF NOT EXISTS idx_student_master_branch     ON student_master(branch);

-- Sample records (replace with real data import)
INSERT INTO student_master (student_id, full_name, branch, academic_year, section, email)
VALUES
    ('12210001', 'Aarav Sharma',    'CSE', 1, 'A', 'aarav@lpu.in'),
    ('12210002', 'Priya Singh',     'CSE', 1, 'B', 'priya@lpu.in'),
    ('12210003', 'Rahul Verma',     'ECE', 2, 'A', 'rahul@lpu.in'),
    ('12210004', 'Sneha Patel',     'ME',  3, 'A', 'sneha@lpu.in'),
    ('12210005', 'Arjun Kumar',     'CSE', 4, 'C', 'arjun@lpu.in')
ON CONFLICT (student_id) DO NOTHING;
