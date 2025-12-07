import frappe

class ResourceScanner:
    def __init__(self, settings):
        self.settings = settings
    
    def get_resource_apis(self, app, max_apis):
        apis = []
        try:
            doctypes = frappe.get_all("DocType", 
                filters={"module": ["like", f"%{app}%"]}, 
                fields=["name"], 
                limit=max_apis//4
            )
            
            for doctype in doctypes:
                dt_name = doctype.name
                apis.extend([
                    {
                        "name": f"List {dt_name}",
                        "path": f"frappe.client.get_list::{dt_name}",
                        "display_path": f"/api/resource/{dt_name}",
                        "location": f"/api/resource/{dt_name}",
                        "docstring": f"Get list of {dt_name} records",
                        "parameters": [],
                        "resource_api": True,
                        "doctype": dt_name
                    },
                    {
                        "name": f"Get {dt_name}",
                        "path": f"frappe.client.get::{dt_name}",
                        "display_path": f"/api/resource/{dt_name}/{{name}}",
                        "location": f"/api/resource/{dt_name}",
                        "docstring": f"Get a {dt_name} record by name",
                        "parameters": [],
                        "resource_api": True,
                        "doctype": dt_name
                    }
                ])
                
                if len(apis) >= max_apis:
                    break
        except Exception as e:
            frappe.log_error(f"Error getting resource APIs for {app}: {str(e)}")
        
        return apis[:max_apis]
