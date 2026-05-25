"""
Tests for authentication endpoints.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestSignup:
    url = "/api/auth/signup"

    def test_valid_signup(self, api_client):
        data = {
            "full_name": "New Student",
            "student_id": "2024001",
            "email": "new@test.com",
            "branch": "CSE",
            "semester": 1,
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        # User should be inactive until email verification
        user = User.objects.get(email="new@test.com")
        assert user.is_active is False
        assert user.email_verification_token is not None

    def test_duplicate_email(self, api_client, student_user):
        data = {
            "full_name": "Duplicate",
            "student_id": "9876543",
            "email": student_user.email,
            "branch": "CSE",
            "semester": 1,
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data.get("errors", {})

    def test_duplicate_student_id(self, api_client, student_user):
        data = {
            "full_name": "Duplicate",
            "student_id": student_user.student_id,
            "email": "unique@test.com",
            "branch": "CSE",
            "semester": 1,
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "student_id" in response.data.get("errors", {})

    def test_weak_password(self, api_client):
        data = {
            "full_name": "Weak Pass",
            "student_id": "1111111",
            "email": "weak@test.com",
            "branch": "CSE",
            "semester": 1,
            "password": "123",
            "password_confirm": "123",
        }
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_mismatch(self, api_client):
        data = {
            "full_name": "Mismatch",
            "student_id": "2222222",
            "email": "mismatch@test.com",
            "branch": "CSE",
            "semester": 1,
            "password": "StrongPass123!",
            "password_confirm": "DifferentPass123!",
        }
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_fields(self, api_client):
        response = api_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestLogin:
    url = "/api/auth/login"

    def test_valid_login(self, api_client, student_user):
        data = {"student_id": student_user.student_id, "password": "TestPass123!"}
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "access" in response.data["data"]
        assert "refresh" in response.data["data"]
        assert "user" in response.data["data"]

    def test_invalid_password(self, api_client, student_user):
        data = {"student_id": student_user.student_id, "password": "WrongPass!"}
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["success"] is False

    def test_invalid_student_id(self, api_client):
        data = {"student_id": "0000000", "password": "anything"}
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_inactive_user_login(self, api_client, inactive_user):
        data = {"student_id": inactive_user.student_id, "password": "TestPass123!"}
        response = api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_missing_fields(self, api_client):
        response = api_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestLogout:
    url = "/api/auth/logout"

    def test_valid_logout(self, student_client, student_user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(student_user)
        response = student_client.post(self.url, {"refresh": str(refresh)}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True

    def test_logout_without_token(self, student_client):
        response = student_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_logout(self, api_client):
        response = api_client.post(self.url, {"refresh": "fake"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestChangePassword:
    url = "/api/auth/change-password"

    def test_valid_change(self, student_client, student_user):
        data = {
            "old_password": "TestPass123!",
            "new_password": "NewStrongPass456!",
            "new_password_confirm": "NewStrongPass456!",
        }
        response = student_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        student_user.refresh_from_db()
        assert student_user.check_password("NewStrongPass456!")

    def test_wrong_old_password(self, student_client):
        data = {
            "old_password": "WrongOldPass!",
            "new_password": "NewStrongPass456!",
            "new_password_confirm": "NewStrongPass456!",
        }
        response = student_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated(self, api_client):
        response = api_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestMe:
    url = "/api/auth/me"

    def test_authenticated(self, student_client, student_user):
        response = student_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["email"] == student_user.email

    def test_unauthenticated(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
