from decimal import Decimal
from rest_framework import serializers
from .models import AcademicProfile, SemesterRecord, SubjectRecord, CGPAHistory

GRADE_POINTS = {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "P": 4, "F": 0}

MARKS_TO_GRADE = [
    (90, "O"),
    (80, "A+"),
    (70, "A"),
    (60, "B+"),
    (50, "B"),
    (45, "C"),
    (40, "P"),
    (0, "F"),
]


def marks_to_grade(marks):
    """Convert percentage marks to grade."""
    for threshold, grade in MARKS_TO_GRADE:
        if marks >= threshold:
            return grade
    return "F"


def recalculate_profile(profile):
    """Recalculate the academic profile from all semester records."""
    profile.recalculate()
    return profile


def record_history(user, action, details=None):
    """Record a CGPA history snapshot."""
    profile = AcademicProfile.objects.filter(user=user).first()
    if not profile:
        return
    CGPAHistory.objects.create(
        user=user,
        cgpa_at_time=profile.current_cgpa,
        total_credits_at_time=profile.total_credits_earned,
        total_semesters_at_time=profile.total_semesters,
        action=action,
        details=details or {},
    )


class SubjectRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectRecord
        fields = [
            "id", "subject_name", "subject_code", "credits", "grade",
            "grade_points", "internal_marks", "external_marks", "total_marks",
            "is_backlog",
        ]
        read_only_fields = ["id", "grade_points", "total_marks", "is_backlog"]

    def validate_subject_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Subject name must be at least 2 characters.")
        return value

    def validate_credits(self, value):
        if value < 1 or value > 10:
            raise serializers.ValidationError("Credits must be between 1 and 10.")
        return value

    def validate_grade(self, value):
        if value not in GRADE_POINTS:
            raise serializers.ValidationError(f"Unsupported grade. Valid: {list(GRADE_POINTS.keys())}")
        return value

    def validate_internal_marks(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("Internal marks must be between 0 and 100.")
        return value

    def validate_external_marks(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("External marks must be between 0 and 100.")
        return value


class SemesterRecordSerializer(serializers.ModelSerializer):
    subjects = SubjectRecordSerializer(many=True, required=True)

    class Meta:
        model = SemesterRecord
        fields = [
            "id", "semester", "semester_name", "academic_year",
            "sgpa", "total_credits", "total_subjects", "failed_subjects",
            "subjects", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "sgpa", "total_credits", "total_subjects",
            "failed_subjects", "created_at", "updated_at",
        ]

    def validate_semester(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("Semester must be between 1 and 12.")
        return value

    def validate_subjects(self, value):
        if not value:
            raise serializers.ValidationError("At least one subject is required.")
        if len(value) > 15:
            raise serializers.ValidationError("Maximum 15 subjects per semester.")
        return value

    def create(self, validated_data):
        subjects_data = validated_data.pop("subjects", [])
        sem = SemesterRecord.objects.create(**validated_data)
        self._save_subjects_and_recalculate(sem, subjects_data)
        return sem

    def update(self, instance, validated_data):
        subjects_data = validated_data.pop("subjects", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if subjects_data is not None:
            self._save_subjects_and_recalculate(instance, subjects_data)
        return instance

    def _save_subjects_and_recalculate(self, sem, subjects_data):
        sem.subjects.all().delete()
        for subject in subjects_data:
            grade = subject.get("grade", "O")
            subject["grade_points"] = GRADE_POINTS.get(grade, 0)
            SubjectRecord.objects.create(semester_record=sem, **subject)
        sem.recalculate()
        recalculate_profile(sem.profile)


class AcademicProfileSerializer(serializers.ModelSerializer):
    semesters = SemesterRecordSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    student_id = serializers.CharField(source="user.student_id", read_only=True)
    branch = serializers.CharField(source="user.branch", read_only=True)

    class Meta:
        model = AcademicProfile
        fields = [
            "id", "user_name", "user_email", "student_id", "branch",
            "current_cgpa", "total_credits_earned", "total_semesters",
            "highest_sgpa", "lowest_sgpa", "total_backlogs",
            "academic_standing", "semesters", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "current_cgpa", "total_credits_earned", "total_semesters",
            "highest_sgpa", "lowest_sgpa", "total_backlogs",
            "academic_standing", "created_at", "updated_at",
        ]


class CGPAHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CGPAHistory
        fields = [
            "id", "cgpa_at_time", "total_credits_at_time",
            "total_semesters_at_time", "action", "details", "created_at",
        ]
        read_only_fields = fields


class GradeConverterSerializer(serializers.Serializer):
    grade = serializers.ChoiceField(choices=list(GRADE_POINTS.keys()), required=False)
    marks = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, min_value=0, max_value=100)

    def validate(self, attrs):
        if not attrs.get("grade") and attrs.get("marks") is None:
            raise serializers.ValidationError("Provide either 'grade' or 'marks'.")
        return attrs


class TargetPredictorSerializer(serializers.Serializer):
    target_cgpa = serializers.DecimalField(max_digits=4, decimal_places=2, min_value=0, max_value=10)
    remaining_semesters = serializers.IntegerField(min_value=1, max_value=12)
    avg_credits_per_semester = serializers.IntegerField(min_value=1, max_value=40, default=20)


class BulkSemesterSerializer(serializers.Serializer):
    """For saving multiple semesters at once."""
    semesters = SemesterRecordSerializer(many=True)

    def validate_semesters(self, value):
        if not value:
            raise serializers.ValidationError("At least one semester is required.")
        if len(value) > 12:
            raise serializers.ValidationError("Maximum 12 semesters allowed.")
        # Check for duplicate semester numbers
        sem_nums = [s["semester"] for s in value]
        if len(sem_nums) != len(set(sem_nums)):
            raise serializers.ValidationError("Duplicate semester numbers found.")
        return value


# ── Backward compatibility aliases ────────────────────────────────────────────
CGPARecordSerializer = AcademicProfileSerializer
SemesterGPASerializer = SemesterRecordSerializer
SubjectGradeSerializer = SubjectRecordSerializer
