from decimal import Decimal
from django.db.models import Q as models_Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from campushub.permissions import IsAdmin
from .models import AcademicProfile, SemesterRecord, SubjectRecord, CGPAHistory
from .serializers import (
    AcademicProfileSerializer,
    BulkSemesterSerializer,
    CGPAHistorySerializer,
    GradeConverterSerializer,
    GRADE_POINTS,
    MARKS_TO_GRADE,
    marks_to_grade,
    record_history,
    recalculate_profile,
    SemesterRecordSerializer,
    TargetPredictorSerializer,
)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST, errors=None):
    payload = {"success": False, "error": {"message": message}}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=code)


# ══════════════════════════════════════════════════════════════════════════════
#  STUDENT VIEWS
# ══════════════════════════════════════════════════════════════════════════════


class CGPAView(APIView):
    """GET /api/cgpa/ — get or create the student's academic profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = AcademicProfile.objects.get_or_create(user=request.user)
        return ok(AcademicProfileSerializer(profile).data)


class SemesterListCreateView(APIView):
    """GET/POST /api/cgpa/semester — list or create semesters."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = AcademicProfile.objects.get_or_create(user=request.user)
        data = SemesterRecordSerializer(profile.semesters.order_by("semester"), many=True).data
        return ok(data)

    def post(self, request):
        profile, _ = AcademicProfile.objects.get_or_create(user=request.user)
        semester_num = request.data.get("semester")

        # Check if semester already exists — update it
        existing = SemesterRecord.objects.filter(profile=profile, semester=semester_num).first()
        if existing:
            serializer = SemesterRecordSerializer(existing, data=request.data, partial=False)
        else:
            serializer = SemesterRecordSerializer(data=request.data)

        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)

        semester = serializer.save(profile=profile)
        profile.refresh_from_db()

        # Record history
        record_history(
            request.user,
            "semester_updated" if existing else "semester_added",
            {"semester": semester.semester, "sgpa": str(semester.sgpa)},
        )

        return ok(
            {
                "semester": SemesterRecordSerializer(semester).data,
                "current_cgpa": str(profile.current_cgpa),
                "total_credits_earned": profile.total_credits_earned,
                "total_semesters": profile.total_semesters,
                "academic_standing": profile.academic_standing,
            },
            "Semester saved.",
            status.HTTP_201_CREATED,
        )


class SemesterDetailView(APIView):
    """PUT/PATCH/DELETE /api/cgpa/semester/<pk>"""
    permission_classes = [IsAuthenticated]

    def get_object(self, user, pk):
        return SemesterRecord.objects.filter(pk=pk, profile__user=user).first()

    def get(self, request, pk):
        semester = self.get_object(request.user, pk)
        if not semester:
            return err("Semester not found.", status.HTTP_404_NOT_FOUND)
        return ok(SemesterRecordSerializer(semester).data)

    def put(self, request, pk):
        semester = self.get_object(request.user, pk)
        if not semester:
            return err("Semester not found.", status.HTTP_404_NOT_FOUND)
        serializer = SemesterRecordSerializer(semester, data=request.data, partial=False)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        semester = serializer.save()
        record_history(
            request.user, "semester_updated",
            {"semester": semester.semester, "sgpa": str(semester.sgpa)},
        )
        return ok(SemesterRecordSerializer(semester).data, "Semester updated.")

    def patch(self, request, pk):
        semester = self.get_object(request.user, pk)
        if not semester:
            return err("Semester not found.", status.HTTP_404_NOT_FOUND)
        serializer = SemesterRecordSerializer(semester, data=request.data, partial=True)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        semester = serializer.save()
        record_history(
            request.user, "semester_updated",
            {"semester": semester.semester, "sgpa": str(semester.sgpa)},
        )
        return ok(SemesterRecordSerializer(semester).data, "Semester updated.")

    def delete(self, request, pk):
        semester = self.get_object(request.user, pk)
        if not semester:
            return err("Semester not found.", status.HTTP_404_NOT_FOUND)
        profile = semester.profile
        sem_num = semester.semester
        semester.delete()
        recalculate_profile(profile)
        record_history(
            request.user, "semester_deleted",
            {"semester": sem_num},
        )
        return ok(
            {
                "current_cgpa": str(profile.current_cgpa),
                "total_credits_earned": profile.total_credits_earned,
                "total_semesters": profile.total_semesters,
            },
            "Semester deleted.",
        )


