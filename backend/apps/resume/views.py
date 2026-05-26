"""
Resume Builder views.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ResumeProfile, ResumeTemplate
from .serializers import (
    ResumeProfileSerializer, ResumeProfileCreateSerializer,
    ResumeTemplateSerializer,
)
from campushub.permissions import IsAdmin


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class ResumeTemplateListView(APIView):
    """GET /api/resume/templates"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = ResumeTemplate.objects.filter(is_active=True)
        data = ResumeTemplateSerializer(templates, many=True, context={"request": request}).data
        return ok(data)


class ResumeListCreateView(APIView):
    """GET/POST /api/resume/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resumes = ResumeProfile.objects.filter(student=request.user)
        data = ResumeProfileSerializer(resumes, many=True).data
        return ok(data)

    def post(self, request):
        s = ResumeProfileCreateSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        resume = s.save(student=request.user)
        resume.calculate_completion()
        resume.save(update_fields=["completion_score"])
        return ok(ResumeProfileSerializer(resume).data, "Resume created.", 201)


class ResumeDetailView(APIView):
    """GET/PUT/DELETE /api/resume/<uuid:pk>"""
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk):
        try:
            return ResumeProfile.objects.get(pk=pk, student=request.user)
        except ResumeProfile.DoesNotExist:
            return None

    def get(self, request, pk):
        resume = self._get(request, pk)
        if not resume:
            return err("Resume not found.", 404)
        return ok(ResumeProfileSerializer(resume).data)

    def put(self, request, pk):
        resume = self._get(request, pk)
        if not resume:
            return err("Resume not found.", 404)
        s = ResumeProfileCreateSerializer(resume, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        resume = s.save()
        resume.calculate_completion()
        resume.save(update_fields=["completion_score"])
        return ok(ResumeProfileSerializer(resume).data, "Resume updated.")

    def delete(self, request, pk):
        resume = self._get(request, pk)
        if not resume:
            return err("Resume not found.", 404)
        resume.delete()
        return ok(message="Resume deleted.")


class ResumeExportView(APIView):
    """POST /api/resume/<uuid:pk>/export — Generate PDF resume."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.http import HttpResponse
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from io import BytesIO

        try:
            resume = ResumeProfile.objects.get(pk=pk, student=request.user)
        except ResumeProfile.DoesNotExist:
            return err("Resume not found.", 404)

        # Generate PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            rightMargin=1.5 * cm, leftMargin=1.5 * cm,
            topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        )

        styles = getSampleStyleSheet()
        elements = []

        # Custom styles
        name_style = ParagraphStyle(
            "NameStyle", parent=styles["Heading1"],
            fontSize=20, spaceAfter=4, textColor=HexColor("#1e1b4b"),
        )
        section_style = ParagraphStyle(
            "SectionStyle", parent=styles["Heading2"],
            fontSize=12, spaceAfter=6, spaceBefore=12,
            textColor=HexColor("#4f46e5"), borderWidth=0,
        )
        body_style = ParagraphStyle(
            "BodyStyle", parent=styles["Normal"],
            fontSize=10, spaceAfter=4, leading=14,
        )
        small_style = ParagraphStyle(
            "SmallStyle", parent=styles["Normal"],
            fontSize=9, textColor=HexColor("#6b7280"),
        )

        # Header
        elements.append(Paragraph(resume.full_name, name_style))
        contact_parts = []
        if resume.email:
            contact_parts.append(resume.email)
        if resume.phone:
            contact_parts.append(resume.phone)
        if resume.linkedin_url:
            contact_parts.append(f"LinkedIn: {resume.linkedin_url}")
        if resume.github_url:
            contact_parts.append(f"GitHub: {resume.github_url}")
        if contact_parts:
            elements.append(Paragraph(" | ".join(contact_parts), small_style))
        elements.append(Spacer(1, 12))

        # Summary
        if resume.summary:
            elements.append(Paragraph("PROFESSIONAL SUMMARY", section_style))
            elements.append(Paragraph(resume.summary, body_style))

        # Education
        if resume.education:
            elements.append(Paragraph("EDUCATION", section_style))
            for edu in resume.education:
                if isinstance(edu, dict):
                    elements.append(Paragraph(
                        f"<b>{edu.get('degree', '')}</b> — {edu.get('institution', '')}",
                        body_style,
                    ))
                    if edu.get("year"):
                        elements.append(Paragraph(f"Year: {edu['year']}", small_style))
                else:
                    elements.append(Paragraph(str(edu), body_style))

        # Skills
        if resume.skills:
            elements.append(Paragraph("SKILLS", section_style))
            skills_text = ", ".join(resume.skills) if isinstance(resume.skills, list) else str(resume.skills)
            elements.append(Paragraph(skills_text, body_style))

        # Projects
        if resume.projects:
            elements.append(Paragraph("PROJECTS", section_style))
            for proj in resume.projects:
                if isinstance(proj, dict):
                    elements.append(Paragraph(f"<b>{proj.get('name', '')}</b>", body_style))
                    if proj.get("description"):
                        elements.append(Paragraph(proj["description"], small_style))
                    if proj.get("technologies"):
                        elements.append(Paragraph(f"Tech: {proj['technologies']}", small_style))
                else:
                    elements.append(Paragraph(str(proj), body_style))

        # Internships
        if resume.internships:
            elements.append(Paragraph("EXPERIENCE / INTERNSHIPS", section_style))
            for intern in resume.internships:
                if isinstance(intern, dict):
                    elements.append(Paragraph(
                        f"<b>{intern.get('role', '')}</b> at {intern.get('company', '')}",
                        body_style,
                    ))
                    if intern.get("duration"):
                        elements.append(Paragraph(f"Duration: {intern['duration']}", small_style))
                    if intern.get("description"):
                        elements.append(Paragraph(intern["description"], small_style))
                else:
                    elements.append(Paragraph(str(intern), body_style))

        # Certifications
        if resume.certifications:
            elements.append(Paragraph("CERTIFICATIONS", section_style))
            for cert in resume.certifications:
                if isinstance(cert, dict):
                    elements.append(Paragraph(f"• {cert.get('name', '')}", body_style))
                else:
                    elements.append(Paragraph(f"• {cert}", body_style))

        # Achievements
        if resume.achievements:
            elements.append(Paragraph("ACHIEVEMENTS", section_style))
            for ach in resume.achievements:
                elements.append(Paragraph(f"• {ach}", body_style))

        doc.build(elements)
        buffer.seek(0)

        # Update export timestamp
        resume.last_exported_at = timezone.now()
        resume.save(update_fields=["last_exported_at"])

        # Log activity
        try:
            from apps.profiles.models import ActivityLog
            ActivityLog.objects.create(
                user=request.user,
                activity_type="resume_export",
                description=f"Exported resume: {resume.title}",
            )
        except Exception:
            pass

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{resume.full_name}_Resume.pdf"'
        return response


