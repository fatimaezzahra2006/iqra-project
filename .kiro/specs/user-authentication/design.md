# Design Document — user-authentication

## Overview

Ce document décrit l'architecture du système d'authentification de la plateforme IQRA. Le système repose sur un backend Django/DRF qui émet des tokens JWT stockés dans des cookies HttpOnly, et un frontend React qui consomme ces tokens de manière transparente via un contexte d'authentification global et un intercepteur axios.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│                                                              │
│  AuthContext (Provider global)                               │
│   ├── isAuthenticated, user, isLoading                       │
│   ├── login(), signup(), logout(), refreshToken()            │
│   └── axios instance avec intercepteur 401 → refresh        │
│                                                              │
│  Pages: Login, Signup                                        │
│  Composants: ProtectedRoute, GoogleOAuthButton               │
│  Utils: axiosInstance (withCredentials: true)                │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + Cookies HttpOnly
                           │ (CORS avec credentials)
┌──────────────────────────▼──────────────────────────────────┐
│                      Django Backend                          │
│                                                              │
│  api/auth/                                                   │
│   ├── POST /register/     → RegisterView                     │
│   ├── POST /login/        → LoginView                        │
│   ├── POST /logout/       → LogoutView                       │
│   ├── POST /refresh/      → TokenRefreshView (custom)        │
│   ├── GET  /me/           → MeView                           │
│   └── GET  /google/       → GoogleOAuthCallbackView          │
│                                                              │
│  Models: CustomUser (AbstractUser)                           │
│  Auth: djangorestframework_simplejwt + TokenBlacklist        │
│  Cookies: HttpOnly, Secure (prod), SameSite=Lax              │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Composants Backend

### 1. Modèle utilisateur — `CustomUser`

Le modèle étend `AbstractUser` de Django. Le champ `username` est rendu inutile en faveur de l'email comme identifiant unique.

**Fichier :** `api/models.py`

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email
```

`AUTH_USER_MODEL = 'api.CustomUser'` doit être ajouté aux settings.

---

### 2. Serializers

**Fichier :** `api/serializers.py`

```python
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Les mots de passe ne correspondent pas."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']
```

---

### 3. Utilitaire cookies

**Fichier :** `api/auth_cookies.py`

```python
from django.conf import settings

ACCESS_TOKEN_LIFETIME_SECONDS  = 15 * 60        # 15 minutes
REFRESH_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60  # 7 jours

def set_auth_cookies(response, access_token, refresh_token):
    """Définit les cookies HttpOnly pour access et refresh tokens."""
    secure = not settings.DEBUG
    response.set_cookie(
        key='access_token',
        value=access_token,
        httponly=True,
        secure=secure,
        samesite='Lax',
        max_age=ACCESS_TOKEN_LIFETIME_SECONDS,
    )
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite='Lax',
        max_age=REFRESH_TOKEN_LIFETIME_SECONDS,
    )

def delete_auth_cookies(response):
    """Supprime les cookies d'authentification en les écrasant avec des cookies expirés."""
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
```

---

### 4. Vues d'authentification

**Fichier :** `api/auth_views.py`

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import authenticate, get_user_model

from .serializers import RegisterSerializer, UserSerializer
from .auth_cookies import set_auth_cookies, delete_auth_cookies

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        access  = str(refresh.access_token)

        response = Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        set_auth_cookies(response, access_token=access, refresh_token=str(refresh))
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '')
        password = request.data.get('password', '')

        if not email or not password:
            return Response(
                {"detail": "Email et mot de passe requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"detail": "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        access  = str(refresh.access_token)

        response = Response(UserSerializer(user).data, status=status.HTTP_200_OK)
        set_auth_cookies(response, access_token=access, refresh_token=str(refresh))
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, InvalidToken):
                pass  # Token déjà invalide — on continue

        response = Response({"detail": "Déconnexion réussie."}, status=status.HTTP_200_OK)
        delete_auth_cookies(response)
        return response


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response(
                {"detail": "Refresh token absent."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            token  = RefreshToken(refresh_token)
            access = str(token.access_token)
        except (TokenError, InvalidToken):
            return Response(
                {"detail": "Refresh token invalide ou expiré."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        response = Response({"detail": "Token rafraîchi."}, status=status.HTTP_200_OK)
        response.set_cookie(
            key='access_token', value=access,
            httponly=True, secure=not __import__('django').conf.settings.DEBUG,
            samesite='Lax', max_age=15 * 60,
        )
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
```

---

