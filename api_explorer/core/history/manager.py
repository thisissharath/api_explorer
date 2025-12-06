import frappe
import json
from datetime import datetime

class HistoryManager:
    @staticmethod
    def get_user_sessions(user=None, limit=50):
        if not user:
            user = frappe.session.user
        
        sessions = frappe.get_all("API Explorer User History",
            filters={"user": user},
            fields=["session_id", "login_time", "user_agent", "creation"],
            order_by="login_time desc",
            limit=limit
        )
        return sessions
    
    @staticmethod
    def track_login(user=None):
        try:
            from api_explorer.core.config.manager import ConfigManager
            
            settings = ConfigManager.get_settings()
            if not settings.get('maintain_user_history', 0):
                return {"success": True, "message": "History tracking disabled"}
            
            if not user:
                user = frappe.session.user
            
            session_id = frappe.session.sid
            user_agent = frappe.get_request_header('User-Agent') if frappe.request else None
            
            # Check if session already exists
            existing = frappe.db.exists("API Explorer User History", {"session_id": session_id, "user": user})
            if existing:
                return {"success": True, "message": "Session already tracked"}
            
            doc = frappe.get_doc({
                "doctype": "API Explorer User History",
                "user": user,
                "session_id": session_id,
                "login_time": frappe.utils.now(),
                "user_agent": user_agent
            })
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            
            return {"success": True}
        except Exception as e:
            frappe.log_error(f"Track login error: {str(e)}", "API Explorer History")
            return {"success": False, "message": str(e)}
    
    @staticmethod
    def track_logout(user=None):
        # Logout tracking removed - not needed
        return {"success": True}
    
    @staticmethod
    def clear_history(user=None):
        if not user:
            user = frappe.session.user
        
        records = frappe.get_all("API Explorer User History", filters={"user": user}, fields=["name"])
        for record in records:
            frappe.delete_doc("API Explorer User History", record.name, ignore_permissions=True)
        
        return {"success": True, "message": "History cleared"}

@frappe.whitelist(methods=['GET'], xss_safe=False)
def get_user_sessions():
    limit = int(frappe.form_dict.get('limit', 50))
    return HistoryManager.get_user_sessions(limit=limit)

@frappe.whitelist(methods=['POST'], xss_safe=False)
def track_login():
    return HistoryManager.track_login()

@frappe.whitelist(methods=['POST'], xss_safe=False)
def track_logout():
    return HistoryManager.track_logout()