import csv
import logging
from io import StringIO

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum, F
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from campushub.permissions import IsAdmin
from .models import SubjectAttendance, AttendanceHistory
from .serializers import (
    SubjectAttendanceSerializer,
    AttendanceHistorySerializer,
    AdminAttendanceRecordSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _log_history(student, subject, action, old_total=0, old_attended=0):
    """Create an attendance history entry."""
    new_total = subject.total_classes if subject else 0
    new_attended = subject.attended_classes if subject else 0
    old_pct = round((old_attended / old_total) * 100, 2) if old_total > 0 else 0
    new_pct = subject.attendance_percentage if subject else 0

    AttendanceHistory.objects.create(
        student=student,
        subject=subject if action != "deleted" else None,
        subject_name=subject.subject_name if subject else "",
        subject_code=subject.subject_code if subject else "",
        semester=subject.semester if subject else 0,
        action=action,
        old_total=old_total,
        old_attended=old_attended,
        new_total=new_total,
        new_attended=new_attended,
        old_percentage=old_pct,
        new_percentage=new_pct,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# STUDENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class AttendanceListView(generics.ListAPIView):
    """GET /api/attendance/ — all subjects for current user."""
    permission_classes = [IsAuthenticated]
    serializer_class   = SubjectAttendanceSerializer

    def get_queryset(self):
        qs = SubjectAttendance.objects.filter(student=self.request.user)
        semester = self.request.query_params.get("semester")
        if semester:
            qs = qs.filter(semester=semester)
        return qs


class AttendanceCreateView(APIView):
    """POST /api/attendance/ — add a subject."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = SubjectAttendanceSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        record = s.save(student=request.user)
        _log_history(request.user, record, "created")
        return Response({"success": True, "data": SubjectAttendanceSerializer(record).data}, status=201)


class AttendanceDetailView(APIView):
    """PUT/DELETE /api/attendance/<id>/ — update or delete a subject."""
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            return SubjectAttendance.objects.get(pk=pk, student=user)
        except SubjectAttendance.DoesNotExist:
            return None

    def put(self, request, pk):
        record = self._get(pk, request.user)
        if not record:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        old_total = record.total_classes
        old_attended = record.attended_classes
        s = SubjectAttendanceSerializer(record, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        _log_history(request.user, record, "updated", old_total, old_attended)
        return Response({"success": True, "data": SubjectAttendanceSerializer(record).data})

    def delete(self, request, pk):
        record = self._get(pk, request.user)
        if not record:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        _log_history(request.user, record, "deleted", record.total_classes, record.attended_classes)
        record.delete()
        return Response({"success": True, "message": "Deleted."})


class AttendanceSummaryView(APIView):
    """GET /api/attendance/summary/ — overall stats."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        semester = request.query_params.get("semester")
        qs = SubjectAttendance.objects.filter(student=request.user)
        if semester:
            qs = qs.filter(semester=semester)

        subjects = list(qs)
        total    = len(subjects)
        shortage = sum(1 for s in subjects if s.is_shortage)
        avg_pct  = round(sum(s.attendance_percentage for s in subjects) / total, 2) if total else 0

        return Response({
            "success": True,
            "data": {
                "total_subjects": total,
                "shortage_subjects": shortage,
                "average_attendance": avg_pct,
                "total_attended": sum(s.attended_classes for s in subjects),
                "total_missed": sum(s.missed_classes for s in subjects),
                "subjects": SubjectAttendanceSerializer(subjects, many=True).data,
            },
        })


class AttendanceMarkView(APIView):
    """POST /api/attendance/<id>/mark — mark one class as attended/missed."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        attended = request.data.get("attended")
        if attended not in [True, False]:
            return Response({"success": False, "error": {"message": "attended must be true/false."}}, status=400)
        record = SubjectAttendance.objects.filter(pk=pk, student=request.user).first()
        if not record:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        old_total = record.total_classes
        old_attended = record.attended_classes
        record.total_classes += 1
        if attended:
            record.attended_classes += 1
        record.save(update_fields=["total_classes", "attended_classes", "updated_at"])
        action = "marked_present" if attended else "marked_absent"
        _log_history(request.user, record, action, old_total, old_attended)
        return Response({"success": True, "data": SubjectAttendanceSerializer(record).data, "message": "Attendance marked."})


class AttendanceOverviewView(APIView):
    """GET /api/attendance/overview — semester overview for charts/analytics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        semester = request.query_params.get("semester")
        qs = SubjectAttendance.objects.filter(student=request.user)
        if semester:
            qs = qs.filter(semester=semester)
        subjects = list(qs.order_by("subject_name"))

        by_subject = [
            {
                "id": str(s.id),
                "subject_name": s.subject_name,
                "subject_code": s.subject_code,
                "semester": s.semester,
                "attendance_percentage": s.attendance_percentage,
                "required_percentage": float(s.required_percentage),
                "attended_classes": s.attended_classes,
                "missed_classes": s.missed_classes,
                "classes_needed": s.classes_needed,
                "classes_needed_75": s.classes_needed_75,
                "classes_needed_80": s.classes_needed_80,
                "classes_can_miss": s.classes_can_miss,
                "is_shortage": s.is_shortage,
            }
            for s in subjects
        ]
        semester_distribution = {}
        for s in subjects:
            key = str(s.semester)
            semester_distribution.setdefault(key, {"semester": s.semester, "subject_count": 0, "average_attendance": 0, "shortage_count": 0})
            semester_distribution[key]["subject_count"] += 1
            semester_distribution[key]["average_attendance"] += s.attendance_percentage
            if s.is_shortage:
                semester_distribution[key]["shortage_count"] += 1
        semester_series = []
        for key in sorted(semester_distribution.keys(), key=lambda x: int(x)):
            item = semester_distribution[key]
            item["average_attendance"] = round(item["average_attendance"] / item["subject_count"], 2) if item["subject_count"] else 0
            semester_series.append(item)

        return Response({
            "success": True,
            "data": {
                "summary": {
                    "total_subjects": len(subjects),
                    "average_attendance": round(sum(s.attendance_percentage for s in subjects) / len(subjects), 2) if subjects else 0,
                    "shortage_subjects": sum(1 for s in subjects if s.is_shortage),
                    "total_attended": sum(s.attended_classes for s in subjects),
                    "total_missed": sum(s.missed_classes for s in subjects),
                },
                "by_subject": by_subject,
                "semester_series": semester_series,
            },
        })


class AttendancePredictionView(APIView):
    """POST /api/attendance/<id>/predict — predict future attendance scenarios."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        record = SubjectAttendance.objects.filter(pk=pk, student=request.user).first()
        if not record:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)

        future_classes = request.data.get("future_classes", 5)
        try:
            future_classes = int(future_classes)
            if future_classes < 1 or future_classes > 200:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"success": False, "error": {"message": "future_classes must be 1-200."}}, status=400)

        return Response({
            "success": True,
            "data": {
                "subject_name": record.subject_name,
                "current_percentage": record.attendance_percentage,
                "current_total": record.total_classes,
                "current_attended": record.attended_classes,
                "future_classes": future_classes,
                "projected_if_attend_all": record.projected_attendance(future_classes, attend_all=True),
                "projected_if_miss_all": record.projected_attendance(future_classes, attend_all=False),
                "classes_needed_75": record.classes_needed_75,
                "classes_needed_80": record.classes_needed_80,
                "classes_can_miss": record.classes_can_miss,
                "is_shortage": record.is_shortage,
            },
        })


class AttendanceHistoryView(APIView):
    """GET /api/attendance/history — attendance change history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AttendanceHistory.objects.filter(student=request.user)
        subject_id = request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        limit = min(int(request.query_params.get("limit", 50)), 200)
        history = qs[:limit]
        return Response({
            "success": True,
            "data": AttendanceHistorySerializer(history, many=True).data,
        })


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class AdminAttendanceDashboardView(APIView):
    """GET /api/admin/attendance/dashboard — admin attendance overview."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        all_records = SubjectAttendance.objects.select_related("student").all()
        total_records = all_records.count()

        # Students with attendance data
        students_with_data = all_records.values("student").distinct().count()
        total_students = User.objects.filter(role="student", is_active=True).count()

        # Calculate averages
        all_subjects = list(all_records)
        avg_attendance = round(
            sum(s.attendance_percentage for s in all_subjects) / total_records, 2
        ) if total_records > 0 else 0

        # Shortage analysis
        shortage_records = [s for s in all_subjects if s.is_shortage]
        shortage_count = len(shortage_records)

        # Critical students (avg < 60%)
        student_avgs = {}
        for record in all_subjects:
            sid = str(record.student_id)
            student_avgs.setdefault(sid, {"total_pct": 0, "count": 0, "student": record.student})
            student_avgs[sid]["total_pct"] += record.attendance_percentage
            student_avgs[sid]["count"] += 1

        low_attendance_students = []
        critical_students = []
        for sid, data in student_avgs.items():
            avg = data["total_pct"] / data["count"] if data["count"] > 0 else 0
            student = data["student"]
            entry = {
                "id": str(student.id),
                "name": student.full_name,
                "email": student.email,
                "student_id": student.student_id or "",
                "branch": student.branch or "",
                "average_attendance": round(avg, 2),
                "subjects_count": data["count"],
            }
            if avg < 75:
                low_attendance_students.append(entry)
            if avg < 60:
                critical_students.append(entry)

        low_attendance_students.sort(key=lambda x: x["average_attendance"])
        critical_students.sort(key=lambda x: x["average_attendance"])

        # Branch-wise stats
        branch_stats = {}
        for record in all_subjects:
            branch = record.student.branch or "Unknown"
            branch_stats.setdefault(branch, {"branch": branch, "total_pct": 0, "count": 0, "shortage": 0, "students": set()})
            branch_stats[branch]["total_pct"] += record.attendance_percentage
            branch_stats[branch]["count"] += 1
            branch_stats[branch]["students"].add(str(record.student_id))
            if record.is_shortage:
                branch_stats[branch]["shortage"] += 1

        branch_series = []
        for data in sorted(branch_stats.values(), key=lambda x: x["branch"]):
            branch_series.append({
                "branch": data["branch"],
                "students": len(data["students"]),
                "subjects": data["count"],
                "average_attendance": round(data["total_pct"] / data["count"], 2) if data["count"] > 0 else 0,
                "shortage_count": data["shortage"],
            })

        # Semester-wise stats
        semester_stats = {}
        for record in all_subjects:
            sem = record.semester
            semester_stats.setdefault(sem, {"semester": sem, "total_pct": 0, "count": 0, "shortage": 0, "students": set()})
            semester_stats[sem]["total_pct"] += record.attendance_percentage
            semester_stats[sem]["count"] += 1
            semester_stats[sem]["students"].add(str(record.student_id))
            if record.is_shortage:
                semester_stats[sem]["shortage"] += 1

        semester_series = []
        for sem in sorted(semester_stats.keys()):
            data = semester_stats[sem]
            semester_series.append({
                "semester": sem,
                "students": len(data["students"]),
                "subjects": data["count"],
                "average_attendance": round(data["total_pct"] / data["count"], 2) if data["count"] > 0 else 0,
                "shortage_count": data["shortage"],
            })

        # Subject-wise analytics (top subjects by shortage)
        subject_stats = {}
        for record in all_subjects:
            key = f"{record.subject_name}|{record.semester}"
            subject_stats.setdefault(key, {
                "subject_name": record.subject_name,
                "subject_code": record.subject_code,
                "semester": record.semester,
                "total_pct": 0, "count": 0, "shortage": 0,
            })
            subject_stats[key]["total_pct"] += record.attendance_percentage
            subject_stats[key]["count"] += 1
            if record.is_shortage:
                subject_stats[key]["shortage"] += 1

        subject_series = []
        for data in subject_stats.values():
            subject_series.append({
                "subject_name": data["subject_name"],
                "subject_code": data["subject_code"],
                "semester": data["semester"],
                "students": data["count"],
                "average_attendance": round(data["total_pct"] / data["count"], 2) if data["count"] > 0 else 0,
                "shortage_count": data["shortage"],
            })
        subject_series.sort(key=lambda x: x["average_attendance"])

        return Response({
            "success": True,
            "data": {
                "overview": {
                    "total_students": total_students,
                    "students_with_data": students_with_data,
                    "total_subjects_tracked": total_records,
                    "average_attendance": avg_attendance,
                    "shortage_count": shortage_count,
                    "low_attendance_count": len(low_attendance_students),
                    "critical_count": len(critical_students),
                },
                "low_attendance_students": low_attendance_students[:20],
                "critical_students": critical_students[:20],
                "branch_stats": branch_series,
                "semester_stats": semester_series,
                "subject_stats": subject_series[:30],
            },
        })


class AdminAttendanceStudentListView(APIView):
    """GET /api/admin/attendance/students — list all students with attendance data."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        branch = request.query_params.get("branch", "").strip()
        semester = request.query_params.get("semester", "").strip()
        status_filter = request.query_params.get("status", "").strip()  # low, critical, ok
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))

        # Get all students with attendance records
        student_ids = SubjectAttendance.objects.values_list("student_id", flat=True).distinct()
        students_qs = User.objects.filter(id__in=student_ids, role="student")

        if search:
            students_qs = students_qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(student_id__icontains=search)
            )
        if branch:
            students_qs = students_qs.filter(branch__icontains=branch)

        students = list(students_qs.order_by("full_name"))

        # Build student data with attendance stats
        results = []
        for student in students:
            records = SubjectAttendance.objects.filter(student=student)
            if semester:
                records = records.filter(semester=semester)
            records_list = list(records)
            if not records_list:
                continue

            avg_pct = round(sum(r.attendance_percentage for r in records_list) / len(records_list), 2)
            shortage = sum(1 for r in records_list if r.is_shortage)

            # Status classification
            if avg_pct < 60:
                student_status = "critical"
            elif avg_pct < 75:
                student_status = "low"
            else:
                student_status = "ok"

            if status_filter and student_status != status_filter:
                continue

            results.append({
                "id": str(student.id),
                "name": student.full_name,
                "email": student.email,
                "student_id": student.student_id or "",
                "branch": student.branch or "",
                "semester": student.semester,
                "subjects_count": len(records_list),
                "average_attendance": avg_pct,
                "shortage_count": shortage,
                "status": student_status,
                "total_attended": sum(r.attended_classes for r in records_list),
                "total_missed": sum(r.missed_classes for r in records_list),
            })

        # Sort by average attendance ascending (worst first)
        results.sort(key=lambda x: x["average_attendance"])

        # Paginate
        total = len(results)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = results[start:end]

        return Response({
            "success": True,
            "data": {
                "results": paginated,
                "count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            },
        })


class AdminAttendanceStudentDetailView(APIView):
    """GET /api/admin/attendance/students/<id> — detailed attendance for one student."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            student = User.objects.get(pk=pk, role="student")
        except User.DoesNotExist:
            return Response({"success": False, "error": {"message": "Student not found."}}, status=404)

        semester = request.query_params.get("semester")
        records = SubjectAttendance.objects.filter(student=student)
        if semester:
            records = records.filter(semester=semester)
        records_list = list(records.order_by("semester", "subject_name"))

        subjects_data = []
        for r in records_list:
            subjects_data.append({
                "id": str(r.id),
                "subject_name": r.subject_name,
                "subject_code": r.subject_code,
                "semester": r.semester,
                "total_classes": r.total_classes,
                "attended_classes": r.attended_classes,
                "missed_classes": r.missed_classes,
                "attendance_percentage": r.attendance_percentage,
                "required_percentage": float(r.required_percentage),
                "is_shortage": r.is_shortage,
                "classes_needed": r.classes_needed,
                "classes_needed_75": r.classes_needed_75,
                "classes_needed_80": r.classes_needed_80,
                "classes_can_miss": r.classes_can_miss,
            })

        avg_pct = round(sum(r.attendance_percentage for r in records_list) / len(records_list), 2) if records_list else 0
        shortage = sum(1 for r in records_list if r.is_shortage)

        # Semester breakdown
        semester_map = {}
        for r in records_list:
            sem = r.semester
            semester_map.setdefault(sem, {"semester": sem, "subjects": 0, "total_pct": 0, "shortage": 0})
            semester_map[sem]["subjects"] += 1
            semester_map[sem]["total_pct"] += r.attendance_percentage
            if r.is_shortage:
                semester_map[sem]["shortage"] += 1

        semesters = []
        for sem in sorted(semester_map.keys()):
            data = semester_map[sem]
            semesters.append({
                "semester": sem,
                "subjects": data["subjects"],
                "average_attendance": round(data["total_pct"] / data["subjects"], 2),
                "shortage_count": data["shortage"],
            })

        # Recent history
        history = AttendanceHistory.objects.filter(student=student)[:20]

        return Response({
            "success": True,
            "data": {
                "student": {
                    "id": str(student.id),
                    "name": student.full_name,
                    "email": student.email,
                    "student_id": student.student_id or "",
                    "branch": student.branch or "",
                    "semester": student.semester,
                },
                "summary": {
                    "total_subjects": len(records_list),
                    "average_attendance": avg_pct,
                    "shortage_count": shortage,
                    "total_attended": sum(r.attended_classes for r in records_list),
                    "total_missed": sum(r.missed_classes for r in records_list),
                },
                "subjects": subjects_data,
                "semesters": semesters,
                "history": AttendanceHistorySerializer(history, many=True).data,
            },
        })


class AdminAttendanceExportView(APIView):
    """GET /api/admin/attendance/export — export attendance data as CSV."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        records = SubjectAttendance.objects.select_related("student").all().order_by(
            "student__full_name", "semester", "subject_name"
        )

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Student Name", "Student ID", "Email", "Branch", "Semester",
            "Subject Name", "Subject Code", "Total Classes", "Attended Classes",
            "Missed Classes", "Attendance %", "Required %", "Shortage",
            "Classes Needed (75%)", "Classes Needed (80%)", "Can Miss",
        ])

        for r in records:
            writer.writerow([
                r.student.full_name,
                r.student.student_id or "",
                r.student.email,
                r.student.branch or "",
                r.semester,
                r.subject_name,
                r.subject_code,
                r.total_classes,
                r.attended_classes,
                r.missed_classes,
                r.attendance_percentage,
                float(r.required_percentage),
                "Yes" if r.is_shortage else "No",
                r.classes_needed_75,
                r.classes_needed_80,
                r.classes_can_miss,
            ])

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="attendance_report.csv"'
        return response
