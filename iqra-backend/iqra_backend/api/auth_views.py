"""
auth_views.py — Vues d'authentification IQRA
=============================================
Sections :
  1. Imports
  2. Helpers (email)
  3. Inscription / Vérification email
  4. Connexion / Déconnexion / Token
  5. Profil / Suppression compte
  6. OAuth Google
"""

# ─── 1. Imports ───────────────────────────────────────────────────────────────
import logging
import urllib.parse

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.shortcuts import redirect

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

import requests as http_requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .auth_cookies import delete_auth_cookies, set_auth_cookies
from .models import EmailVerificationCode
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)

FRONTEND_URL = 'http://localhost:3002'


# ─── 2. Helpers ───────────────────────────────────────────────────────────────

def _send_verification_email(user):
    """Génère un OTP 6 chiffres et envoie l'email de vérification IQRA."""
    obj = EmailVerificationCode.generate_for(user)
    otp_code   = obj.code
    first_name = user.first_name or 'là'

    subject = '🎓 Vérifiez votre compte IQRA'

    html_message = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
  background:linear-gradient(135deg,#f3eaff,#ede0f7);margin:0;padding:40px 20px;}}
.c{{max-width:600px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;
  box-shadow:0 20px 60px rgba(142,85,161,.15);}}
.logo{{text-align:center;margin-bottom:24px;font-size:32px;font-weight:900;
  font-style:italic;color:#8e55a1;letter-spacing:-1px;}}
h1{{color:#191a23;font-size:26px;margin:0 0 8px;text-align:center;}}
.sub{{color:#888;font-size:15px;text-align:center;margin-bottom:28px;}}
.otp{{background:linear-gradient(135deg,#8e55a1,#c084d8);border-radius:16px;
  padding:28px;text-align:center;margin:24px 0;}}
.otp-code{{font-size:48px;font-weight:900;color:#fff;letter-spacing:10px;margin:0;}}
.otp-lbl{{color:rgba(255,255,255,.85);font-size:13px;margin-top:8px;}}
.info{{background:#f8f4fb;border-radius:12px;padding:18px;margin:20px 0;}}
.info p{{margin:6px 0;color:#555;font-size:14px;}}
.footer{{text-align:center;margin-top:32px;padding-top:20px;
  border-top:1px solid #f0eaf7;color:#bbb;font-size:13px;}}
</style></head>
<body><div class="c">
  <div class="logo">IQRA</div>
  <h1>Bienvenue, {first_name} !</h1>
  <p class="sub">Plus qu'une étape pour accéder à votre espace IQRA</p>
  <div class="otp">
    <p class="otp-code">{otp_code}</p>
    <p class="otp-lbl">Votre code de vérification</p>
  </div>
  <div class="info">
    <p><strong>⏰ Ce code expire dans 10 minutes</strong></p>
    <p>Entrez ce code sur la page de vérification pour activer votre compte.</p>
    <p>Si vous n'avez pas créé de compte IQRA, ignorez cet email.</p>
  </div>
  <div class="footer">© 2026 IQRA · Plateforme éducative marocaine</div>
</div></body></html>"""

    plain = (
        f"Bienvenue sur IQRA, {first_name} !\n\n"
        f"Votre code : {otp_code}\n\n"
        f"Il expire dans 10 minutes.\n"
        f"Si vous n'avez pas créé de compte IQRA, ignorez cet email."
    )

    try:
        send_mail(
            subject=subject,
            message=plain,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"[IQRA] Verification email sent to {user.email}")
    except Exception as e:
        logger.error(f"[IQRA] Email error to {user.email}: {e}")


# ─── 3. Inscription / Vérification email ──────────────────────────────────────

class RegisterView(APIView):
    """POST /api/auth/register/ — crée un compte et envoie le code OTP."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        _send_verification_email(user)
        return Response(
            {**UserSerializer(user).data, 'email_verified': False},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    """POST /api/auth/verify-email/ — valide le code OTP et connecte l'utilisateur."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        code  = request.data.get('code', '').strip()
        if not email or not code:
            return Response({'detail': 'Email et code requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
            otp  = user.verification_code
        except (User.DoesNotExist, EmailVerificationCode.DoesNotExist):
            return Response({'detail': 'Code invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp.is_expired():
            return Response({'detail': 'Code expiré. Demandez un nouveau code.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp.code != code:
            return Response({'detail': 'Code incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_email_verified = True
        user.save(update_fields=['is_email_verified'])
        otp.delete()
        refresh  = RefreshToken.for_user(user)
        response = Response({**UserSerializer(user).data, 'email_verified': True}, status=status.HTTP_200_OK)
        set_auth_cookies(response, access_token=str(refresh.access_token), refresh_token=str(refresh))
        return response


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification/ — renvoie un nouveau code OTP."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Compte introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if user.is_email_verified:
            return Response({'detail': 'Email déjà vérifié.'}, status=status.HTTP_400_BAD_REQUEST)
        _send_verification_email(user)
        return Response({'detail': 'Nouveau code envoyé.'}, status=status.HTTP_200_OK)


# ─── 4. Connexion / Déconnexion / Token ───────────────────────────────────────

class LoginView(APIView):
    """POST /api/auth/login/ — authentifie et pose les cookies JWT."""
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        if not email or not password:
            return Response({'detail': 'Email et mot de passe requis.'}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_email_verified:
            return Response(
                {'detail': 'Veuillez vérifier votre email.', 'email_not_verified': True, 'email': email},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh  = RefreshToken.for_user(user)
        response = Response(UserSerializer(user).data, status=status.HTTP_200_OK)
        set_auth_cookies(response, access_token=str(refresh.access_token), refresh_token=str(refresh))
        return response


class LogoutView(APIView):
    """POST /api/auth/logout/ — blackliste le refresh token et supprime les cookies."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        rt = request.COOKIES.get('refresh_token')
        if rt:
            try:
                RefreshToken(rt).blacklist()
            except (TokenError, InvalidToken):
                pass
        response = Response({'detail': 'Déconnexion réussie.'}, status=status.HTTP_200_OK)
        delete_auth_cookies(response)
        return response


class TokenRefreshView(APIView):
    """POST /api/auth/refresh/ — rafraîchit l'access token depuis le cookie."""
    permission_classes = [AllowAny]

    def post(self, request):
        rt = request.COOKIES.get('refresh_token')
        if not rt:
            return Response({'detail': 'Refresh token absent.'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            token  = RefreshToken(rt)
            access = str(token.access_token)
        except (TokenError, InvalidToken):
            return Response({'detail': 'Refresh token invalide ou expiré.'}, status=status.HTTP_401_UNAUTHORIZED)
        response = Response({'detail': 'Token rafraîchi.'}, status=status.HTTP_200_OK)
        response.set_cookie(
            key='access_token', value=access,
            httponly=True, secure=not settings.DEBUG,
            samesite='Lax', max_age=15 * 60,
        )
        return response


class MeView(APIView):
    """GET /api/auth/me/ — retourne l'utilisateur authentifié."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ─── 5. Profil / Suppression de compte ───────────────────────────────────────

class ProfileView(APIView):
    """GET /api/auth/profile/ — infos profil. PATCH — modifier prénom/nom."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        allowed = {k: v for k, v in request.data.items() if k in ('first_name', 'last_name')}
        for field, value in allowed.items():
            setattr(request.user, field, value)
        request.user.save(update_fields=list(allowed.keys()))
        return Response(UserSerializer(request.user).data)


class DeleteAccountView(APIView):
    """DELETE /api/auth/delete-account/ — supprime définitivement le compte."""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        # Blacklister le refresh token avant suppression
        rt = request.COOKIES.get('refresh_token')
        if rt:
            try:
                RefreshToken(rt).blacklist()
            except (TokenError, InvalidToken):
                pass
        user.delete()
        response = Response({'detail': 'Compte supprimé.'}, status=status.HTTP_200_OK)
        delete_auth_cookies(response)
        return response


# ─── 6. OAuth Google ──────────────────────────────────────────────────────────

class GoogleOAuthInitView(APIView):
    """GET /api/auth/google/ — redirige vers la page d'autorisation Google."""
    permission_classes = [AllowAny]

    def get(self, request):
        params = {
            'client_id':     settings.GOOGLE_CLIENT_ID,
            'redirect_uri':  settings.GOOGLE_REDIRECT_URI,
            'response_type': 'code',
            'scope':         'openid email profile',
            'access_type':   'offline',
            'prompt':        'select_account',
        }
        return redirect('https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params))


class GoogleOAuthCallbackView(APIView):
    """GET /api/auth/google/callback/ — reçoit le code, crée/récupère l'user, redirige."""
    permission_classes = [AllowAny]

    def get(self, request):
        code  = request.GET.get('code')
        error = request.GET.get('error')

        if error or not code:
            return redirect(f'{FRONTEND_URL}/login?error=google_auth_failed')

        try:
            token_response = http_requests.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'code':          code,
                    'client_id':     settings.GOOGLE_CLIENT_ID,
                    'client_secret': settings.GOOGLE_CLIENT_SECRET,
                    'redirect_uri':  settings.GOOGLE_REDIRECT_URI,
                    'grant_type':    'authorization_code',
                },
                timeout=10,
            )
            token_response.raise_for_status()
            token_data   = token_response.json()
            raw_id_token = token_data.get('id_token')
            if not raw_id_token:
                return redirect(f'{FRONTEND_URL}/login?error=google_auth_failed')

            id_info    = id_token.verify_oauth2_token(raw_id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
            email      = id_info.get('email')
            first_name = id_info.get('given_name', '')
            last_name  = id_info.get('family_name', '')

            if not email:
                return redirect(f'{FRONTEND_URL}/login?error=google_auth_failed')

            user, created = User.objects.get_or_create(
                email=email,
                defaults={'first_name': first_name, 'last_name': last_name, 'username': email, 'is_email_verified': True},
            )
            if not created and not user.is_email_verified:
                user.is_email_verified = True
                user.save(update_fields=['is_email_verified'])

            refresh  = RefreshToken.for_user(user)
            response = redirect(f'{FRONTEND_URL}/smart')
            set_auth_cookies(response, access_token=str(refresh.access_token), refresh_token=str(refresh))
            return response

        except Exception as e:
            logger.error(f"[IQRA] Google OAuth error: {e}")
            return redirect(f'{FRONTEND_URL}/login?error=google_auth_failed')