class BulkSaveSemestersView(APIView):
    """POST /api/cgpa/bulk-save — save multiple semesters at once."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BulkSemesterSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)

        profile, _ = AcademicProfile.objects.get_or_create(user=request.user)
        saved = []

        for sem_data in serializer.validated_data["semesters"]:
            semester_num = sem_data["semester"]
            existing = SemesterRecord.objects.filter(profile=profile, semester=semester_num).first()
            if existing:
                sem_serializer = SemesterRecordSerializer(existing, data=sem_data, partial=False)
            else:
                sem_serializer = SemesterRecordSerializer(data=sem_data)

            if sem_serializer.is_valid():
                sem = sem_serializer.save(profile=profile)
                saved.append(sem.semester)

        profile.refresh_from_db()
        record_history(request.user, "bulk_save", {"semesters_saved": saved})

        return ok(
            AcademicProfileSerializer(profile).data,
            f"Saved {len(saved)} semesters.",
            status.HTTP_201_CREATED,
        )


class GradeConverterView(APIView):
    """POST /api/cgpa/grade-convert — convert grade ↔ points ↔ marks."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GradeConverterSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)

        result = {}
        grade = serializer.validated_data.get("grade")
        marks = serializer.validated_data.get("marks")

        if grade:
            result["grade"] = grade
            result["grade_point"] = GRADE_POINTS[grade]
        if marks is not None:
            converted_grade = marks_to_grade(float(marks))
            result["marks"] = float(marks)
            result["grade_from_marks"] = converted_grade
            result["grade_point_from_marks"] = GRADE_POINTS[converted_grade]

        # Include full grade table
        result["grade_table"] = [
            {"grade": g, "points": p, "min_marks": threshold}
            for threshold, g in MARKS_TO_GRADE
            for gp_grade, p in GRADE_POINTS.items()
            if gp_grade == g
        ]

        return ok(result)


