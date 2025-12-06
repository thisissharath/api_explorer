import frappe

@frappe.whitelist(allow_guest=True)
def get_settings():
    try:
        from api_explorer.core.config.manager import ConfigManager
        return ConfigManager.get_settings()
    except Exception as e:
        frappe.log_error(f"Get settings error: {str(e)}")
        return ConfigManager.get_default_settings()