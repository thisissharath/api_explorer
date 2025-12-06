import frappe
from frappe import _

class FavoritesManager:
    @staticmethod
    def get_user_favorites(user=None):
        if not user:
            user = frappe.session.user
        
        favorites = frappe.get_all("API Explorer User Favorite", 
            filters={"user": user}, 
            fields=["api_name", "api_path", "creation"],
            order_by="creation desc"
        )
        return favorites
    
    @staticmethod
    def add_favorite(api_name, api_path, user=None):
        if not user:
            user = frappe.session.user
        
        if not frappe.db.exists("API Explorer User Favorite", {"user": user, "api_path": api_path}):
            doc = frappe.get_doc({
                "doctype": "API Explorer User Favorite",
                "user": user,
                "api_name": api_name,
                "api_path": api_path,
                "owner": user
            })
            doc.insert(ignore_permissions=True)
            return {"success": True, "message": "Added to favorites"}
        return {"success": False, "message": "Already in favorites"}
    
    @staticmethod
    def remove_favorite(api_path, user=None):
        if not user:
            user = frappe.session.user
        
        name = frappe.db.get_value("API Explorer User Favorite", {"user": user, "api_path": api_path})
        if name:
            frappe.delete_doc("API Explorer User Favorite", name, ignore_permissions=True)
            return {"success": True, "message": "Removed from favorites"}
        return {"success": False, "message": "Not found in favorites"}

@frappe.whitelist(methods=['GET'])
def get_favorites():
    return FavoritesManager.get_user_favorites()

@frappe.whitelist(methods=['POST'])
def add_favorite():
    try:
        api_name = frappe.form_dict.get('api_name')
        api_path = frappe.form_dict.get('api_path')
        if not api_name or not api_path:
            frappe.throw("API name and path are required")
        return FavoritesManager.add_favorite(api_name, api_path)
    except Exception as e:
        frappe.log_error(f"Add favorite error: {str(e)}", "API Explorer Favorites")
        return {"success": False, "message": str(e)}

@frappe.whitelist(methods=['POST'])
def remove_favorite():
    try:
        api_path = frappe.form_dict.get('api_path')
        if not api_path:
            frappe.throw("API path is required")
        return FavoritesManager.remove_favorite(api_path)
    except Exception as e:
        frappe.log_error(f"Remove favorite error: {str(e)}", "API Explorer Favorites")
        return {"success": False, "message": str(e)}