class TargetPredictorView(APIView):
    """POST /api/cgpa/predict-target — predict required SGPA for target CGPA."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TargetPredictorSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)

        profile, _ = AcademicProfile.objects.get_or_create(user=request.user)
        target_cgpa = Decimal(serializer.validated_data["target_cgpa"])
        remaining_semesters = serializer.validated_data["remaining_semesters"]
        credits_per_sem = serializer.validated_data["avg_credits_per_semester"]

        current_cgpa = Decimal(profile.current_cgpa or 0)
        current_credits = int(profile.total_credits_earned or 0)
        current_weighted = current_cgpa * current_credits

        future_credits = remaining_semesters * credits_per_sem
        if future_credits <= 0:
            return err("avg_credits_per_semester must be greater than 0.")

        if current_credits == 0:
            required_sgpa = target_cgpa
        else:
            required_sgpa = (
                (target_cgpa * (current_credits + future_credits)) - current_weighted
            ) / future_credits

        is_possible = required_sgpa <= 10
        difficulty = "easy" if required_sgpa <= 7 else "moderate" if required_sgpa <= 8.5 else "hard" if required_sgpa <= 9.5 else "impossible"

        return ok({
            "current_cgpa": str(round(current_cgpa, 2)),
            "target_cgpa": str(target_cgpa),
            "required_avg_sgpa": str(round(required_sgpa, 2)),
            "remaining_semesters": remaining_semesters,
            "avg_credits_per_semester": credits_per_sem,
            "is_possible": is_possible,
            "difficulty": difficulty,
            "semester_plan": [
                {
                    "semester": profile.total_semesters + i + 1,
                    "required_sgpa": str(round(required_sgpa, 2)),
                    "credits": credits_per_sem,
                }
                for i in range(remaining_semesters)
            ],
        })


class CGPAAnalyticsView(APIView):
    """GET /api/cgpa/analytics — detailed analytics for the student."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = AcademicProfile.objects.get_or_create(user=request.user)
        semesters = list(profile.semesters.order_by("semester"))

        # SGPA series
        sem_points = [
            {
                "semester": sem.semester,
                "semester_name": sem.semester_name,
                "academic_year": sem.academic_year,
                "sgpa": float(sem.sgpa),
                "credits": sem.total_credits,
                "total_subjects": sem.total_subjects,
                "failed_subjects": sem.failed_subjects,
                "updated_at": sem.updated_at,
            }
            for sem in semesters
        ]

        # CGPA progress (rolling)
        cgpa_progress = []
        total_credits = 0
        weighted = Decimal(0)
        for sem in semesters:
            total_credits += sem.total_credits
            weighted += Decimal(sem.sgpa) * sem.total_credits
            rolling = round(weighted / total_credits, 2) if total_credits else Decimal(0)
            cgpa_progress.append({"semester": sem.semester, "cgpa": float(rolling)})

        # Grade distribution
        distribution = {k: 0 for k in GRADE_POINTS.keys()}
        for sem in semesters:
            for subject in sem.subjects.all():
                distribution[subject.grade] = distribution.get(subject.grade, 0) + 1

        # Credit distribution per semester
        credit_distribution = [
            {"semester": sem.semester, "credits": sem.total_credits}
            for sem in semesters
        ]

        # Performance insights
        insights = {}
        if semesters:
            sgpa_values = [(sem.semester, float(sem.sgpa)) for sem in semesters]
            best = max(sgpa_values, key=lambda x: x[1])
            worst = min(sgpa_values, key=lambda x: x[1])
            avg_sgpa = sum(v[1] for v in sgpa_values) / len(sgpa_values)

            # Trend detection
            trend = "stable"
            if len(sgpa_values) >= 3:
                recent = sgpa_values[-3:]
                if all(recent[i][1] < recent[i - 1][1] for i in range(1, len(recent))):
                    trend = "declining"
                elif all(recent[i][1] > recent[i - 1][1] for i in range(1, len(recent))):
                    trend = "improving"

            insights = {
                "best_semester": {"semester": best[0], "sgpa": best[1]},
                "worst_semester": {"semester": worst[0], "sgpa": worst[1]},
                "average_sgpa": round(avg_sgpa, 2),
                "trend": trend,
                "total_backlogs": profile.total_backlogs,
            }

        # Warnings
        warnings = []
        if float(profile.current_cgpa) < 5.0 and profile.total_semesters > 0:
            warnings.append({"type": "low_cgpa", "message": "Your CGPA is below 5.0. Consider seeking academic support."})
        if profile.total_backlogs > 0:
            warnings.append({"type": "backlogs", "message": f"You have {profile.total_backlogs} backlog(s). Clear them to improve your CGPA."})
        if insights.get("trend") == "declining":
            warnings.append({"type": "declining", "message": "Your performance has been declining over the last 3 semesters."})

        return ok({
            "summary": {
                "current_cgpa": float(profile.current_cgpa),
                "total_credits": profile.total_credits_earned,
                "semester_count": profile.total_semesters,
                "highest_sgpa": float(profile.highest_sgpa),
                "lowest_sgpa": float(profile.lowest_sgpa),
                "academic_standing": profile.academic_standing,
                "total_backlogs": profile.total_backlogs,
            },
            "semester_sgpa_series": sem_points,
            "cgpa_progress_series": cgpa_progress,
            "grade_distribution": distribution,
            "credit_distribution": credit_distribution,
            "insights": insights,
            "warnings": warnings,
        })


class CGPAHistoryView(APIView):
    """GET /api/cgpa/history — student's calculation history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = CGPAHistory.objects.filter(user=request.user)[:50]
        return ok(CGPAHistorySerializer(history, many=True).data)


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN VIEWS
# ══════════════════════════════════════════════════════════════════════════════


class AdminCGPAListView(APIView):
    """GET /api/cgpa/admin/records — list all student academic profiles."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        profiles = AcademicProfile.objects.select_related("user").order_by("-updated_at")

        # Filtering
        search = request.query_params.get("search", "").strip()
        branch = request.query_params.get("branch", "").strip()
        standing = request.query_params.get("standing", "").strip()
        min_cgpa = request.query_params.get("min_cgpa")
        max_cgpa = request.query_params.get("max_cgpa")

        if search:
            profiles = profiles.filter(
                models_Q(user__full_name__icontains=search)
                | models_Q(user__email__icontains=search)
                | models_Q(user__student_id__icontains=search)
            )
        if branch:
            profiles = profiles.filter(user__branch__icontains=branch)
        if standing:
            profiles = profiles.filter(academic_standing=standing)
        if min_cgpa:
            profiles = profiles.filter(current_cgpa__gte=min_cgpa)
        if max_cgpa:
            profiles = profiles.filter(current_cgpa__lte=max_cgpa)

        # Pagination
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        total = profiles.count()
        start = (page - 1) * page_size
        end = start + page_size

        data = AcademicProfileSerializer(profiles[start:end], many=True).data

        return ok({
            "results": data,
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        })


