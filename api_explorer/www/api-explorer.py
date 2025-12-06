import frappe
from api_explorer.core.auth.manager import AuthManager

def get_context(context):
    try:
        if frappe.session.user == "Guest":
            frappe.redirect_to_login()
        
        user_context = AuthManager.get_current_user_context()
        
        if not user_context.get("authenticated"):
            frappe.redirect_to_login()
        
        if user_context.get("user_type") == "Website User":
            frappe.throw("You are not permitted to access this page.", frappe.PermissionError)
        
        if not user_context.get("permissions", {}).get("api_explorer_access"):
            error_msg = user_context.get("permissions", {}).get("reason", "Insufficient permissions to access API Explorer")
            frappe.throw(error_msg, frappe.PermissionError)
        
        context.no_cache = 1
        context.show_sidebar = False
        context.title = "API Explorer"
        context.user_context = user_context
        context.csrf_token = frappe.sessions.get_csrf_token()
        
        return context
    except Exception as e:
        frappe.log_error(f"API Explorer context error: {str(e)}")
        frappe.redirect_to_login()