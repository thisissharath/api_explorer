import frappe
import json
import time
from api_explorer.core.auth.manager import AuthManager
from api_explorer.core.config.manager import ConfigManager

class APIExecutor:
    def __init__(self):
        self.settings = ConfigManager.get_settings() or {}
    
    def execute_api(self, api_path, parameters=None, files=None, user_context=None):
        start_time = time.time()
        
        if not user_context:
            user_context = AuthManager.get_current_user_context()
        
        execution_context = {
            "api_path": api_path,
            "user": user_context["user"],
            "session_id": user_context["session_id"],
            "start_time": start_time,
            "parameters": parameters or {},
            "files": files or {}
        }
        
        try:
            result = self._execute_with_context(execution_context)
            response_time = (time.time() - start_time) * 1000
            
            response_data = {
                "status_code": 200,
                "response": result,
                "success": True,
                "response_time": response_time,
                "api_path": api_path,
                "method_name": api_path.split('.')[-1] if '.' in api_path else api_path,
                "app_name": api_path.split('.')[0] if '.' in api_path else 'Unknown',
                "user": user_context["user"],
                "timestamp": frappe.utils.now(),
                "formatted_response_on_copy": self.settings.get('show_formatted_response', 0)
            }
            
            # Log if enabled - always call, manager checks setting
            self._log_api_call(response_data, execution_context)
            
            return response_data
        except Exception as e:
            error_response = self._handle_execution_error(e, execution_context, start_time)
            
            # Log errors - always call, manager checks setting
            self._log_api_call(error_response, execution_context)
            
            return error_response
    
    def _execute_with_context(self, context):
        api_path = context["api_path"]
        parameters = context["parameters"]
        files = context["files"]
        
        # Handle resource APIs
        if "::" in api_path:
            method, doctype = api_path.split("::", 1)
            if method == "frappe.client.get_list":
                return frappe.client.get_list(doctype, **parameters)
            elif method == "frappe.client.get":
                return frappe.client.get(doctype, **parameters)
        
        exec_params = self._convert_parameter_types(api_path, parameters)
        
        if files:
            original_files = getattr(frappe.request, 'files', None) if frappe.request else None
            
            try:
                if frappe.request:
                    # Process files based on their type
                    processed_files = {}
                    for key, file_obj in files.items():
                        if hasattr(file_obj, 'read'):  # It's a file object
                            processed_files[key] = file_obj
                        else:
                            # Handle different file types from form data
                            file_type = frappe.form_dict.get(f'{key}_type', 'frappe_request')
                            
                            if file_type == 'base64':
                                import base64
                                exec_params[key] = base64.b64decode(file_obj)
                            elif file_type == 'bytes':
                                exec_params[key] = file_obj if isinstance(file_obj, bytes) else file_obj.encode()
                            elif file_type == 'raw_text':
                                exec_params[key] = file_obj if isinstance(file_obj, str) else file_obj.decode()
                            else:  # frappe_request
                                processed_files[key] = file_obj
                    
                    frappe.request.files = processed_files
                
                result = frappe.call(api_path, ignore_permissions=True, **exec_params)
            finally:
                if frappe.request:
                    if original_files is not None:
                        frappe.request.files = original_files
                    elif hasattr(frappe.request, 'files'):
                        delattr(frappe.request, 'files')
        else:
            result = frappe.call(api_path, ignore_permissions=True, **exec_params)
        
        return result
    
    def _handle_execution_error(self, error, context, start_time):
        response_time = (time.time() - start_time) * 1000
        error_message = str(error)
        
        if hasattr(error, 'http_status_code'):
            status_code = error.http_status_code
        elif 'ValidationError' in str(type(error)):
            status_code = 400
        elif 'PermissionError' in str(type(error)):
            status_code = 403
        elif 'AuthenticationError' in str(type(error)):
            status_code = 401
        else:
            status_code = 500
        
        return {
            "status_code": status_code,
            "response": {"error": error_message, "type": str(type(error).__name__)},
            "success": False,
            "response_time": response_time,
            "api_path": context["api_path"],
            "method_name": context["api_path"].split('.')[-1] if '.' in context["api_path"] else context["api_path"],
            "app_name": context["api_path"].split('.')[0] if '.' in context["api_path"] else 'Unknown',
            "user": context["user"],
            "timestamp": frappe.utils.now(),
            "formatted_response_on_copy": self.settings.get('show_formatted_response', 0)
        }
    
    def _log_api_call(self, response_data, execution_context):
        from api_explorer.core.logs.manager import LogsManager
        LogsManager.log_api_call(
            response_data["api_path"],
            execution_context["parameters"],
            response_data["response"],
            response_data["status_code"],
            response_data["success"],
            response_data["response_time"],
            response_data["user"]
        )
    
    def _convert_parameter_types(self, api_path, parameters):
        """Convert string parameters to appropriate types based on function signature"""
        converted = {}
        
        try:
            func = frappe.get_attr(api_path)
            import inspect
            sig = inspect.signature(func)
            
            for param_name, param_value in parameters.items():
                if param_name in sig.parameters:
                    param = sig.parameters[param_name]
                    annotation = param.annotation
                    
                    if annotation != inspect.Parameter.empty:
                        converted[param_name] = self._cast_value(param_value, annotation)
                    else:
                        converted[param_name] = param_value
                else:
                    converted[param_name] = param_value
        except:
            return dict(parameters)
        
        return converted
    
    def _cast_value(self, value, annotation):
        """Cast value to the specified type"""
        if value is None or value == '':
            return value
        
        try:
            type_name = getattr(annotation, '__name__', str(annotation)).lower()
            
            if 'int' in type_name:
                return int(value)
            elif 'float' in type_name:
                return float(value)
            elif 'bool' in type_name:
                if isinstance(value, str):
                    return value.lower() in ('true', '1', 'yes', 'on')
                return bool(value)
            elif 'list' in type_name or 'array' in type_name:
                if isinstance(value, str):
                    try:
                        return json.loads(value)
                    except:
                        value = value.strip('[]')
                        return [item.strip().strip('"').strip("'") for item in value.split(',') if item.strip()]
                return value
            elif 'dict' in type_name or 'object' in type_name:
                if isinstance(value, str):
                    return json.loads(value)
                return value
        except:
            pass
        
        return value

