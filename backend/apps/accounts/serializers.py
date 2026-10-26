import re

from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import SubAdminPermission, User
from .permissions import SUBADMIN_FLAGS, get_subadmin_flags


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
    orders_view = serializers.BooleanField()
    orders_edit = serializers.BooleanField()
    orders_delete = serializers.BooleanField()
    items_view = serializers.BooleanField()
    items_edit = serializers.BooleanField()
    items_delete = serializers.BooleanField()
    agents_view = serializers.BooleanField()


class VerifyPinRequestSerializer(serializers.Serializer):
    pin = serializers.CharField(write_only=True, required=True, allow_blank=True)


class UserSerializer(serializers.ModelSerializer):
    has_pin = serializers.SerializerMethodField()
    orders_view = serializers.SerializerMethodField()
    orders_edit = serializers.SerializerMethodField()
    orders_delete = serializers.SerializerMethodField()
    items_view = serializers.SerializerMethodField()
    items_edit = serializers.SerializerMethodField()
    items_delete = serializers.SerializerMethodField()
    agents_view = serializers.SerializerMethodField()

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
            *SUBADMIN_FLAGS,
        )

    def _flag(self, obj, name):
        return get_subadmin_flags(obj)[name]

    def get_orders_view(self, obj):
        return self._flag(obj, "orders_view")

    def get_orders_edit(self, obj):
        return self._flag(obj, "orders_edit")

    def get_orders_delete(self, obj):
        return self._flag(obj, "orders_delete")

    def get_items_view(self, obj):
        return self._flag(obj, "items_view")

    def get_items_edit(self, obj):
        return self._flag(obj, "items_edit")

    def get_items_delete(self, obj):
        return self._flag(obj, "items_delete")

    def get_agents_view(self, obj):
        return self._flag(obj, "agents_view")

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


class SubAdminSerializer(serializers.ModelSerializer):
    """Create or edit a sub-admin and the switches they are allowed to use."""

    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8
    )
    pin = serializers.CharField(write_only=True, required=False, allow_blank=True)
    display_name = serializers.CharField(
        required=False, allow_blank=True, max_length=255
    )
    has_pin = serializers.SerializerMethodField()
    role = serializers.CharField(read_only=True)
    orders_view = serializers.BooleanField(required=False, default=False)
    orders_edit = serializers.BooleanField(required=False, default=False)
    orders_delete = serializers.BooleanField(required=False, default=False)
    items_view = serializers.BooleanField(required=False, default=False)
    items_edit = serializers.BooleanField(required=False, default=False)
    items_delete = serializers.BooleanField(required=False, default=False)
    agents_view = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "password",
            "display_name",
            "pin",
            "has_pin",
            "is_active",
            "role",
            *SUBADMIN_FLAGS,
        )
        read_only_fields = ("id", "has_pin", "role")
        extra_kwargs = {
            "username": {"required": True},
            "email": {"required": True},
        }

    def get_has_pin(self, obj):
        return bool(obj.pin)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.update(get_subadmin_flags(instance))
        return data

    def validate_username(self, value):
        qs = User.objects.filter(username=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'Username "{value}" is already taken.'
            )
        return value

    def validate_email(self, value):
        qs = User.objects.filter(email__iexact=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def validate_pin(self, value):
        if value:
            return validate_pin(value)
        return value

    def validate(self, attrs):
        profile = (
            getattr(self.instance, "subadmin_permission", None)
            if self.instance is not None
            else None
        )
        effective = {
            flag: attrs.get(
                flag,
                bool(profile and getattr(profile, flag, False))
                if profile is not None
                else False,
            )
            for flag in SUBADMIN_FLAGS
        }

        errors = {}
        if (effective["orders_edit"] or effective["orders_delete"]) and not effective[
            "orders_view"
        ]:
            errors["orders_view"] = "Order view is required for edit or delete."
        if (effective["items_edit"] or effective["items_delete"]) and not effective[
            "items_view"
        ]:
            errors["items_view"] = "Item view is required for edit or delete."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        flags = {flag: validated_data.pop(flag, False) for flag in SUBADMIN_FLAGS}
        raw_pin = validated_data.pop("pin", "")
        password = validated_data.pop("password", "")
        if not password:
            raise serializers.ValidationError(
                {"password": "A password is required for a new sub-admin."}
            )

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=password,
            display_name=validated_data.get("display_name", ""),
            role="SUBADMIN",
        )
        if raw_pin:
            user.set_pin(raw_pin)
            user.save(update_fields=["pin"])
        SubAdminPermission.objects.create(user=user, **flags)
        return user

    def update(self, instance, validated_data):
        profile = getattr(instance, "subadmin_permission", None)
        flags = {
            flag: validated_data.pop(
                flag, bool(profile and getattr(profile, flag, False))
            )
            for flag in SUBADMIN_FLAGS
        }
        raw_pin = validated_data.pop("pin", "")
        password = validated_data.pop("password", "")

        if password:
            instance.set_password(password)
        for field in ("username", "email", "display_name", "is_active"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        if raw_pin:
            instance.set_pin(raw_pin)
        instance.save()

        profile = getattr(instance, "subadmin_permission", None)
        if profile is None:
            profile = SubAdminPermission.objects.create(user=instance)
        for flag, value in flags.items():
            setattr(profile, flag, value)
        profile.save()
        return instance


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
