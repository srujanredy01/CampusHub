"""
Tests for model logic and constraints.
"""
import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
            full_name="Test User",
            student_id="1000001",
        )
        assert user.email == "test@example.com"
        assert user.is_active is False  # Default inactive until email verified
        assert user.role == "student"
        assert user.check_password("TestPass123!")

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            email="super@example.com",
            password="SuperPass123!",
            full_name="Super Admin",
        )
        assert user.is_active is True
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.role == "admin"

    def test_email_uniqueness(self):
        User.objects.create_user(
            email="unique@example.com",
            password="Pass123!",
            full_name="First",
            student_id="3000001",
        )
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email="unique@example.com",
                password="Pass123!",
                full_name="Second",
                student_id="3000002",
            )

    def test_student_id_uniqueness(self):
        User.objects.create_user(
            email="first@example.com",
            password="Pass123!",
            full_name="First",
            student_id="4000001",
        )
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email="second@example.com",
                password="Pass123!",
                full_name="Second",
                student_id="4000001",
            )

    def test_is_admin_property(self):
        admin = User.objects.create_superuser(
            email="admin2@example.com",
            password="Pass123!",
            full_name="Admin",
        )
        student = User.objects.create_user(
            email="student2@example.com",
            password="Pass123!",
            full_name="Student",
            student_id="5000001",
        )
        assert admin.is_admin is True
        assert student.is_admin is False


class TestAttendanceModel:
    def test_attendance_percentage(self):
        from apps.attendance.models import SubjectAttendance
        user = User.objects.create_user(
            email="att@test.com", password="Pass123!", full_name="Att", student_id="6000001"
        )
        record = SubjectAttendance.objects.create(
            student=user,
            subject_name="Math",
            semester=1,
            total_classes=100,
            attended_classes=75,
        )
        assert record.attendance_percentage == 75.0
        assert record.is_shortage is False
        assert record.missed_classes == 25

    def test_shortage_detection(self):
        from apps.attendance.models import SubjectAttendance
        user = User.objects.create_user(
            email="att2@test.com", password="Pass123!", full_name="Att2", student_id="6000002"
        )
        record = SubjectAttendance.objects.create(
            student=user,
            subject_name="Physics",
            semester=1,
            total_classes=100,
            attended_classes=60,
            required_percentage=75,
        )
        assert record.attendance_percentage == 60.0
        assert record.is_shortage is True
        assert record.classes_needed > 0

    def test_zero_classes(self):
        from apps.attendance.models import SubjectAttendance
        user = User.objects.create_user(
            email="att3@test.com", password="Pass123!", full_name="Att3", student_id="6000003"
        )
        record = SubjectAttendance.objects.create(
            student=user,
            subject_name="Chemistry",
            semester=1,
            total_classes=0,
            attended_classes=0,
        )
        assert record.attendance_percentage == 0.0
        assert record.is_shortage is False


class TestCodingQuestionModel:
    def test_acceptance_rate(self):
        from apps.coding.models import CodingQuestion
        user = User.objects.create_user(
            email="cq@test.com", password="Pass123!", full_name="CQ", student_id="7000001"
        )
        q = CodingQuestion.objects.create(
            title="Test Q",
            description="Desc",
            topic="arrays",
            difficulty="easy",
            total_submissions=100,
            accepted_submissions=45,
            created_by=user,
        )
        assert q.acceptance_rate == 45.0

    def test_zero_submissions_acceptance_rate(self):
        from apps.coding.models import CodingQuestion
        user = User.objects.create_user(
            email="cq2@test.com", password="Pass123!", full_name="CQ2", student_id="7000002"
        )
        q = CodingQuestion.objects.create(
            title="Empty Q",
            description="Desc",
            topic="strings",
            difficulty="medium",
            created_by=user,
        )
        assert q.acceptance_rate == 0
