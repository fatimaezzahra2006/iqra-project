import random
import string
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    """Manager qui utilise l'email comme identifiant unique, sans username obligatoire."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True)
    is_email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = CustomUserManager()

    def __str__(self):
        return self.email


class EmailVerificationCode(models.Model):
    """Code OTP à 6 chiffres envoyé par email pour vérifier le compte."""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='verification_code'
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now=True)

    def is_expired(self):
        """Expire après 10 minutes."""
        return timezone.now() > self.created_at + timezone.timedelta(minutes=10)

    @classmethod
    def generate_for(cls, user):
        code = ''.join(random.choices(string.digits, k=6))
        obj, _ = cls.objects.update_or_create(user=user, defaults={'code': code})
        return obj