### 5. Authentification JWT depuis les cookies

DRF doit être configuré pour lire l'`access_token` depuis les cookies (et non le header `Authorization`).

**Fichier :** `api/authentication.py`

```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    """Lit le JWT depuis le cookie 'access_token' plutôt que le header Authorization."""

    def authenticate(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return None
        try:
            validated_token = self.get_validated_token(access_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError):
            return None
```

---

### 6. OAuth Google — `GoogleOAuthCallbackView`

Le flux OAuth utilise la bibliothèque `google-auth`.

**Fichier :** `api/auth_views.py` (ajout)

```python
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.shortcuts import redirect

class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code  = request.GET.get('code')
        error = request.GET.get('error')

        if error or not code:
            return redirect('/login?error=google_auth_failed')

        try:
            # Échange du code contre un token d'identité
            token_data = exchange_google_code(code)  # helper à implémenter
            id_info    = id_token.verify_oauth2_token(
                token_data['id_token'],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            email      = id_info['email']
            first_name = id_info.get('given_name', '')
            last_name  = id_info.get('family_name', '')

            user, _ = User.objects.get_or_create(
                email=email,
                defaults={'first_name': first_name, 'last_name': last_name, 'username': email}
            )

            refresh  = RefreshToken.for_user(user)
            response = redirect('/smart')
            set_auth_cookies(response, str(refresh.access_token), str(refresh))
            return response

        except Exception:
            return redirect('/login?error=google_auth_failed')
```

---

### 7. Configuration Django (`settings.py`) — ajouts

```python
# Utilisateur personnalisé
AUTH_USER_MODEL = 'api.CustomUser'

# JWT
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES':      ('Bearer',),
}

# TokenBlacklist
INSTALLED_APPS += [
    'rest_framework_simplejwt.token_blacklist',
]

# DRF — authentification par cookie JWT
REST_FRAMEWORK = {
    ...
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'api.authentication.CookieJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    # URL de production à ajouter
]
CORS_ALLOW_CREDENTIALS = True

# Google OAuth
GOOGLE_CLIENT_ID     = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI  = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/auth/google/callback/')
```

---

### 8. URLs backend

**Fichier :** `api/auth_urls.py`

```python
from django.urls import path
from .auth_views import (
    RegisterView, LoginView, LogoutView,
    TokenRefreshView, MeView, GoogleOAuthCallbackView,
    GoogleOAuthInitView,
)

urlpatterns = [
    path('register/',          RegisterView.as_view(),            name='auth_register'),
    path('login/',             LoginView.as_view(),               name='auth_login'),
    path('logout/',            LogoutView.as_view(),              name='auth_logout'),
    path('refresh/',           TokenRefreshView.as_view(),        name='auth_refresh'),
    path('me/',                MeView.as_view(),                  name='auth_me'),
    path('google/',            GoogleOAuthInitView.as_view(),     name='auth_google_init'),
    path('google/callback/',   GoogleOAuthCallbackView.as_view(), name='auth_google_callback'),
]
```

Inclus dans `iqra_backend/urls.py` :

```python
path('api/auth/', include('api.auth_urls')),
```

---

## Composants Frontend

### 9. Instance axios centralisée

**Fichier :** `src/utils/axiosInstance.js`