class AdminResumeTemplateListCreateView(APIView):
    """GET/POST /api/admin/resume/templates"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        templates = ResumeTemplate.objects.all()
        data = ResumeTemplateSerializer(templates, many=True, context={"request": request}).data
        return ok(data)

    def post(self, request):
        from rest_framework import serializers as drf_s

        class TemplateCreateSerializer(drf_s.ModelSerializer):
            class Meta:
                model = ResumeTemplate
                fields = "__all__"

        serializer = TemplateCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        template = serializer.save()
        return ok(ResumeTemplateSerializer(template, context={"request": request}).data, "Template created.", 201)


class AdminResumeTemplateDetailView(APIView):
    """PUT/DELETE /api/admin/resume/templates/<uuid:pk>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def put(self, request, pk):
        try:
            template = ResumeTemplate.objects.get(pk=pk)
        except ResumeTemplate.DoesNotExist:
            return err("Template not found.", 404)
        for field in ["name", "description", "template_html", "is_active", "is_default"]:
            if field in request.data:
                setattr(template, field, request.data[field])
        template.save()
        return ok(ResumeTemplateSerializer(template, context={"request": request}).data, "Updated.")

    def delete(self, request, pk):
        try:
            template = ResumeTemplate.objects.get(pk=pk)
        except ResumeTemplate.DoesNotExist:
            return err("Template not found.", 404)
        template.is_active = False
        template.save(update_fields=["is_active"])
        return ok(message="Template deleted.")
