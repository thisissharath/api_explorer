import frappe

class LogsManager:
    @staticmethod
    def is_logging_enabled():
        """Check if logging is enabled in settings"""
        from api_explorer.core.config.manager import ConfigManager
        settings = ConfigManager.get_settings()
        return bool(settings.get('log_all_api_calls', 0))
    
    @staticmethod
    def log_api_call(api_path, parameters, response, status_code, success, response_time, user=None):
        """Log API call if logging is enabled"""
        if not LogsManager.is_logging_enabled():
            return
        
        try:
            if not user:
                user = frappe.session.user
            
            app_name = api_path.split('.')[0] if '.' in api_path else 'Unknown'
            method_name = api_path.split('.')[-1] if '.' in api_path else api_path
            
            # Convert response to string if it's too large or complex
            import json
            try:
                response_str = json.dumps(response) if response else ''
            except:
                response_str = str(response) if response else ''
            
            if len(response_str) > 5000:  # Limit response size
                response_str = response_str[:5000] + '... (truncated)'
            
            # Convert parameters to string
            try:
                params_str = json.dumps(parameters) if parameters else ''
            except:
                params_str = str(parameters) if parameters else ''
            
            log_doc = frappe.get_doc({
                "doctype": "API Execution Logs",
                "user": user,
                "app_name": app_name,
                "method_name": method_name,
                "api_path": api_path,
                "parameters": params_str,
                "response": response_str,
                "status_code": status_code,
                "success": success,
                "response_time": response_time
            })
            
            log_doc.insert(ignore_permissions=True)
            frappe.db.commit()
            
        except Exception as e:
            frappe.log_error(f"API Explorer logging failed: {str(e)}", "API Explorer Logs")

@frappe.whitelist()
def get_logs(page=1, limit=50, user=None, app_name=None):
    """Get API logs with pagination and filters"""
    if not LogsManager.is_logging_enabled():
        return {"logs": [], "message": "Logging is disabled"}
    
    filters = {}
    if user:
        filters["user"] = user
    if app_name:
        filters["app_name"] = app_name
    
    page = max(1, int(page))
    limit = min(100, max(1, int(limit)))
    start = (page - 1) * limit
    
    logs = frappe.get_all("API Execution Logs",
        filters=filters,
        fields=["name", "timestamp", "user", "app_name", "method_name", "api_path", "status_code", "success", "response_time"],
        order_by="timestamp desc",
        start=start,
        limit=limit
    )
    
    total = frappe.db.count("API Execution Logs", filters)
    
    return {
        "logs": logs,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "has_next": start + limit < total,
            "has_prev": page > 1
        }
    }

@frappe.whitelist()
def get_logging_status():
    """Get current logging status"""
    return {"enabled": LogsManager.is_logging_enabled()}

@frappe.whitelist()
def clear_logs(days=30):
    if "System Manager" not in frappe.get_roles():
        frappe.throw("Insufficient permissions")
    
    from frappe.utils import add_days, now_datetime
    cutoff_date = add_days(now_datetime(), -int(days))
    
    old_logs = frappe.get_all("API Execution Logs", filters={"timestamp": ["<", cutoff_date]}, fields=["name"])
    
    for log in old_logs:
        frappe.delete_doc("API Execution Logs", log.name, ignore_permissions=True)
    
    return {"message": f"Cleared {len(old_logs)} logs"}