from django.db import connection

cursor = connection.cursor()

# Check existing columns in placement_applications
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'placement_applications' 
    ORDER BY ordinal_position
""")
existing_cols = [r[0] for r in cursor.fetchall()]
print(f"Existing columns in placement_applications: {existing_cols}")

# Expected columns from the model
expected_cols = {
    'id': 'UUID PRIMARY KEY',
    'student_id': 'UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE',
    'company_name': "VARCHAR(255) NOT NULL DEFAULT ''",
    'role': "VARCHAR(255) NOT NULL DEFAULT ''",
    'package_lpa': 'DECIMAL(8,2) NULL',
    'status': "VARCHAR(20) NOT NULL DEFAULT 'wishlist'",
    'application_date': 'DATE NULL',
    'deadline': 'DATE NULL',
    'job_link': "VARCHAR(200) DEFAULT ''",
    'location': "VARCHAR(255) DEFAULT ''",
    'job_type': "VARCHAR(20) NOT NULL DEFAULT 'full_time'",
    'notes': "TEXT DEFAULT ''",
    'offer_received_at': 'DATE NULL',
    'rejection_reason': "TEXT DEFAULT ''",
    'created_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
    'updated_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
}

# Add missing columns
for col, col_type in expected_cols.items():
    if col not in existing_cols:
        # Skip PRIMARY KEY and REFERENCES for ALTER TABLE ADD COLUMN
        simple_type = col_type.replace(' PRIMARY KEY', '').replace(' REFERENCES users(id) ON DELETE CASCADE', '')
        sql = f'ALTER TABLE placement_applications ADD COLUMN IF NOT EXISTS "{col}" {simple_type};'
        print(f"Adding column: {col}")
        try:
            cursor.execute(sql)
        except Exception as e:
            print(f"  Error: {e}")

# Now fix interview_experiences table - drop and recreate with correct schema
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'interview_experiences' 
    ORDER BY ordinal_position
""")
ie_cols = [r[0] for r in cursor.fetchall()]
print(f"\nExisting columns in interview_experiences: {ie_cols}")

ie_expected = {
    'id': 'UUID PRIMARY KEY',
    'application_id': 'UUID NOT NULL REFERENCES placement_applications(id) ON DELETE CASCADE',
    'round_type': "VARCHAR(20) NOT NULL DEFAULT 'other'",
    'round_number': 'INTEGER NOT NULL DEFAULT 1',
    'interview_date': 'DATE NULL',
    'result': "VARCHAR(10) NOT NULL DEFAULT 'pending'",
    'questions_asked': "TEXT DEFAULT ''",
    'experience_notes': "TEXT DEFAULT ''",
    'difficulty': "VARCHAR(10) DEFAULT ''",
    'duration_minutes': 'INTEGER NULL',
    'created_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
}

for col, col_type in ie_expected.items():
    if col not in ie_cols:
        simple_type = col_type.replace(' PRIMARY KEY', '').replace(' REFERENCES placement_applications(id) ON DELETE CASCADE', '')
        sql = f'ALTER TABLE interview_experiences ADD COLUMN IF NOT EXISTS "{col}" {simple_type};'
        print(f"Adding column to interview_experiences: {col}")
        try:
            cursor.execute(sql)
        except Exception as e:
            print(f"  Error: {e}")

# Fix company_notes table
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'company_notes' 
    ORDER BY ordinal_position
""")
cn_cols = [r[0] for r in cursor.fetchall()]
print(f"\nExisting columns in company_notes: {cn_cols}")

cn_expected = {
    'id': 'UUID PRIMARY KEY',
    'student_id': 'UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE',
    'company_name': "VARCHAR(255) NOT NULL DEFAULT ''",
    'notes': "TEXT NOT NULL DEFAULT ''",
    'salary_info': "TEXT DEFAULT ''",
    'interview_tips': "TEXT DEFAULT ''",
    'saved_questions': "JSONB DEFAULT '[]'",
    'created_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
    'updated_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
}

for col, col_type in cn_expected.items():
    if col not in cn_cols:
        simple_type = col_type.replace(' PRIMARY KEY', '').replace(' REFERENCES users(id) ON DELETE CASCADE', '')
        sql = f'ALTER TABLE company_notes ADD COLUMN IF NOT EXISTS "{col}" {simple_type};'
        print(f"Adding column to company_notes: {col}")
        try:
            cursor.execute(sql)
        except Exception as e:
            print(f"  Error: {e}")

print("\nDone! Schema sync complete.")
