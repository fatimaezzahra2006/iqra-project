# Requirements Document

## Introduction

Cette feature ajoute un système d'authentification complet à la plateforme éducative marocaine IQRA. Elle couvre l'inscription, la connexion par email/mot de passe, la connexion via OAuth Google, la déconnexion sécurisée, la gestion des tokens JWT stockés dans des cookies HttpOnly, et la protection de la route `/smart` côté React. Le backend s'appuie sur Django 5.2, DRF et `djangorestframework_simplejwt`. Le frontend utilise React 19, `react-router-dom` v7 et `axios`.

---

## Glossaire

- **AuthService** : Le module backend Django/DRF responsable des opérations d'authentification (inscription, connexion, déconnexion, rafraîchissement de token, OAuth).
- **TokenStore** : Le mécanisme de stockage côté client qui conserve les tokens JWT dans des cookies HttpOnly via les réponses HTTP du backend.
- **AuthContext** : Le contexte React qui expose l'état d'authentification (`isAuthenticated`, `user`) et les actions associées à tous les composants de l'application.
- **ProtectedRoute** : Le composant React qui vérifie l'état d'authentification et redirige l'utilisateur non authentifié vers `/login`.
- **User** : L'utilisateur de la plateforme IQRA, identifié par son adresse email et ses informations de profil de base (prénom, nom).
- **AccessToken** : Token JWT à courte durée de vie (15 minutes) utilisé pour authentifier les requêtes API.
- **RefreshToken** : Token JWT à longue durée de vie (7 jours) utilisé pour obtenir un nouvel AccessToken sans redemander les identifiants.

---

## Requirements

### Requirement 1 — Inscription par email et mot de passe

**User Story :** En tant que visiteur, je veux créer un compte avec mon email et mon mot de passe, afin d'accéder aux fonctionnalités protégées de la plateforme IQRA.

#### Acceptance Criteria

1. WHEN un visiteur soumet le formulaire d'inscription avec un email valide, un mot de passe et une confirmation de mot de passe, THE AuthService SHALL créer un compte utilisateur dans la base de données et retourner une réponse HTTP 201.
2. WHEN un visiteur soumet un email déjà associé à un compte existant, THE AuthService SHALL retourner une réponse HTTP 400 avec un message d'erreur indiquant que l'email est déjà utilisé.
3. WHEN un visiteur soumet un mot de passe inférieur à 8 caractères, THE AuthService SHALL retourner une réponse HTTP 400 avec un message d'erreur de validation.
4. WHEN un visiteur soumet un mot de passe et une confirmation de mot de passe qui ne correspondent pas, THE AuthService SHALL retourner une réponse HTTP 400 avec un message d'erreur indiquant la non-concordance.
5. THE AuthService SHALL hacher le mot de passe avec l'algorithme par défaut de Django avant de le stocker en base de données.
6. WHEN l'inscription réussit, THE AuthService SHALL définir un cookie HttpOnly nommé `access_token` contenant l'AccessToken et un cookie HttpOnly nommé `refresh_token` contenant le RefreshToken dans la réponse HTTP.
7. WHEN l'inscription réussit, THE AuthService SHALL retourner les informations de base de l'utilisateur (id, email, prénom, nom) dans le corps de la réponse HTTP.

---

### Requirement 2 — Connexion par email et mot de passe

**User Story :** En tant qu'utilisateur inscrit, je veux me connecter avec mon email et mon mot de passe, afin d'accéder à mon espace personnel sur la plateforme IQRA.

#### Acceptance Criteria

