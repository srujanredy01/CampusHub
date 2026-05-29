"""
Admin Dashboard Serializers — Department, Section, Announcement.
"""
from rest_framework import serializers
from .models import Department, Section, Announcement


class DepartmentSerializer(serializers.ModelSerializer):
    student_count = serializers.ReadOnlyField()
    faculty_count = serializers.ReadOnlyField()
    section_count = serializers.ReadOnlyField()
    head_name = serializers.CharField(source="head.full_name", read_only=True, default="")

    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "description", "head", "head_name",
            "is_active", "student_count", "faculty_count", "section_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SectionSerializer(serializers.ModelSerializer):
    student_count = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_code = serializers.CharField(source="department.code", read_only=True)
    faculty_advisor_name = serializers.CharField(
        source="faculty_advisor.full_name", read_only=True, default=""
    )
    moderator_name = serializers.CharField(
        source="moderator.full_name", read_only=True, default=""
    )

    class Meta:
        model = Section
        fields = [
            "id", "name", "department", "department_name", "department_code",
            "semester", "faculty_advisor", "faculty_advisor_name",
            "moderator", "moderator_name", "max_students", "student_count",
            "display_name", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True, default=""
    )
    target_department_name = serializers.CharField(
        source="target_department.name", read_only=True, default=""
    )
    target_section_name = serializers.CharField(
        source="target_section.display_name", read_only=True, default=""
    )

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "content", "target", "target_department",
            "target_department_name", "target_section", "target_section_name",
            "priority", "is_active", "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
