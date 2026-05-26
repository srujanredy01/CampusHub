import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "super_admin")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("admin", "Admin"),
        ("faculty", "Faculty"),
        ("student", "Student"),
        ("moderator", "Moderator"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    student_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, default="")
    branch = models.CharField(max_length=100, blank=True, default="")
    semester = models.PositiveSmallIntegerField(default=1)
    section = models.CharField(max_length=10, blank=True, default="")
    batch = models.CharField(max_length=20, blank=True, default="")
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default="student")

    # Security
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_at = models.DateTimeField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=255, blank=True, null=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    password_reset_token = models.CharField(max_length=255, blank=True, null=True)
    password_reset_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["student_id"]),
            models.Index(fields=["role"]),
            models.Index(fields=["is_active", "role"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    @property
    def is_admin_role(self):
        return self.role in ("admin", "super_admin")

    @property
    def is_faculty_role(self):
        return self.role == "faculty"

    @property
    def is_student_role(self):
        return self.role == "student"

    @property
    def is_moderator_role(self):
        return self.role == "moderator"

    @property
    def is_super_admin_role(self):
        return self.role == "super_admin"

    def has_role(self, *roles):
        return self.role in roles

    def lock_account(self):
        self.is_locked = True
        self.locked_at = timezone.now()
        self.save(update_fields=["is_locked", "locked_at"])

    def unlock_account(self):
        self.is_locked = False
        self.locked_at = None
        self.failed_login_attempts = 0
        self.save(update_fields=["is_locked", "locked_at", "failed_login_attempts"])

    def increment_failed_login(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.lock_account()
        else:
            self.save(update_fields=["failed_login_attempts"])

    def reset_failed_login(self):
        if self.failed_login_attempts > 0:
            self.failed_login_attempts = 0
            self.save(update_fields=["failed_login_attempts"])