1. WHEN un utilisateur soumet le formulaire de connexion avec un email et un mot de passe valides correspondant à un compte existant, THE AuthService SHALL retourner une réponse HTTP 200 avec les cookies `access_token` et `refresh_token` HttpOnly définis.
2. WHEN un utilisateur soumet un email ou un mot de passe incorrect, THE AuthService SHALL retourner une réponse HTTP 401 avec un message d'erreur générique sans préciser lequel des deux champs est incorrect.
3. WHEN un utilisateur soumet le formulaire de connexion avec un email dont le format est invalide, THE AuthService SHALL retourner une réponse HTTP 400 avec un message d'erreur de validation.
4. WHEN la connexion réussit, THE AuthService SHALL retourner les informations de base de l'utilisateur (id, email, prénom, nom) dans le corps de la réponse HTTP.
5. THE TokenStore SHALL stocker l'AccessToken dans un cookie HttpOnly avec l'attribut `Secure` activé en production et l'attribut `SameSite=Lax`.
6. THE TokenStore SHALL stocker le RefreshToken dans un cookie HttpOnly avec l'attribut `Secure` activé en production et l'attribut `SameSite=Lax`.

---

### Requirement 3 — Connexion via OAuth Google

**User Story :** En tant que visiteur, je veux me connecter avec mon compte Google, afin de m'inscrire ou me connecter rapidement sans créer de mot de passe.

#### Acceptance Criteria

1. WHEN un visiteur clique sur le bouton "Connexion avec Google", THE AuthService SHALL initier le flux OAuth 2.0 de Google en redirigeant vers l'URL d'autorisation Google.
2. WHEN Google retourne un code d'autorisation valide après le consentement de l'utilisateur, THE AuthService SHALL échanger ce code contre un token d'identité Google, valider le token, et créer ou récupérer le compte utilisateur IQRA correspondant.
3. WHEN un compte IQRA est créé via OAuth Google pour la première fois, THE AuthService SHALL utiliser l'email Google comme identifiant unique de l'utilisateur et stocker le prénom et le nom fournis par Google.
4. WHEN l'authentification OAuth Google réussit, THE AuthService SHALL définir les cookies HttpOnly `access_token` et `refresh_token` et rediriger le navigateur vers `/smart`.
5. IF Google retourne une erreur ou que l'utilisateur annule le flux OAuth, THEN THE AuthService SHALL rediriger le navigateur vers `/login` avec un paramètre d'erreur indiquant l'échec de l'authentification Google.

---

### Requirement 4 — Rafraîchissement automatique du token

**User Story :** En tant qu'utilisateur connecté, je veux que ma session soit maintenue automatiquement, afin de ne pas être déconnecté en pleine utilisation de la plateforme.

#### Acceptance Criteria

1. WHEN une requête API authentifiée échoue avec une réponse HTTP 401, THE AuthContext SHALL tenter automatiquement de rafraîchir l'AccessToken en appelant l'endpoint de rafraîchissement du backend.
2. WHEN le rafraîchissement réussit, THE AuthContext SHALL relancer la requête API originale avec le nouvel AccessToken et retourner le résultat au composant demandeur.
3. WHEN le rafraîchissement échoue parce que le RefreshToken est expiré ou invalide, THE AuthContext SHALL supprimer les cookies d'authentification, mettre à jour l'état `isAuthenticated` à `false`, et rediriger l'utilisateur vers `/login`.
4. THE AuthService SHALL exposer un endpoint `POST /api/auth/refresh/` qui accepte le RefreshToken depuis le cookie HttpOnly et retourne un nouvel AccessToken dans un nouveau cookie HttpOnly.
5. WHILE un rafraîchissement de token est en cours, THE AuthContext SHALL mettre en file d'attente les autres requêtes authentifiées et les exécuter après la résolution du rafraîchissement.

---

### Requirement 5 — Déconnexion

**User Story :** En tant qu'utilisateur connecté, je veux pouvoir me déconnecter, afin de sécuriser mon compte lorsque je quitte la plateforme.

#### Acceptance Criteria

1. WHEN un utilisateur authentifié appelle l'endpoint de déconnexion, THE AuthService SHALL invalider le RefreshToken côté serveur en l'ajoutant à une liste noire (blacklist).
2. WHEN la déconnexion est traitée, THE AuthService SHALL supprimer les cookies `access_token` et `refresh_token` en les écrasant avec des cookies expirés dans la réponse HTTP.
3. WHEN la déconnexion réussit, THE AuthService SHALL retourner une réponse HTTP 200.
4. WHEN la déconnexion réussit côté client, THE AuthContext SHALL mettre à jour l'état `isAuthenticated` à `false` et effacer les données utilisateur en mémoire.
5. WHEN la déconnexion réussit côté client, THE AuthContext SHALL rediriger l'utilisateur vers la page d'accueil (`/`).

