"""
JWT Authentication middleware for Django Channels WebSocket connections.
Extracts JWT from query string: ws://host/ws/path/?token=<jwt>
"""
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    """Validate JWT and return the user."""
    try:
        token = AccessToken(token_str)
        user_id = token["user_id"]
        return User.objects.get(id=user_id)
    except Exception as e:
        logger.debug("WebSocket JWT auth failed: %s", e)
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Extracts JWT from the WebSocket connection query string and
    attaches the authenticated user to the scope.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if token_list:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
