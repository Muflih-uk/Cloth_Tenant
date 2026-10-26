from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """A mill staff account.

    Single-tenant: the mill's legal identity lives in :class:`business.Brand`
    (used for invoicing), not on the user. Admins see the whole catalogue.
    """

    ROLE_CHOICES = (("ADMIN", "Admin"), ("AGENT", "Agent"))

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, blank=True)
    display_name = models.CharField(max_length=255, blank=True, default="")
    pin = models.CharField(max_length=128, blank=True, default="")

    def set_pin(self, raw_pin):
        self.pin = make_password(str(raw_pin))

    def check_pin(self, raw_pin):
        return check_password(str(raw_pin), self.pin)

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = "ADMIN"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="custom_password_reset_tokens",
    )
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PasswordResetToken({self.user.email}, used={self.used})"


class PinResetCode(models.Model):
    """A short-lived code an admin types in to change their PIN.

    The PIN is what stands between a mistyped delete and a lost order, so it is
    never changed just because someone is signed in: the admin asks for a code,
    the code is emailed to them, and only the holder of the mailbox can finish.
    It is a code rather than a link because the whole flow happens inside the
    profile settings page the admin is already on.

    Only the admin's own unused codes are ever read, so a code only ever has to
    be good against the one account that asked for it.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pin_reset_codes",
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PinResetCode({self.user.email}, used={self.used})"
