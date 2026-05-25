"""
Tests for permission enforcement across endpoints.
"""
import pytest
from rest_framework import status

pytestmark = pytest.mark.django_db


class TestAdminEndpointProtection:
    """Verify that admin-only endpoints reject student access."""

    admin_endpoints = [
        "/api/admin/dashboard",
        "/api/admin/students",
        "/api/admin/resources",
        "/api/admin/news",
        "/api/admin/questions",
        "/api/admin/executions",
        "/api/admin/analytics",
        "/api/admin/logs",
        "/api/admin/login-logs",
        "/api/admin/activity-logs",
        "/api/admin/activity-stats",
        "/api/admin/system/health",
    ]

    def test_unauthenticated_access_denied(self, api_client):
        for endpoint in self.admin_endpoints:
            response = api_client.get(endpoint)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, (
                f"Expected 401 for {endpoint}, got {response.status_code}"
            )

    def test_student_access_denied(self, student_client):
        for endpoint in self.admin_endpoints:
            response = student_client.get(endpoint)
            assert response.status_code == status.HTTP_403_FORBIDDEN, (
                f"Expected 403 for {endpoint}, got {response.status_code}"
            )

    def test_admin_access_granted(self, admin_client):
        for endpoint in self.admin_endpoints:
            response = admin_client.get(endpoint)
            assert response.status_code in (
                status.HTTP_200_OK,
                status.HTTP_404_NOT_FOUND,  # Some may need params
            ), f"Expected 200/404 for {endpoint}, got {response.status_code}"


class TestStudentEndpointProtection:
    """Verify that student endpoints require authentication."""

    student_endpoints = [
        "/api/profile/",
        "/api/notifications/",
        "/api/questions/",
        "/api/cgpa/",
        "/api/attendance/",
        "/api/groups/",
        "/api/placement/companies",
    ]

    def test_unauthenticated_access_denied(self, api_client):
        for endpoint in self.student_endpoints:
            response = api_client.get(endpoint)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED, (
                f"Expected 401 for {endpoint}, got {response.status_code}"
            )

    def test_student_access_granted(self, student_client):
        for endpoint in self.student_endpoints:
            response = student_client.get(endpoint)
            assert response.status_code == status.HTTP_200_OK, (
                f"Expected 200 for {endpoint}, got {response.status_code}"
            )


class TestQuestionCreatePermission:
    """Only admins can create coding questions."""

    url = "/api/questions/create"

    def test_student_cannot_create(self, student_client):
        data = {
            "title": "Test Question",
            "description": "Test",
            "topic": "arrays",
            "difficulty": "easy",
            "hidden_test_cases": [],
        }
        response = student_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_create(self, admin_client):
        data = {
            "title": "Test Question",
            "description": "Test description",
            "topic": "arrays",
            "difficulty": "easy",
            "hidden_test_cases": [{"input": "1 2 3", "expected_output": "6"}],
        }
        response = admin_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
