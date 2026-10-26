import secrets
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetToken, PinResetCode
from .permissions import IsAdmin, check_admin_pin
from .serializers import (
    CreatePinSerializer,
    LoginRequestSerializer,
    LoginResponseSerializer,
    ProfileUpdateSerializer,
    ResetPinSerializer,
    UserSerializer,
    VerifyPinRequestSerializer,
)

User = get_user_model()


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    @extend_schema(
        request=LoginRequestSerializer,
        responses={200: LoginResponseSerializer},
        tags=["Authentication"],
    )
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)

        if not serializer.is_valid():
            # Return a flat { "error": "..." } so the frontend can read it
            first_error = next(iter(serializer.errors.values()))
            message = (
                first_error[0] if isinstance(first_error, list) else str(first_error)
            )
            return Response(
                {"error": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.validated_data["user"]

        if user is None:
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "role": user.role,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "is_superuser": user.is_superuser,
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UserSerializer},
        tags=["Authentication"],
    )
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={200: UserSerializer},
        tags=["Authentication"],
    )
    def patch(self, request):
        """Edit your own account details.

        Your own name, username and email are yours to change, so no PIN is asked
        for here -- the PIN gate exists to stop a *destructive* admin action, and
        nothing on this endpoint can touch anybody else's account.
        """
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ForgotPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"error": "No account found with that email address."},
                status=status.HTTP_404_NOT_FOUND,
            )

        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

        token = PasswordResetToken.objects.create(
            user=user,
            token=uuid.uuid4().hex,
            expires_at=timezone.now() + timedelta(minutes=30),
        )

        reset_link = f"https://xlapparals.in/reset-password?token={token.token}"

        send_mail(
            subject="XL Apparals - Reset your password",
            message=(
                f"Hello,\n\n"
                f"Click the link below to reset your password. "
                f"This link expires in 30 minutes.\n\n"
                f"{reset_link}\n\n"
                f"If you didn't request this, you can safely ignore this email.\n\n"
                f"— The XL Apparals Team"
            ),
            html_message=(
                f"""
                <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:12px;">
                  <h2 style="color:#111;margin-bottom:8px;">Reset your password</h2>
                  <p style="color:#555;">Hi {user.first_name or user.email},</p>
                  <p style="color:#555;">Click the button below to reset your XL Apparals password. This link expires in <strong>30 minutes</strong>.</p>
                  <a href="{reset_link}"
                     style="display:inline-block;margin:24px 0;padding:14px 28px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
                    Reset Password
                  </a>
                  <p style="color:#999;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
                """
            ),
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response(
            {"message": "If that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        token_str = request.data.get("token", "").strip()
        new_password = request.data.get("password", "")

        if not token_str or not new_password:
            return Response(
                {"error": "Token and new password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = PasswordResetToken.objects.select_related("user").get(
                token=token_str,
                used=False,
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token.expires_at < timezone.now():
            token.used = True
            token.save()
            return Response(
                {"error": "This reset link has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token.user
        user.set_password(new_password)
        user.save()

        token.used = True
        token.save()

        return Response(
            {"message": "Password updated successfully. You can now sign in."},
            status=status.HTTP_200_OK,
        )


class CreatePinView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=CreatePinSerializer,
        responses={200: None},
        tags=["Authentication"],
    )
    def post(self, request):
        """Set a PIN on an account that does not have one yet.

        There is nothing to prove here: the admin is signed in and has told the
        server there is no PIN, so the first one can simply be chosen. Changing
        an existing one is the case that needs the emailed code, because that is
        the one a stranger who has walked up to an unattended screen would want.
        """
        serializer = CreatePinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if request.user.pin:
            return Response(
                {"error": "A PIN is already set. Use Edit PIN to change it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_pin(serializer.validated_data["pin"])
        request.user.save(update_fields=["pin"])
        return Response({"message": "PIN created.", "has_pin": True})


class RequestPinCodeView(APIView):
    permission_classes = [IsAdmin]

    CODE_LIFETIME = timedelta(minutes=30)

    @extend_schema(responses={200: None}, tags=["Authentication"])
    def post(self, request):
        """Email the admin a one-time code for changing their PIN."""
        if not request.user.pin:
            return Response(
                {"error": "This account has no PIN yet. Create one instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = f"{secrets.randbelow(1000000):06d}"
        # Only the newest code counts, so a second request retires the first
        # rather than leaving two live ways into the same account.
        PinResetCode.objects.filter(user=request.user, used=False).update(used=True)
        PinResetCode.objects.create(
            user=request.user,
            code=code,
            expires_at=timezone.now() + self.CODE_LIFETIME,
        )

        minutes = int(self.CODE_LIFETIME.total_seconds() // 60)
        send_mail(
            subject="XL Apparals - Your PIN reset code",
            message=(
                f"Hello,\n\n"
                f"Use this code to choose a new PIN:\n\n"
                f"    {code}\n\n"
                f"Open Profile -> Settings and enter it there. "
                f"The code expires in {minutes} minutes.\n\n"
                f"If you did not ask for this, you can ignore this email -- "
                f"your PIN stays as it is.\n\n"
                f"— The XL Apparals Team"
            ),
            from_email=None,
            recipient_list=[request.user.email],
            fail_silently=False,
        )

        return Response(
            {
                "message": "If that account has an email on file, a code is on its way.",
                "expires_in_minutes": minutes,
            }
        )


class ResetPinView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=ResetPinSerializer,
        responses={200: None},
        tags=["Authentication"],
    )
    def post(self, request):
        """Trade a valid emailed code for a new PIN."""
        serializer = ResetPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]
        valid = PinResetCode.objects.filter(
            user=request.user,
            code=code,
            used=False,
            expires_at__gte=timezone.now(),
        ).first()
        if valid is None:
            return Response(
                {"error": "That code is wrong or has expired. Ask for a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_pin(serializer.validated_data["pin"])
        request.user.save(update_fields=["pin"])
        # One code, one use: every outstanding code dies with the one that worked.
        PinResetCode.objects.filter(user=request.user, used=False).update(used=True)
        return Response({"message": "PIN updated.", "has_pin": True})


class VerifyPinView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=VerifyPinRequestSerializer,
        responses={200: None},
        tags=["Authentication"],
    )
    def post(self, request):
        pin_error = check_admin_pin(request)
        if pin_error:
            return pin_error
        return Response({"ok": True})
