from rest_framework import permissions


class IsAdminUserPermission(permissions.BasePermission):
    """
    Permissão DRF que verifica se o usuário possui perfil de ADMIN ou ADMIN MASTER.
    Encapsulada na propriedade user.is_admin_user.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin_user
        )


class IsAdminMasterUserPermission(permissions.BasePermission):
    """
    Permissão DRF que verifica se o usuário possui perfil de ADMIN MASTER.
    Encapsulada na propriedade user.is_admin_master_user.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin_master_user
        )
