import frappe
from functools import lru_cache
from api_explorer.core.auth.manager import AuthManager
from api_explorer.core.config.manager import ConfigManager
from api_explorer.core.scanner.file_scanner import FileScanner
from api_explorer.core.scanner.resource_scanner import ResourceScanner
from api_explorer.core.scanner.scheduler_scanner import SchedulerScanner

class APIScanner:
    def __init__(self):
        self.settings = ConfigManager.get_settings() or {}
        self.file_scanner = FileScanner(self.settings)
        self.resource_scanner = ResourceScanner(self.settings)
        self.scheduler_scanner = SchedulerScanner(self.settings)
    
    def scan_all_apis(self, user_context=None):
        try:
            if not user_context:
                user_context = AuthManager.get_current_user_context()
            
            if not user_context.get("authenticated"):
                raise frappe.AuthenticationError("Authentication required")
            
            cache_key = f"apis_all_{frappe.session.user}"
            cached = frappe.cache().get_value(cache_key)
            if cached:
                return cached
            
            apps_data = {}
            max_apis = self.settings.get('max_apis_per_app', 1000)
            excluded_apps = [app.get('app_name') for app in self.settings.get('excluded_apps', []) if app.get('app_name')]
            
            installed_apps = frappe.get_installed_apps()
            for app in installed_apps:
                if app not in excluded_apps:
                    app_data = self._scan_app_apis(app, max_apis)
                    if app_data:
                        apps_data[app] = app_data
            
            result = {"apps": apps_data, "user_context": user_context, "settings": self.settings}
            frappe.cache().set_value(cache_key, result, expires_in_sec=300)
            
            return result
        except Exception as e:
            frappe.log_error(f"API scan error: {str(e)}")
            return {"apps": {}, "user_context": user_context or {}, "settings": self.settings}
    
    def _scan_app_apis(self, app, max_apis):
        app_data = {}
        excluded_methods = [method.get('method_path') for method in self.settings.get('excluded_api_methods', []) if method.get('method_path')]
        
        if self.settings.get('show_public_apis', 1):
            apis = self.file_scanner.get_public_apis(app, max_apis)
            app_data["public"] = [api for api in apis if api.get('path') not in excluded_methods]
        
        if self.settings.get('show_internal_apis', 1):
            apis = self.file_scanner.get_internal_apis(app, max_apis)
            app_data["internal"] = [api for api in apis if api.get('path') not in excluded_methods]
        
        if self.settings.get('show_resource_apis', 0):
            apis = self.resource_scanner.get_resource_apis(app, max_apis)
            app_data["resource"] = [api for api in apis if api.get('path') not in excluded_methods]
        
        if self.settings.get('show_scheduler_jobs', 0):
            apis = self.scheduler_scanner.get_scheduler_apis(app, max_apis)
            app_data["schedulers"] = [api for api in apis if api.get('path') not in excluded_methods]
        
        return app_data if any(app_data.values()) else None

@frappe.whitelist(xss_safe=False)
def scan_apis():
    try:
        scanner = APIScanner()
        return scanner.scan_all_apis()
    except Exception as e:
        frappe.log_error(f"Scan APIs error: {str(e)}")
        return {"apps": {}, "user_context": {}, "settings": {}}

@frappe.whitelist(methods=['POST'], xss_safe=False)
def clear_cache():
    """Clear all API Explorer caches for current user"""
    try:
        user = frappe.session.user
        cleared_items = []
        
        # Clear API scan cache
        api_cache_key = f"apis_all_{user}"
        if frappe.cache().delete_value(api_cache_key):
            cleared_items.append("API scan cache")
        
        # Clear settings cache (global)
        if frappe.cache().delete_value("api_explorer_settings"):
            cleared_items.append("Settings cache")
        
        # Clear pagination memory cache
        from api_explorer.api.pagination import _cache
        pagination_keys = [key for key in list(_cache.keys()) if user in key]
        for key in pagination_keys:
            _cache.pop(key, None)
        if pagination_keys:
            cleared_items.append(f"Pagination cache ({len(pagination_keys)} keys)")
        
        # Clear all user-specific API Explorer caches
        try:
            pattern_keys = frappe.cache().get_keys(f"*{user}*api_explorer*")
            for key in pattern_keys:
                frappe.cache().delete_value(key)
            if pattern_keys:
                cleared_items.append(f"User caches ({len(pattern_keys)} keys)")
        except:
            pass
        
        # Clear file scanner cache
        try:
            from api_explorer.core.scanner.file_scanner import FileScanner
            if hasattr(FileScanner, '_function_cache'):
                FileScanner._function_cache.clear()
                cleared_items.append("File scanner cache")
        except:
            pass
        
        return {
            "success": True, 
            "message": f"Cleared: {', '.join(cleared_items) if cleared_items else 'No caches found'}"
        }
    except Exception as e:
        frappe.log_error(f"Cache clear error: {str(e)}", "API Explorer Cache")
        return {"success": False, "message": str(e)}