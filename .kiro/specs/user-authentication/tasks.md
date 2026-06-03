# Implementation Plan: user-authentication

## Overview

Implémentation complète du système d'authentification de la plateforme IQRA. Le plan couvre : le modèle utilisateur, les serializers, les vues DRF, l'authentification JWT via cookies HttpOnly, le flux OAuth Google, la configuration Django, et tous les composants React (AuthContext, ProtectedRoute, pages Login/Signup, instance axios).

## Tasks

- [ ] 1. Configurer le modèle utilisateur et la base Django
  - [ ] 1.1 Créer le modèle `CustomUser` dans `api/models.py`
    - Étendre `AbstractUser`, définir `email` comme `USERNAME_FIELD`, rendre `username` optionnel
    - Ajouter `AUTH_USER_MODEL = 'api.CustomUser'` dans `settings.py`
    - Générer et appliquer les migrations (`makemigrations`, `migrate`)
    - _Requirements: 1.1, 1.5_

  - [ ] 1.2 Configurer `settings.py` pour JWT, TokenBlacklist et CORS
    - Ajouter `rest_framework_simplejwt.token_blacklist` dans `INSTALLED_APPS`
    - Configurer `SIMPLE_JWT` (ACCESS=15min, REFRESH=7j, ROTATE, BLACKLIST)
    - Configurer `REST_FRAMEWORK` avec `CookieJWTAuthentication`
    - Configurer `CORS_ALLOWED_ORIGINS` et `CORS_ALLOW_CREDENTIALS = True`
    - Ajouter les variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 2. Implémenter les serializers et l'utilitaire cookies backend
  - [ ] 2.1 Créer `api/serializers.py` avec `RegisterSerializer` et `UserSerializer`
    - `RegisterSerializer` : valider password ≥ 8 chars, vérifier concordance avec `confirm_password`
    - `UserSerializer` : exposer `id`, `email`, `first_name`, `last_name`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [ ]* 2.2 Écrire le test de propriété pour `RegisterSerializer` — Property 1
    - **Property 1 : Inscription avec mot de passe court rejetée**
    - Utiliser `hypothesis` pour générer des strings de longueur < 8
    - Vérifier que le serializer retourne une erreur de validation
    - **Validates: Requirements 1.3**

  - [ ]* 2.3 Écrire le test de propriété pour `RegisterSerializer` — Property 2
    - **Property 2 : Mots de passe discordants rejetés**
    - Utiliser `hypothesis` pour générer des paires (password, confirm_password) avec password != confirm_password
    - Vérifier qu'aucun utilisateur n'est créé et qu'une erreur 400 est retournée
    - **Validates: Requirements 1.4**

  - [ ] 2.4 Créer `api/auth_cookies.py` avec `set_auth_cookies` et `delete_auth_cookies`
    - Définir les constantes de durée de vie (15 min, 7 jours)
    - Gérer `httponly=True`, `secure` conditionnel sur `DEBUG`, `samesite='Lax'`
    - _Requirements: 2.5, 2.6, 5.2_

- [ ] 3. Implémenter les vues d'authentification backend
  - [ ] 3.1 Créer `api/authentication.py` avec `CookieJWTAuthentication`
    - Lire l'`access_token` depuis les cookies plutôt que le header `Authorization`
    - _Requirements: 6.4, 8.5_

  - [ ] 3.2 Créer `api/auth_views.py` — `RegisterView` et `LoginView`
    - `RegisterView` : valider via serializer, créer l'utilisateur, générer tokens, poser les cookies, retourner `UserSerializer`
    - `LoginView` : authentifier via `authenticate()`, générer tokens, poser les cookies, retourner `UserSerializer`
    - _Requirements: 1.1, 1.6, 1.7, 2.1, 2.4_

  - [ ]* 3.3 Écrire les tests de propriété pour `RegisterView` et `LoginView` — Properties 3, 4, 5, 6
    - **Property 3 : Inscription réussie → cookies HttpOnly définis**
    - **Property 4 : Connexion réussie → cookies et données utilisateur**
    - **Property 5 : Identifiants invalides → 401 générique**
    - **Property 6 : Format email invalide → 400**
    - Utiliser `hypothesis` + `pytest-django` pour générer des payloads valides et invalides
    - Vérifier les codes HTTP et la présence/absence des cookies dans `response.cookies`
    - **Validates: Requirements 1.6, 1.7, 2.1, 2.2, 2.3, 2.4**

  - [ ] 3.4 Créer dans `api/auth_views.py` — `LogoutView`, `TokenRefreshView`, `MeView`
    - `LogoutView` : blacklister le refresh token, supprimer les cookies, retourner 200
    - `TokenRefreshView` : lire `refresh_token` cookie, émettre nouveau `access_token` cookie
    - `MeView` : retourner `UserSerializer` de l'utilisateur authentifié
    - _Requirements: 4.4, 5.1, 5.2, 5.3, 6.4_

  - [ ]* 3.5 Écrire les tests de propriété pour `LogoutView` et `TokenRefreshView` — Properties 7, 8, 9
    - **Property 7 : Refresh token valide → nouvel access token**
    - **Property 8 : Refresh token blacklisté après déconnexion**
    - **Property 9 : Déconnexion → suppression des cookies**
    - Utiliser `hypothesis` + `pytest-django`
    - **Validates: Requirements 4.4, 5.1, 5.2**

