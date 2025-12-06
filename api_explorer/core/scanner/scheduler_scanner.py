import frappe

class SchedulerScanner:
    def __init__(self, settings):
        self.settings = settings
    
    def get_scheduler_apis(self, app, max_apis):
        schedulers = []
        try:
            hooks = frappe.get_hooks("scheduler_events", app_name=app)
            for event_type, methods in hooks.items():
                for method in methods:
                    if len(schedulers) >= max_apis:
                        break
                    schedulers.append({
                        "name": method.split('.')[-1],
                        "path": method,
                        "location": method,
                        "docstring": f"Scheduled task: {event_type}",
                        "frequency": event_type,
                        "scheduler": True,
                        "parameters": []
                    })
        except Exception as e:
            frappe.log_error(f"Error getting scheduler APIs for {app}: {str(e)}")
        
        return schedulers
