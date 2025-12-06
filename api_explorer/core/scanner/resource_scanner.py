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
                        "path": f"/api/resource/{dt_name}",
                        "location": f"/api/resource/{dt_name}",
                        "docstring": f"Get list of {dt_name} records",
                        "parameters": [
                            {"name": "fields", "type": "text", "required": False},
                            {"name": "filters", "type": "textarea", "required": False},
                            {"name": "limit", "type": "number", "required": False}
                        ]
                    },
                    {
                        "name": f"Create {dt_name}",
                        "path": f"/api/resource/{dt_name}",
                        "location": f"/api/resource/{dt_name}",
                        "docstring": f"Create new {dt_name} record",
                        "parameters": [
                            {"name": "data", "type": "textarea", "required": True}
                        ]
                    }
                ])
                
                if len(apis) >= max_apis:
                    break
        except Exception as e:
            frappe.log_error(f"Error getting resource APIs for {app}: {str(e)}")
        
        return apis[:max_apis]