---

### Requirement 6 — Protection de la route `/smart`

**User Story :** En tant que visiteur non authentifié, je veux être redirigé vers la page de connexion si j'essaie d'accéder à une page protégée, afin que le contenu éducatif premium soit réservé aux utilisateurs connectés.

#### Acceptance Criteria

1. WHEN un visiteur non authentifié tente d'accéder à la route `/smart`, THE ProtectedRoute SHALL rediriger le visiteur vers `/login`.
2. WHEN un utilisateur authentifié accède à la route `/smart`, THE ProtectedRoute SHALL afficher le composant `SmartModule` sans redirection.
3. WHILE la vérification de l'état d'authentification est en cours au chargement initial de l'application, THE ProtectedRoute SHALL afficher un indicateur de chargement plutôt que de rediriger immédiatement.
4. THE AuthContext SHALL vérifier l'état d'authentification au montage de l'application en appelant l'endpoint `GET /api/auth/me/` qui retourne les informations de l'utilisateur si le cookie `access_token` est valide.
5. IF l'endpoint `GET /api/auth/me/` retourne une réponse HTTP 401 au chargement initial, THEN THE AuthContext SHALL tenter un rafraîchissement du token avant de définir `isAuthenticated` à `false`.

---

### Requirement 7 — Pages Login et Signup

**User Story :** En tant que visiteur, je veux des pages de connexion et d'inscription accessibles et claires, afin de créer ou accéder facilement à mon compte IQRA.

#### Acceptance Criteria

1. THE AuthService SHALL exposer les routes frontend `/login` et `/signup` qui affichent respectivement les formulaires de connexion et d'inscription.
2. WHEN un utilisateur déjà authentifié accède à `/login` ou `/signup`, THE ProtectedRoute SHALL rediriger l'utilisateur vers `/smart`.
3. THE formulaire d'inscription SHALL inclure les champs : prénom, nom, email, mot de passe, et confirmation du mot de passe.
4. THE formulaire de connexion SHALL inclure les champs : email et mot de passe.
5. WHEN un formulaire est soumis, THE formulaire SHALL désactiver le bouton de soumission pendant le traitement pour éviter les soumissions multiples.
6. WHEN le backend retourne une erreur de validation, THE formulaire SHALL afficher les messages d'erreur correspondants à côté des champs concernés.
7. WHERE la connexion Google est disponible, THE formulaire de connexion et d'inscription SHALL afficher un bouton "Continuer avec Google" permettant d'initier le flux OAuth.

---

### Requirement 8 — Sécurité et configuration CORS/CSRF

**User Story :** En tant qu'administrateur de la plateforme, je veux que le système d'authentification respecte les bonnes pratiques de sécurité web, afin de protéger les données des utilisateurs IQRA.

#### Acceptance Criteria

1. THE AuthService SHALL configurer `SIMPLE_JWT` dans Django settings pour définir une durée de vie de l'AccessToken de 15 minutes et une durée de vie du RefreshToken de 7 jours.
2. THE AuthService SHALL activer `TOKEN_BLACKLIST` dans `INSTALLED_APPS` Django pour permettre l'invalidation des RefreshTokens à la déconnexion.
3. THE AuthService SHALL configurer `CORS_ALLOWED_ORIGINS` dans Django settings pour n'autoriser que les origines explicitement approuvées (frontend en développement et en production).
4. THE AuthService SHALL configurer `CORS_ALLOW_CREDENTIALS = True` dans Django settings pour permettre l'envoi des cookies avec les requêtes cross-origin.
5. THE AuthService SHALL utiliser `withCredentials: true` dans toutes les requêtes axios du frontend afin que les cookies HttpOnly soient transmis automatiquement.
6. IF une requête provient d'une origine non listée dans `CORS_ALLOWED_ORIGINS`, THEN THE AuthService SHALL retourner une réponse HTTP 403.
