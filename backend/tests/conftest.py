"""
Pytest configuration for CampusHub backend tests.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()


@pytest.fixture
def student_user(db):
    """Create and return an active student user."""
    user = User.objects.create_user(
        email="student@test.com",
        password="TestPass123!",
        full_name="Test Student",
        student_id="1234567",
        branch="CSE",
        semester=4,
        section="A",
        role="student",
        is_active=True,
        email_verified=True,
    )
    return user


@pytest.fixture
def admin_user(db):
    """Create and return an active admin user."""
    user = User.objects.create_superuser(
        email="admin@test.com",
        password="AdminPass123!",
        full_name="Test Admin",
        student_id="0000001",
        role="admin",
    )
    return user


@pytest.fixture
def inactive_user(db):
    """Create and return an inactive user."""
    user = User.objects.create_user(
        email="inactive@test.com",
        password="TestPass123!",
        full_name="Inactive User",
        student_id="9999999",
        branch="ECE",
        semester=2,
        role="student",
        is_active=False,
        email_verified=False,
    )
    return user


@pytest.fixture
def student_client(student_user):
    """Authenticated API client for a student."""
    client = APIClient()
    refresh = RefreshToken.for_user(student_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def admin_client(admin_user):
    """Authenticated API client for an admin."""
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client
