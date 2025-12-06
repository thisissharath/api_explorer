import frappe

@frappe.whitelist(allow_guest=True)
def get_csrf_token():
    """Get CSRF token for API Explorer"""
    if frappe.session.user == "Guest":
        return ""
    
    try:
        token = frappe.sessions.get_csrf_token()
        return token
    except Exception as e:
        frappe.log_error(f"CSRF token error: {str(e)}")
        return ""