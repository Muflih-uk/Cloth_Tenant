from django.urls import path

from .views import (
    CreatePinView,
    ForgotPasswordView,
    LoginView,
    ProfileView,
    RequestPinCodeView,
    ResetPasswordView,
    ResetPinView,
    VerifyPinView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("verify-pin/", VerifyPinView.as_view(), name="verify-pin"),
    path("create-pin/", CreatePinView.as_view(), name="create-pin"),
    path("request-pin-code/", RequestPinCodeView.as_view(), name="request-pin-code"),
    path("reset-pin/", ResetPinView.as_view(), name="reset-pin"),
]