- [ ] 4. Implémenter le flux OAuth Google backend
  - [ ] 4.1 Ajouter `GoogleOAuthInitView` et `GoogleOAuthCallbackView` dans `api/auth_views.py`
    - `GoogleOAuthInitView` : construire l'URL d'autorisation Google et rediriger
    - `GoogleOAuthCallbackView` : échanger le code, vérifier `id_token`, créer/récupérer l'utilisateur, poser les cookies, rediriger vers `/smart`
    - Gérer les erreurs (annulation, token invalide) → redirect `/login?error=google_auth_failed`
    - Installer et utiliser `google-auth` (`pip install google-auth requests`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 4.2 Créer `api/auth_urls.py` et inclure dans `iqra_backend/urls.py`
    - Enregistrer toutes les routes : `register/`, `login/`, `logout/`, `refresh/`, `me/`, `google/`, `google/callback/`
    - Inclure sous le préfixe `api/auth/`
    - _Requirements: 7.1_

- [ ] 5. Checkpoint backend — vérification des tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implémenter les utilitaires frontend
  - [ ] 6.1 Créer `src/utils/axiosInstance.js`
    - Configurer `baseURL` depuis `VITE_API_URL`, `withCredentials: true`
    - Implémenter l'intercepteur réponse : 401 → `POST /api/auth/refresh/` avec gestion de file d'attente
    - Émettre l'événement `auth:logout` en cas d'échec du refresh
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 8.5_

  - [ ]* 6.2 Écrire le test de propriété pour l'intercepteur axios — Property 10 (adaptée)
    - **Property 10 (frontend) : 401 → tentative de refresh avant rejet**
    - Utiliser `vitest` + mock axios pour simuler des réponses 401 et vérifier que l'intercepteur appelle `/api/auth/refresh/`
    - Vérifier que les requêtes en file d'attente sont relancées après un refresh réussi
    - **Validates: Requirements 4.1, 4.2, 4.5**

  - [ ] 6.3 Créer `src/utils/AuthContext.jsx`
    - Implémenter le `AuthProvider` avec les états `user`, `isAuthenticated`, `isLoading`
    - Implémenter `login()`, `signup()`, `logout()`, vérification initiale via `GET /api/auth/me/`
    - Écouter l'événement `auth:logout` pour la déconnexion forcée
    - Exporter le hook `useAuth()`
    - _Requirements: 4.3, 5.4, 5.5, 6.3, 6.4, 6.5_

- [ ] 7. Implémenter les composants React
  - [ ] 7.1 Créer `src/components/ProtectedRoute.jsx`
    - Afficher un spinner pendant `isLoading`
    - Rediriger vers `/login` si `!isAuthenticated`
    - Rendre `children` si `isAuthenticated`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 7.2 Écrire le test de propriété pour `ProtectedRoute` — Property 10
    - **Property 10 : ProtectedRoute redirige les non-authentifiés**
    - Utiliser `vitest` + `@testing-library/react` pour simuler les états `isAuthenticated=false` et `isAuthenticated=true`
    - Vérifier la redirection ou le rendu du composant protégé
    - **Validates: Requirements 6.1, 6.2**

  - [ ] 7.3 Créer `src/pages/Login.jsx`
    - Formulaire avec champs `email` et `password`
    - Redirection vers `/smart` si déjà authentifié
    - Désactiver le bouton pendant soumission, afficher les erreurs backend
    - Lien vers `/signup` et bouton "Continuer avec Google" (`href="/api/auth/google/"`)
    - _Requirements: 2.1, 2.2, 7.2, 7.4, 7.5, 7.6, 7.7_

  - [ ] 7.4 Créer `src/pages/Signup.jsx`
    - Formulaire avec champs `first_name`, `last_name`, `email`, `password`, `confirm_password`
    - Redirection vers `/smart` si déjà authentifié
    - Désactiver le bouton pendant soumission, afficher les erreurs backend par champ
    - Bouton "Continuer avec Google"
    - _Requirements: 1.1, 1.3, 1.4, 7.2, 7.3, 7.5, 7.6, 7.7_

- [ ] 8. Intégrer dans `App.jsx` et câbler le routage
  - [ ] 8.1 Modifier `src/App.jsx` pour envelopper avec `AuthProvider` et utiliser `ProtectedRoute`
    - Importer et intégrer `AuthProvider` autour des `Routes`
    - Protéger la route `/smart` avec `ProtectedRoute`
    - Ajouter les routes `/login` et `/signup`
    - _Requirements: 6.1, 6.2, 7.1_

- [ ] 9. Checkpoint final — vérification complète
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les propriétés 1–9 sont testées côté backend avec `hypothesis` + `pytest-django`
- La propriété 10 est testée côté frontend avec `vitest` + `@testing-library/react`
- L'OAuth Google nécessite les variables d'environnement `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Appliquer les migrations **avant** de lancer les tests backend

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.4", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "4.1", "6.1"] },
    { "id": 5, "tasks": ["4.2", "6.3"] },
    { "id": 6, "tasks": ["6.2", "7.1", "7.3", "7.4"] },
    { "id": 7, "tasks": ["7.2", "8.1"] }
  ]
}
```
