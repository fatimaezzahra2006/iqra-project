from django.urls import path
from .auth_views import (
    # Inscription / Vérification
    RegisterView,
    VerifyEmailView,
    ResendVerificationView,
    # Connexion / Déconnexion / Token
    LoginView,
    LogoutView,
    TokenRefreshView,
    MeView,
    # Profil / Compte
    ProfileView,
    DeleteAccountView,
    # OAuth Google
    GoogleOAuthInitView,
    GoogleOAuthCallbackView,
)

urlpatterns = [
    # Inscription & vérification
    path('register/',             RegisterView.as_view(),            name='auth_register'),
    path('verify-email/',         VerifyEmailView.as_view(),         name='auth_verify_email'),
    path('resend-verification/',  ResendVerificationView.as_view(),  name='auth_resend_verification'),
    # Session
    path('login/',                LoginView.as_view(),               name='auth_login'),
    path('logout/',               LogoutView.as_view(),              name='auth_logout'),
    path('refresh/',              TokenRefreshView.as_view(),        name='auth_refresh'),
    path('me/',                   MeView.as_view(),                  name='auth_me'),
    # Profil & compte
    path('profile/',              ProfileView.as_view(),             name='auth_profile'),
    path('delete-account/',       DeleteAccountView.as_view(),       name='auth_delete_account'),
    # Google OAuth
    path('google/',               GoogleOAuthInitView.as_view(),     name='auth_google_init'),
    path('google/callback/',      GoogleOAuthCallbackView.as_view(), name='auth_google_callback'),
]
