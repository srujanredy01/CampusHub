from rest_framework import serializers
from .models import SubjectAttendance, AttendanceHistory


class SubjectAttendanceSerializer(serializers.ModelSerializer):
    attendance_percentage = serializers.ReadOnlyField()
    is_shortage           = serializers.ReadOnlyField()
    classes_needed        = serializers.ReadOnlyField()
    classes_needed_75     = serializers.ReadOnlyField()
    classes_needed_80     = serializers.ReadOnlyField()
    missed_classes        = serializers.ReadOnlyField()
    classes_can_miss      = serializers.ReadOnlyField()

    class Meta:
        model  = SubjectAttendance
        fields = [
            "id", "subject_name", "subject_code", "semester",
            "total_classes", "attended_classes", "required_percentage",
            "attendance_percentage", "is_shortage",
            "classes_needed", "classes_needed_75", "classes_needed_80",
            "missed_classes", "classes_can_miss",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        total = attrs.get("total_classes", getattr(self.instance, "total_classes", 0))
        attended = attrs.get("attended_classes", getattr(self.instance, "attended_classes", 0))
        required = attrs.get("required_percentage", getattr(self.instance, "required_percentage", 75))
        semester = attrs.get("semester", getattr(self.instance, "semester", None))

        if total < 0 or attended < 0:
            raise serializers.ValidationError("Class counts must be non-negative.")
        if attended > total:
            raise serializers.ValidationError("Attended classes cannot exceed total classes.")
        if required < 0 or required > 100:
            raise serializers.ValidationError("Required percentage must be between 0 and 100.")
        if semester is not None and (semester < 1 or semester > 8):
            raise serializers.ValidationError("Semester must be between 1 and 8.")
        return attrs


class AttendanceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = AttendanceHistory
        fields = [
            "id", "subject_name", "subject_code", "semester",
            "action", "old_total", "old_attended", "new_total", "new_attended",
            "old_percentage", "new_percentage", "created_at",
        ]
        read_only_fields = fields


class AttendancePredictionSerializer(serializers.Serializer):
    """Serializer for prediction request."""
    future_classes = serializers.IntegerField(min_value=1, max_value=200, default=5)


class AdminAttendanceRecordSerializer(serializers.ModelSerializer):
    """Admin view of student attendance with user info."""
    attendance_percentage = serializers.ReadOnlyField()
    is_shortage           = serializers.ReadOnlyField()
    classes_needed        = serializers.ReadOnlyField()
    classes_needed_75     = serializers.ReadOnlyField()
    classes_needed_80     = serializers.ReadOnlyField()
    missed_classes        = serializers.ReadOnlyField()
    classes_can_miss      = serializers.ReadOnlyField()
    student_name          = serializers.CharField(source="student.full_name", read_only=True)
    student_email         = serializers.CharField(source="student.email", read_only=True)
    student_id_number     = serializers.CharField(source="student.student_id", read_only=True)
    student_branch        = serializers.CharField(source="student.branch", read_only=True)

    class Meta:
        model  = SubjectAttendance
        fields = [
            "id", "student_id", "student_name", "student_email",
            "student_id_number", "student_branch",
            "subject_name", "subject_code", "semester",
            "total_classes", "attended_classes", "required_percentage",
            "attendance_percentage", "is_shortage",
            "classes_needed", "classes_needed_75", "classes_needed_80",
            "missed_classes", "classes_can_miss",
            "created_at", "updated_at",
        ]
