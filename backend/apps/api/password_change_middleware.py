from django.http import JsonResponse


class PasswordChangeRequiredMiddleware:
    """Restringe a API enquanto o usuario precisa definir uma nova senha."""

    ALLOWED_PATHS = {
        "/api/auth/csrf",
        "/api/auth/login",
        "/api/auth/me",
        "/api/auth/logout",
        "/api/auth/change-password",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.path.startswith("/api/"):
            return None

        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return None
        if not getattr(user, "precisa_trocar_senha", False):
            return None

        if request.path.rstrip("/") in self.ALLOWED_PATHS:
            return None

        return JsonResponse(
            {
                "detail": "Troque sua senha antes de continuar.",
                "code": "password_change_required",
            },
            status=403,
        )
