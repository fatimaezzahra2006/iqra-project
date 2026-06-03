from django.conf import settings

# Durée de vie des tokens (en secondes)
ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60          # 15 minutes
REFRESH_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60  # 7 jours


def set_auth_cookies(response, access_token, refresh_token):
    """Définit les cookies HttpOnly pour access et refresh tokens.

    - httponly=True  : inaccessible au JavaScript côté client
    - secure=True    : uniquement en HTTPS (désactivé si DEBUG=True)
    - samesite='Lax' : protection CSRF partielle, compatible avec les redirections GET
    """
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
    """Supprime les cookies d'authentification.

    Utilise delete_cookie() qui écrase les cookies avec une date d'expiration passée.
    """
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
