import frappe

class ConfigManager:
    @staticmethod
    def get_settings():
        # Ultra-fast cache
        cached = frappe.cache().get_value('api_explorer_settings')
        if cached:
            return cached
        
        try:
            if frappe.db.exists('DocType', 'API Explorer Settings'):
                settings = frappe.get_single('API Explorer Settings')
                result = settings.as_dict()
                
                # Convert child tables to list of dicts
                result['allowed_user_roles'] = [{'role': r.role} for r in settings.get('allowed_user_roles', [])]
                result['excluded_apps'] = [{'app_name': r.app_name} for r in settings.get('excluded_apps', [])]
                result['excluded_api_methods'] = [{'method_path': r.method_path} for r in settings.get('excluded_api_methods', [])]
            else:
                result = ConfigManager.get_default_settings()
        except Exception:
            result = ConfigManager.get_default_settings()
        
        # Cache for 10 minutes
        frappe.cache().set_value('api_explorer_settings', result, expires_in_sec=600)
        return result
    
    @staticmethod
    def get_default_settings():
        return {
            'title': 'API Explorer Settings',
            'enabled': 1,
            'dark_mode': 0,
            'font_family': 'Poppins',
            'custom_page_title': 'API Explorer',
            'custom_page_description': 'Manage all methods at one place',
            'show_public_apis': 1,
            'show_internal_apis': 1,
            'show_resource_apis': 1,
            'show_scheduler_jobs': 1,
            'enable_search': 1,
            'enable_pagination': 1,
            'items_per_page': 40,
            'disable_api_testing': 0,
            'log_all_api_calls': 0,
            'maintain_user_history': 1,
            'include_tokens_in_code': 1,
            'show_formatted_response': 0,
            'max_apis_per_app': 1000,
            'allowed_user_roles': [{'role': 'Administrator'}],
            'excluded_apps': [],
            'excluded_api_methods': []
        }