from django.db.models import Avg, Count, Q
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from campushub.permissions import IsAdmin
from .models import Company, PlacementApplication
from .serializers import (
    CompanySerializer,
    InterviewRoundSerializer,
    PlacementApplicationCreateSerializer,
    PlacementApplicationSerializer,
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


class CompanyListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CompanySerializer
    queryset = Company.objects.filter(is_active=True)
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "industry"]
    ordering = ["name"]


class CompanyCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Any authenticated user can suggest a company for their placement tracking
        serializer = CompanySerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        company = serializer.save()
        return ok(CompanySerializer(company).data, "Company created.", status.HTTP_201_CREATED)


class ApplicationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlacementApplicationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "company"]
    ordering_fields = ["created_at", "deadline", "package_lpa", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return PlacementApplication.objects.filter(student=self.request.user).select_related("company").prefetch_related("rounds")


class ApplicationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PlacementApplicationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        application = serializer.save(student=request.user)
        return ok(PlacementApplicationSerializer(application).data, "Application created.", status.HTTP_201_CREATED)


class ApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        return PlacementApplication.objects.filter(pk=pk, student=user).select_related("company").prefetch_related("rounds").first()

    def get(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        return ok(PlacementApplicationSerializer(app).data)

    def put(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        serializer = PlacementApplicationCreateSerializer(app, data=request.data, partial=True)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        serializer.save()
        app.refresh_from_db()
        return ok(PlacementApplicationSerializer(app).data, "Application updated.")

    def delete(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        app.delete()
        return ok(message="Application deleted.")


class RoundCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        application = PlacementApplication.objects.filter(pk=pk, student=request.user).first()
        if not application:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        serializer = InterviewRoundSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        round_ = serializer.save(application=application)
        application.status = "interview"
        application.save(update_fields=["status"])
        return ok(InterviewRoundSerializer(round_).data, "Interview round added.", status.HTTP_201_CREATED)


class PlacementKanbanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = PlacementApplication.objects.filter(student=request.user).select_related("company").prefetch_related("rounds")
        serializer = PlacementApplicationSerializer(queryset, many=True)
        columns = {}
        for app in serializer.data:
            columns.setdefault(app["status"], []).append(app)
        return ok({"columns": columns, "all_statuses": [k for k, _ in PlacementApplication.STATUS_CHOICES]})


class PlacementStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = PlacementApplication.objects.filter(student=request.user)
        by_status = dict(qs.values_list("status").annotate(count=Count("id")))
        offer_rate = 0
        total = qs.count()
        if total:
            offers = qs.filter(status__in=["offer", "accepted"]).count()
            offer_rate = round((offers / total) * 100, 2)
        average_package = qs.filter(status__in=["offer", "accepted"], package_lpa__isnull=False).aggregate(avg=Avg("package_lpa"))["avg"] or 0
        deadline_count = qs.filter(status__in=["applied", "shortlisted", "interview"], deadline__isnull=False).count()
        return ok(
            {
                "total_applications": total,
                "by_status": by_status,
                "offer_rate": offer_rate,
                "average_package_lpa": float(average_package),
                "active_deadline_count": deadline_count,
            }
        )


class AdminCompanyListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = CompanySerializer
    queryset = Company.objects.all().order_by("name")
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "industry"]
    ordering = ["name"]


class AdminCompanyDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def put(self, request, pk):
        company = Company.objects.filter(pk=pk).first()
        if not company:
            return err("Company not found.", status.HTTP_404_NOT_FOUND)
        serializer = CompanySerializer(company, data=request.data, partial=True)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        serializer.save()
        return ok(CompanySerializer(company).data, "Company updated.")

    def delete(self, request, pk):
        company = Company.objects.filter(pk=pk).first()
        if not company:
            return err("Company not found.", status.HTTP_404_NOT_FOUND)
        company.is_active = False
        company.save(update_fields=["is_active"])
        return ok(message="Company archived.")


class AdminPlacementAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = PlacementApplication.objects.all()
        total = qs.count()
        by_status_rows = qs.values("status").annotate(count=Count("id")).order_by("status")
        by_status = {row["status"]: row["count"] for row in by_status_rows}
        offer_count = qs.filter(status__in=["offer", "accepted"]).count()
        rejected_count = qs.filter(status="rejected").count()
        accepted_count = qs.filter(status="accepted").count()
        avg_package = qs.filter(status__in=["offer", "accepted"], package_lpa__isnull=False).aggregate(avg=Avg("package_lpa"))["avg"] or 0
        top_companies_rows = (
            qs.values("company__name")
            .annotate(total=Count("id"), offers=Count("id", filter=Q(status__in=["offer", "accepted"])))
            .order_by("-total", "-offers")[:10]
        )
        top_companies = [
            {"company": row["company__name"], "applications": row["total"], "offers": row["offers"]}
            for row in top_companies_rows
        ]
        return ok(
            {
                "total_applications": total,
                "offer_count": offer_count,
                "accepted_count": accepted_count,
                "rejected_count": rejected_count,
                "average_package_lpa": float(avg_package),
                "by_status": by_status,
                "top_companies": top_companies,
            }
        )