```javascript
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,   // envoie les cookies HttpOnly automatiquement
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur réponse : 401 → tentative de refresh
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve());
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => axiosInstance(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axiosInstance.post('/api/auth/refresh/');
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // AuthContext gère la déconnexion
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

---

### 10. AuthContext

**Fichier :** `src/utils/AuthContext.jsx`

```jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from './axiosInstance';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const navigate = useNavigate();

  // Vérification au montage via /api/auth/me/
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axiosInstance.get('/api/auth/me/');
        setUser(res.data);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Écouter l'événement de déconnexion forcée depuis l'intercepteur
    const handleForcedLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleForcedLogout);
    checkAuth();

    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [navigate]);

  const signup = useCallback(async (formData) => {
    const res = await axiosInstance.post('/api/auth/register/', formData);
    setUser(res.data);
    setIsAuthenticated(true);
    return res.data;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await axiosInstance.post('/api/auth/login/', { email, password });
    setUser(res.data);
    setIsAuthenticated(true);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post('/api/auth/logout/');
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      navigate('/');
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
```

---

### 11. ProtectedRoute

**Fichier :** `src/components/ProtectedRoute.jsx`

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span>Chargement...</span>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
```

---

### 12. Pages Login et Signup

**Fichier :** `src/pages/Login.jsx`

```jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors]     = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    navigate('/smart', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    try {
      await login(formData.email, formData.password);
      navigate('/smart');
    } catch (err) {
      const data = err.response?.data;
      setErrors(data || { detail: 'Erreur de connexion.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email" name="email" value={formData.email}
        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
        placeholder="Email" required
      />
      {errors.email && <span>{errors.email}</span>}

      <input
        type="password" name="password" value={formData.password}
        onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
        placeholder="Mot de passe" required
      />
      {errors.detail && <span>{errors.detail}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Connexion...' : 'Se connecter'}
      </button>

      <a href="/api/auth/google/">Continuer avec Google</a>
      <Link to="/signup">Créer un compte</Link>
    </form>
  );
};

export default Login;
```

**Fichier :** `src/pages/Signup.jsx` — même structure avec les champs `first_name`, `last_name`, `email`, `password`, `confirm_password`.

---

### 13. Intégration dans `App.jsx`

```jsx
import { AuthProvider } from './utils/AuthContext';
import ProtectedRoute   from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <main>
          <Routes>
            <Route path="/"        element={<Home />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/about"   element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login"   element={<Login />} />
            <Route path="/signup"  element={<Signup />} />
            <Route
              path="/smart"
              element={
                <ProtectedRoute>
                  <SmartModule />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </Router>
  );
}
```

---

## Data Models

### User (backend)

| Champ        | Type         | Contrainte           |
|--------------|--------------|----------------------|
| id           | AutoField    | PK, auto             |
| email        | EmailField   | unique, USERNAME_FIELD|
| first_name   | CharField    | obligatoire          |
| last_name    | CharField    | obligatoire          |
| password     | CharField    | haché par Django     |
| is_active    | BooleanField | défaut=True          |
| date_joined  | DateTimeField| auto                 |

### État AuthContext (frontend)

| Champ           | Type    | Description                          |
|-----------------|---------|--------------------------------------|
| user            | Object  | `{id, email, first_name, last_name}` ou null |
| isAuthenticated | Boolean | true si access_token cookie valide   |
| isLoading       | Boolean | true pendant la vérification initiale |

---

## Flux d'authentification

### Flux inscription / connexion

```
Utilisateur → [Login/Signup Form]
                    │ POST /api/auth/register/ ou /login/
                    ▼
            Django AuthService
                    │ valide les données
                    │ crée/récupère User
                    │ génère AccessToken + RefreshToken
                    ▼
            Réponse HTTP 200/201
              + Set-Cookie: access_token (HttpOnly)
              + Set-Cookie: refresh_token (HttpOnly)
              + Body: { id, email, first_name, last_name }
                    │
                    ▼
            AuthContext.setUser(data)
            AuthContext.setIsAuthenticated(true)
                    │
                    ▼
            navigate('/smart')
```

### Flux rafraîchissement automatique

```
axiosInstance [requête API]
        │ 401 reçu
        ▼
    isRefreshing ?
    ├── oui → mise en file d'attente
    └── non → POST /api/auth/refresh/
                    │
                    ├── succès → relancer toutes les requêtes en attente
                    └── échec  → event auth:logout
                                 AuthContext → isAuthenticated=false
                                 navigate('/login')
```

---

## Error Handling

| Scénario                        | Code HTTP | Comportement frontend                         |
|---------------------------------|-----------|-----------------------------------------------|
| Email déjà utilisé              | 400       | Message d'erreur sous le champ email          |
| Mots de passe non concordants   | 400       | Message d'erreur sous confirm_password        |
| Mot de passe < 8 caractères     | 400       | Message de validation Django                  |
| Identifiants invalides          | 401       | Message générique (sans distinguer email/mdp) |
| Access token expiré             | 401       | Refresh automatique via intercepteur          |
| Refresh token expiré/invalide   | 401       | Déconnexion + redirect /login                 |
| Erreur OAuth Google             | redirect  | Redirect /login?error=google_auth_failed      |
| Origine CORS non autorisée      | 403       | Erreur réseau côté client                     |

---

## Testing Strategy

L'approche de test suit un modèle dual : tests basés sur des exemples pour les comportements spécifiques, et tests basés sur des propriétés pour les invariants universels.

**Tests unitaires / d'intégration (backend Django)**
- `pytest-django` avec des fixtures pour créer des utilisateurs et simuler des requêtes HTTP.
- Chaque endpoint (`/register/`, `/login/`, `/logout/`, `/refresh/`, `/me/`) est couvert par des exemples concrets et des cas limites.
- Les cookies sont vérifiés directement dans l'objet `response.cookies`.

**Tests de propriétés (backend)**
- Utilisation de `hypothesis` pour générer des entrées aléatoires (mots de passe courts, emails invalides, paires de tokens).
- Propriétés ciblant la validation (Requirements 1.3, 1.4), les cookies (Requirements 1.6, 2.1), et le cycle de vie des tokens (Requirements 4.4, 5.1).

**Tests de composants (frontend React)**
- Utilisation de `vitest` + `@testing-library/react` pour tester `ProtectedRoute`, `AuthContext`, et les formulaires.
- `msw` (Mock Service Worker) ou mock axios pour simuler les réponses backend.
- Propriétés ciblant le comportement de l'intercepteur 401 (Requirement 4.1) et les redirections de `ProtectedRoute` (Requirement 6.1).

**Non couverts par les tests automatisés**
- Flux OAuth Google complet (dépend d'une interaction avec les serveurs Google — testé manuellement en intégration).
- Attributs de cookies (`Secure`, `SameSite`) en production — vérifiés par smoke test en environnement staging.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Inscription avec mot de passe court rejetée

*For any* string of length strictly less than 8 characters submitted as password in the registration form, the AuthService SHALL return an HTTP 400 error response.

**Validates: Requirements 1.3**

---

### Property 2: Mots de passe discordants rejetés

*For any* pair (password, confirm_password) where `password != confirm_password`, the AuthService SHALL return an HTTP 400 error response and SHALL NOT create a user account.

**Validates: Requirements 1.4**

---

### Property 3: Inscription réussie → cookies HttpOnly définis

*For any* valid registration payload (valid email, password ≥ 8 chars, matching confirm_password, unique email), the AuthService SHALL set both `access_token` and `refresh_token` HttpOnly cookies in the response, AND return `id`, `email`, `first_name`, `last_name` in the response body.

**Validates: Requirements 1.6, 1.7**

---

### Property 4: Connexion réussie → cookies et données utilisateur

*For any* registered user with valid credentials (email + password), calling `POST /api/auth/login/` SHALL return HTTP 200 with both HttpOnly cookies set and the user's `id`, `email`, `first_name`, `last_name` in the body.

**Validates: Requirements 2.1, 2.4**

---

### Property 5: Identifiants invalides → 401 générique

*For any* credential pair (email, password) that does not match an existing user account, the AuthService SHALL return HTTP 401 with a generic error message that does not reveal which field is incorrect.

**Validates: Requirements 2.2**

---

### Property 6: Format email invalide → 400

*For any* string that does not conform to valid email format (no `@`, no domain, etc.), submitting it as the email field in login or registration SHALL return HTTP 400.

**Validates: Requirements 2.3**

---

### Property 7: Refresh token valide → nouvel access token

*For any* valid, non-expired refresh token stored in the `refresh_token` cookie, calling `POST /api/auth/refresh/` SHALL return HTTP 200 with a new `access_token` cookie.

**Validates: Requirements 4.4**

---

### Property 8: Refresh token blacklisté après déconnexion

*For any* valid refresh token, after the user calls `POST /api/auth/logout/`, attempting to use that same refresh token on `POST /api/auth/refresh/` SHALL return HTTP 401.

**Validates: Requirements 5.1**

---

### Property 9: Déconnexion → suppression des cookies

*For any* authenticated user who calls `POST /api/auth/logout/`, the response SHALL contain `Set-Cookie` headers that expire both `access_token` and `refresh_token` cookies.

**Validates: Requirements 5.2**

---

### Property 10: ProtectedRoute redirige les non-authentifiés

*For any* non-authenticated application state (isAuthenticated = false, isLoading = false), rendering the `ProtectedRoute` component SHALL redirect to `/login` without rendering the protected child component.

**Validates: Requirements 6.1**

---

### Property 11: /api/auth/me/ retourne les données pour tout token valide

*For any* valid, non-expired `access_token` cookie, calling `GET /api/auth/me/` SHALL return HTTP 200 with the authenticated user's `id`, `email`, `first_name`, and `last_name`.

**Validates: Requirements 6.4**

---

### Property 12: Intercepteur axios — requête 401 déclenche le refresh

*For any* API request that receives a 401 response and for which no refresh is currently in progress, the axios interceptor SHALL automatically call `POST /api/auth/refresh/` before retrying the original request.

**Validates: Requirements 4.1**
