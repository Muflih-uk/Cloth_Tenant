import re

from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not (username or email):
            raise serializers.ValidationError(
                {"error": "Username or email is required"}
            )

        if email:
            try:
                user_obj = User.objects.get(email__iexact=email)
                username = user_obj.username
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    {"error": "No account found for this email"}
                )

        user = authenticate(username=username, password=password)

        if user is None:
            raise serializers.ValidationError(
                {"error": "Invalid password"}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"error": "This account has been deactivated"}
            )

        data['user'] = user
        return data


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    user_id = serializers.IntegerField()
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    is_superuser = serializers.BooleanField()


class VerifyPinRequestSerializer(serializers.Serializer):
    pin = serializers.CharField(write_only=True, required=True, allow_blank=True)


class UserSerializer(serializers.ModelSerializer):
    has_pin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'role',
            'is_superuser',
            'display_name',
            'has_pin',
        )

    def get_has_pin(self, obj):
        """Whether this account has a PIN at all.

        The profile settings page asks for this: with no PIN there is nothing to
        prove and one can simply be created, whereas changing an existing one
        goes through the emailed code.
        """
        return bool(obj.pin)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """An admin editing their own account details.

    Only the fields that appear on the profile screen. The email and username are
    unique, so both are checked against every row but this user's own.
    """

    class Meta:
        model = User
        fields = ("username", "email", "display_name")

    def validate_username(self, value):
        user = self.context["request"].user
        if User.objects.filter(username=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Username is already taken.')
        return value

    def validate_email(self, value):
        user = self.context["request"].user
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Email already exists")
        return value


class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'role', 'display_name')
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value


PIN_PATTERN = re.compile(r"^\d{6}$")
PIN_ERROR = "PIN must be exactly 6 digits."


def validate_pin(value):
    """A PIN is six digits -- the same shape the delete dialogs type in."""
    if not PIN_PATTERN.match(str(value)):
        raise serializers.ValidationError(PIN_ERROR)
    return value


class CreatePinSerializer(serializers.Serializer):
    """Set a PIN for an account that does not have one yet."""

    pin = serializers.CharField(write_only=True, validators=[validate_pin])


class ResetPinSerializer(serializers.Serializer):
    """Change an existing PIN using the code emailed to the admin."""

    code = serializers.CharField(write_only=True)
    pin = serializers.CharField(write_only=True, validators=[validate_pin])

    def validate_code(self, value):
        value = str(value).strip()
        if not PIN_PATTERN.match(value):
            raise serializers.ValidationError("The code is 6 digits.")
        return value
