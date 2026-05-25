import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "success": False,
            "error": {
                "code": _code(response.status_code),
                "message": _msg(response.data),
                "details": response.data,
            },
        }
    else:
        logger.exception("Unhandled exception: %s", exc)
        response = Response(
            {"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred.", "details": {}}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return response


def _code(s):
    return {400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 429: "TOO_MANY_REQUESTS", 500: "INTERNAL_SERVER_ERROR"}.get(s, "ERROR")


def _msg(data):
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        for k, v in data.items():
            return f"{k}: {v[0]}" if isinstance(v, list) else str(v)
    return str(data)
