import frappe

class AuthManager:
    @staticmethod
    def get_current_user_context():
        try:
            if frappe.session.user == "Guest":
                return {"authenticated": False, "user": None, "roles": [], "permissions": {}}
            
            user = frappe.session.user
            roles = frappe.get_roles(user)
            user_doc = frappe.get_doc("User", user)
            
            return {
                "authenticated": True,
                "user": user,
                "user_type": user_doc.user_type,
                "roles": roles,
                "permissions": AuthManager._get_user_permissions(user, roles),
                "session_id": frappe.session.sid,
                "csrf_token": frappe.sessions.get_csrf_token() if hasattr(frappe.sessions, 'get_csrf_token') else None
            }
        except Exception as e:
            frappe.log_error(f"Auth context error: {str(e)}")
            return {"authenticated": False, "user": None, "roles": [], "permissions": {}}
    
    @staticmethod
    def _get_user_permissions(user, roles):
        from api_explorer.core.config.manager import ConfigManager
        settings = ConfigManager.get_settings()
        
        if not settings.get('enabled'):
            return {"api_explorer_access": False, "reason": "API Explorer is disabled"}
        
        # Get allowed roles from settings - no default fallback
        allowed_roles = [r.get('role') for r in settings.get('allowed_user_roles', []) if r.get('role')]
        
        # If no roles configured, deny access to everyone including Admin
        if not allowed_roles:
            return {"api_explorer_access": False, "reason": "No roles configured for API Explorer access"}
        
        # Check if user has any allowed role
        has_access = any(role in allowed_roles for role in roles)
        if not has_access:
            return {"api_explorer_access": False, "reason": f"Access denied. Required roles: {', '.join(allowed_roles)}"}
        
        return {
            "api_explorer_access": True,
            "can_test_apis": not settings.get('disable_api_testing'),
            "can_view_logs": True,
            "max_apis_per_app": settings.get('max_apis_per_app', 50)
        }
    
    @staticmethod
    def validate_api_access(api_path, user_context=None):
        try:
            if not user_context:
                user_context = AuthManager.get_current_user_context()
            
            if not user_context.get("authenticated"):
                raise frappe.AuthenticationError("Authentication required")
            
            if not user_context.get("permissions", {}).get("api_explorer_access"):
                raise frappe.PermissionError(user_context.get("permissions", {}).get("reason", "Access denied"))
            
            return True
        except Exception as e:
            frappe.log_error(f"API access validation error: {str(e)}")
            raise

@frappe.whitelist(allow_guest=True)
def get_current_user_context():
    try:
        return AuthManager.get_current_user_context()
    except Exception as e:
        frappe.log_error(f"Get user context error: {str(e)}")
        return {"authenticated": False, "user": None, "roles": [], "permissions": {}}