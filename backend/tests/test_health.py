"""
Tests for the health check endpoint.
"""
import pytest
from rest_framework import status

pytestmark = pytest.mark.django_db


class TestHealthCheck:
    def test_health_endpoint_with_slash(self, api_client):
        response = api_client.get("/api/health/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["service"] == "campushub-backend"
        assert "checks" in data
        assert "database" in data["checks"]
        assert "cache" in data["checks"]

    def test_health_endpoint_without_slash(self, api_client):
        response = api_client.get("/api/health")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["service"] == "campushub-backend"

    def test_health_no_auth_required(self, api_client):
        """Health check should work without authentication."""
        response = api_client.get("/api/health/")
        assert response.status_code == status.HTTP_200_OK
