import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CodingQuestion",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("topic", models.CharField(choices=[("arrays", "Arrays"), ("strings", "Strings"), ("linked_list", "Linked List"), ("trees", "Trees"), ("graphs", "Graphs"), ("dp", "Dynamic Programming"), ("sorting", "Sorting"), ("searching", "Searching"), ("recursion", "Recursion"), ("math", "Mathematics"), ("greedy", "Greedy"), ("backtracking", "Backtracking"), ("stack_queue", "Stack & Queue"), ("hashing", "Hashing"), ("bit_manipulation", "Bit Manipulation"), ("other", "Other")], max_length=30)),
                ("difficulty", models.CharField(choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")], max_length=10)),
                ("constraints", models.TextField(blank=True, default="")),
                ("sample_input", models.TextField(blank=True, default="")),
                ("sample_output", models.TextField(blank=True, default="")),
                ("explanation", models.TextField(blank=True, default="")),
                ("hidden_test_cases", models.JSONField(default=list)),
                ("starter_code", models.JSONField(default=dict)),
                ("total_submissions", models.PositiveIntegerField(default=0)),
                ("accepted_submissions", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_questions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "coding_questions", "ordering": ["difficulty", "title"]},
        ),
        migrations.CreateModel(
            name="Submission",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("language", models.CharField(choices=[("python", "Python"), ("java", "Java"), ("cpp", "C++"), ("javascript", "JavaScript")], max_length=15)),
                ("code", models.TextField()),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("accepted", "Accepted"), ("wrong_answer", "Wrong Answer"), ("time_limit_exceeded", "Time Limit Exceeded"), ("memory_limit_exceeded", "Memory Limit Exceeded"), ("runtime_error", "Runtime Error"), ("compilation_error", "Compilation Error")], default="pending", max_length=30)),
                ("stdout", models.TextField(blank=True, default="")),
                ("stderr", models.TextField(blank=True, default="")),
                ("execution_time", models.FloatField(blank=True, null=True)),
                ("memory_used", models.PositiveIntegerField(blank=True, null=True)),
                ("test_results", models.JSONField(default=list)),
                ("passed_test_cases", models.PositiveIntegerField(default=0)),
                ("total_test_cases", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="submissions", to="coding.codingquestion")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="submissions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "submissions", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="SavedQuestion",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_by", to="coding.codingquestion")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_questions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "saved_questions", "ordering": ["-created_at"], "unique_together": {("user", "question")}},
        ),
        migrations.AddIndex(
            model_name="codingquestion",
            index=models.Index(fields=["topic", "difficulty"], name="coding_topic_diff_idx"),
        ),
        migrations.AddIndex(
            model_name="codingquestion",
            index=models.Index(fields=["is_active"], name="coding_active_idx"),
        ),
        migrations.AddIndex(
            model_name="submission",
            index=models.Index(fields=["user", "question"], name="sub_user_question_idx"),
        ),
        migrations.AddIndex(
            model_name="submission",
            index=models.Index(fields=["user", "status"], name="sub_user_status_idx"),
        ),
        migrations.AddIndex(
            model_name="submission",
            index=models.Index(fields=["question", "status"], name="sub_question_status_idx"),
        ),
    ]