@frappe.whitelist(methods=['GET', 'POST'], xss_safe=False)
def execute_api():
    try:
        # Basic authentication check only
        if frappe.session.user == "Guest":
            frappe.throw("Authentication required")
        
        user_context = AuthManager.get_current_user_context()
        if not user_context["authenticated"]:
            frappe.throw("Authentication required")
        
        api_path = frappe.form_dict.get('api_path')
        parameters_str = frappe.form_dict.get('parameters', '{}')
        
        if not api_path:
            frappe.throw("API path is required")
        
        try:
            parameters = json.loads(parameters_str) if isinstance(parameters_str, str) else parameters_str
        except json.JSONDecodeError:
            frappe.throw("Invalid JSON in parameters")
        
        files = {}
        if frappe.request and hasattr(frappe.request, 'files'):
            for key, file_obj in frappe.request.files.items():
                if key not in ['cmd', 'api_path', 'parameters']:
                    files[key] = file_obj
        
        executor = APIExecutor()
        return executor.execute_api(api_path, parameters, files)
    except Exception as e:
        return {
            "status_code": 500,
            "response": {"error": str(e)},
            "success": False,
            "response_time": 0,
            "api_path": frappe.form_dict.get('api_path', 'Unknown'),
            "method_name": "Unknown",
            "app_name": "Unknown",
            "user": frappe.session.user,
            "timestamp": frappe.utils.now()
        }

@frappe.whitelist(methods=['POST'], xss_safe=False)
def handle_file_upload():
    try:
        # Basic authentication check only
        if frappe.session.user == "Guest":
            frappe.throw("Authentication required")
        
        user_context = AuthManager.get_current_user_context()
        if not user_context["authenticated"]:
            frappe.throw("Authentication required")
        
        api_path = frappe.form_dict.get('api_path')
        if not api_path:
            frappe.throw("API path is required")
        
        form_data = dict(frappe.form_dict)
        for key in ['api_path', 'csrf_token', 'cmd']:
            form_data.pop(key, None)
        
        files = {}
        if frappe.request and hasattr(frappe.request, 'files'):
            files = dict(frappe.request.files)
        
        executor = APIExecutor()
        result = executor.execute_api(api_path, form_data, files)
        
        return {
            "success": result["success"],
            "message": result["response"],
            "status_code": result["status_code"]
        }
    except Exception as e:
        frappe.local.response.http_status_code = 500
        return {"success": False, "message": str(e), "status_code": 500}

