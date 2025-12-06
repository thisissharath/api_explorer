import frappe

# Global cache
_cache = {}

@frappe.whitelist()
def get_paginated_apis(app_name, category, page=1, search_query=""):
    try:
        page = max(1, int(page or 1))
        cache_key = f"apis_all_{frappe.session.user}_{app_name}_{category}"
        
        if cache_key in _cache:
            apis, settings = _cache[cache_key]
        else:
            from api_explorer.core.config.manager import ConfigManager
            from api_explorer.core.scanner.manager import APIScanner
            
            settings = ConfigManager.get_settings()
            scanner = APIScanner()
            result = scanner.scan_all_apis()
            
            try:
                apis = result['apps'][app_name][category]
            except KeyError:
                apis = []
            
            _cache[cache_key] = (apis, settings)
            frappe.enqueue('api_explorer.api.pagination.clear_cache', cache_key=cache_key, queue='short', timeout=300)
        
        if search_query:
            search_lower = search_query.lower()
            apis = [api for api in apis if search_lower in api.get('name', '').lower() or search_lower in api.get('path', '').lower()]
        
        total_items = len(apis)
        page_size = settings.get('items_per_page', 20)
        pagination_enabled = settings.get('enable_pagination', 1)
        
        if not total_items:
            return {'apis': [], 'pagination': {'current_page': page, 'page_size': page_size, 'total_items': 0, 'total_pages': 0, 'has_next': False, 'has_prev': False}, 'settings': {'enable_pagination': pagination_enabled}}
        
        if not pagination_enabled:
            return {'apis': apis, 'pagination': {'current_page': 1, 'page_size': total_items, 'total_items': total_items, 'total_pages': 1, 'has_next': False, 'has_prev': False}, 'settings': {'enable_pagination': False}}
        
        total_pages = -(-total_items // page_size)
        start_idx = (page - 1) * page_size
        
        return {
            'apis': apis[start_idx:start_idx + page_size],
            'pagination': {
                'current_page': page,
                'page_size': page_size,
                'total_items': total_items,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            },
            'settings': {'enable_pagination': True}
        }
    except Exception as e:
        frappe.log_error(f"Pagination error: {str(e)}")
        return {'apis': [], 'pagination': {'current_page': 1, 'page_size': 20, 'total_items': 0, 'total_pages': 0, 'has_next': False, 'has_prev': False}, 'settings': {'enable_pagination': True}}

def clear_cache(cache_key):
    _cache.pop(cache_key, None)