class AdminCGPADetailView(APIView):
    """GET /api/cgpa/admin/records/<id> — view a specific student's full academic data."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get_profile(self, pk):
        """Look up by profile ID first, then by user ID."""
        profile = AcademicProfile.objects.filter(pk=pk).first()
        if not profile:
            profile = AcademicProfile.objects.filter(user_id=pk).first()
        return profile

    def get(self, request, user_id):
        profile = self._get_profile(user_id)
        if not profile:
            return err("Academic profile not found.", status.HTTP_404_NOT_FOUND)
        return ok(AcademicProfileSerializer(profile).data)

    def delete(self, request, user_id):
        profile = self._get_profile(user_id)
        if not profile:
            return err("Academic profile not found.", status.HTTP_404_NOT_FOUND)
        profile.semesters.all().delete()
        recalculate_profile(profile)
        return ok(message="Student academic records cleared.")


class AdminCGPAAnalyticsView(APIView):
    """GET /api/cgpa/admin/analytics — institution-wide academic analytics."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models import Avg, Count, Q, F
        from django.contrib.auth import get_user_model

        User = get_user_model()
        profiles = AcademicProfile.objects.select_related("user")

        total_students_with_data = profiles.filter(total_semesters__gt=0).count()
        avg_cgpa = profiles.filter(total_semesters__gt=0).aggregate(avg=Avg("current_cgpa"))["avg"] or 0

        # Standing distribution
        standing_dist = list(
            profiles.filter(total_semesters__gt=0)
            .values("academic_standing")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Branch-wise CGPA
        branch_stats = list(
            profiles.filter(total_semesters__gt=0)
            .values("user__branch")
            .annotate(
                count=Count("id"),
                avg_cgpa=Avg("current_cgpa"),
            )
            .order_by("-avg_cgpa")
        )

        # Top performers
        top_performers = list(
            profiles.filter(total_semesters__gt=0)
            .order_by("-current_cgpa")[:10]
            .values(
                "user__full_name", "user__email", "user__student_id",
                "user__branch", "current_cgpa", "total_semesters",
            )
        )

        # At-risk students
        at_risk = list(
            profiles.filter(academic_standing__in=["at_risk", "critical"])
            .order_by("current_cgpa")[:10]
            .values(
                "user__full_name", "user__email", "user__student_id",
                "user__branch", "current_cgpa", "total_backlogs",
            )
        )

        # CGPA distribution buckets
        cgpa_buckets = {
            "9.0-10.0": profiles.filter(current_cgpa__gte=9, total_semesters__gt=0).count(),
            "8.0-8.99": profiles.filter(current_cgpa__gte=8, current_cgpa__lt=9, total_semesters__gt=0).count(),
            "7.0-7.99": profiles.filter(current_cgpa__gte=7, current_cgpa__lt=8, total_semesters__gt=0).count(),
            "6.0-6.99": profiles.filter(current_cgpa__gte=6, current_cgpa__lt=7, total_semesters__gt=0).count(),
            "5.0-5.99": profiles.filter(current_cgpa__gte=5, current_cgpa__lt=6, total_semesters__gt=0).count(),
            "below_5.0": profiles.filter(current_cgpa__lt=5, total_semesters__gt=0).count(),
        }

        return ok({
            "overview": {
                "total_students_with_data": total_students_with_data,
                "average_cgpa": round(float(avg_cgpa), 2),
                "total_at_risk": profiles.filter(academic_standing__in=["at_risk", "critical"]).count(),
                "total_excellent": profiles.filter(academic_standing="excellent").count(),
            },
            "standing_distribution": standing_dist,
            "branch_stats": branch_stats,
            "cgpa_distribution": cgpa_buckets,
            "top_performers": top_performers,
            "at_risk_students": at_risk,
        })


class AdminCGPAExportView(APIView):
    """GET /api/cgpa/admin/export — export academic data as CSV."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        import csv
        from django.http import HttpResponse

        profiles = AcademicProfile.objects.select_related("user").filter(
            total_semesters__gt=0
        ).order_by("-current_cgpa")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="academic_records.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Student Name", "Email", "Student ID", "Branch",
            "CGPA", "Total Credits", "Semesters", "Backlogs",
            "Academic Standing", "Highest SGPA", "Lowest SGPA",
        ])

        for profile in profiles:
            writer.writerow([
                profile.user.full_name,
                profile.user.email,
                profile.user.student_id or "",
                profile.user.branch or "",
                str(profile.current_cgpa),
                profile.total_credits_earned,
                profile.total_semesters,
                profile.total_backlogs,
                profile.academic_standing,
                str(profile.highest_sgpa),
                str(profile.lowest_sgpa),
            ])

        return response
