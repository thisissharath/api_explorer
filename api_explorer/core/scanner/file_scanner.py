import frappe
import os
import ast
import inspect
from functools import lru_cache

class FileScanner:
    def __init__(self, settings):
        self.settings = settings
        self.excluded_dirs = ['__pycache__', '.git', 'node_modules', 'public', 'templates', 'migrations']
        self.excluded_prefixes = ['test_', '_test', '__']
        self._load_filtering_settings()
        self._function_cache = {}
    
    @lru_cache(maxsize=128)
    def get_app_path(self, app):
        return frappe.get_app_path(app)
    
    def get_public_apis(self, app, max_apis):
        return self._get_categorized_functions(app, max_apis, 'public')
    
    def get_internal_apis(self, app, max_apis):
        return self._get_categorized_functions(app, max_apis, 'internal')
    
    def get_resource_apis(self, app, max_apis):
        return self._get_categorized_functions(app, max_apis, 'resource')
    
    def _get_categorized_functions(self, app, max_apis, category):
        if app not in self._function_cache:
            self._function_cache[app] = self._scan_all_functions(app)
        
        functions = self._function_cache[app].get(category, [])
        return functions[:max_apis]
    
    def _scan_all_functions(self, app):
        public_apis = []
        internal_apis = []
        resource_apis = []
        max_apis_limit = self.settings.get('max_apis_per_app', 1000)
        
        try:
            app_path = self.get_app_path(app)
            file_count = 0
            max_files = 200  # Limit files to prevent timeout
            
            # Fast file traversal with limits
            for root, dirs, files in os.walk(app_path):
                dirs[:] = [d for d in dirs if d not in self.excluded_dirs]
                
                for file in files:
                    if file_count >= max_files:
                        break
                        
                    if file.endswith('.py') and not any(file.startswith(p) for p in self.excluded_prefixes):
                        file_path = os.path.join(root, file)
                        file_functions = self._extract_functions_fast(file_path, app)
                        
                        for func_info in file_functions:
                            if not self.is_method_allowed(func_info['path']):
                                continue
                                
                            # Categorize based on whitelist status
                            if func_info['is_whitelisted']:
                                if func_info['allow_guest']:
                                    public_apis.append(func_info)
                                else:
                                    internal_apis.append(func_info)
                            else:
                                # Limit resource APIs to prevent overload
                                if len(resource_apis) < 100:
                                    resource_apis.append(func_info)
                        
                        file_count += 1
                
                if file_count >= max_files:
                    break
        
        except Exception as e:
            frappe.log_error(f"Error scanning {app}: {str(e)}")
        
        return {
            'public': public_apis[:max_apis_limit],
            'internal': internal_apis[:max_apis_limit], 
            'resource': resource_apis[:max_apis_limit]
        }
    
    def _extract_functions_fast(self, file_path, app):
        functions = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Skip files without function definitions
            if 'def ' not in content:
                return functions
            
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and not node.name.startswith('_'):
                    is_whitelisted, allow_guest = self._check_whitelist_decorator(node)
                    func_info = self._create_api_info_fast(node, file_path, app)
                    
                    if func_info:
                        func_info['is_whitelisted'] = is_whitelisted
                        func_info['allow_guest'] = allow_guest
                        functions.append(func_info)
        
        except Exception:
            pass  # Skip problematic files silently for speed
        
        return functions
    
    def _check_whitelist_decorator(self, node):
        is_whitelisted = False
        allow_guest = False
        
        for decorator in node.decorator_list:
            # Handle @frappe.whitelist or @some_module.whitelist
            if isinstance(decorator, ast.Attribute) and decorator.attr == 'whitelist':
                is_whitelisted = True
            # Handle @frappe.whitelist() or @frappe.whitelist(allow_guest=True)
            elif isinstance(decorator, ast.Call):
                if isinstance(decorator.func, ast.Attribute) and decorator.func.attr == 'whitelist':
                    is_whitelisted = True
                    # Check for allow_guest parameter
                    for keyword in decorator.keywords:
                        if keyword.arg == 'allow_guest':
                            if isinstance(keyword.value, ast.Constant):
                                allow_guest = keyword.value.value
                            elif isinstance(keyword.value, ast.NameConstant):  # For older Python versions
                                allow_guest = keyword.value.value
        
        return is_whitelisted, allow_guest
    
    def _create_api_info_fast(self, node, file_path, app):
        try:
            app_path = self.get_app_path(app)
            rel_path = file_path.replace(app_path, '').replace('\\', '.').replace('/', '.').replace('.py', '').strip('.')
            full_path = f"{app}.{rel_path}.{node.name}"
            
            return {
                "name": node.name,
                "path": full_path,
                "location": full_path,
                "docstring": "",  # Skip docstring parsing for speed
                "parameters": self._analyze_parameters_fast(node),
                "file_path": file_path,
                "line_number": node.lineno
            }
        except Exception:
            return None
    
    def _analyze_parameters_fast(self, node):
        params = []
        try:
            for i, arg in enumerate(node.args.args):
                if arg.arg == 'self':
                    continue
                
                default_offset = len(node.args.args) - len(node.args.defaults)
                has_default = i >= default_offset
                
                # Detect type from annotation
                param_type = self._get_param_type(arg)
                
                params.append({
                    "name": arg.arg,
                    "type": param_type,
                    "required": not has_default,
                    "description": "",
                    "default_value": ""
                })
        except Exception:
            pass
        
        return params
    
    def _get_param_type(self, arg):
        """Extract parameter type from type annotation"""
        if not arg.annotation:
            return "string"
        
        try:
            if isinstance(arg.annotation, ast.Name):
                type_name = arg.annotation.id.lower()
                type_map = {
                    'int': 'integer',
                    'float': 'number',
                    'bool': 'boolean',
                    'str': 'string',
                    'dict': 'object',
                    'list': 'array'
                }
                return type_map.get(type_name, 'string')
            elif isinstance(arg.annotation, ast.Constant):
                return 'string'
        except:
            pass
        
        return 'string'
    
    def _load_filtering_settings(self):
        try:
            # Get excluded apps
            self.excluded_apps = set()
            for row in self.settings.get("excluded_apps", []):
                if row.get("app_name"):
                    self.excluded_apps.add(row.get("app_name"))
            
            # Get excluded methods
            self.excluded_methods = set()
            for row in self.settings.get("excluded_api_methods", []):
                if row.get("method_path"):
                    self.excluded_methods.add(row.get("method_path"))
                    
        except Exception as e:
            frappe.log_error(f"Filter settings load error: {str(e)}", "API Explorer")
            self.excluded_apps = set()
            self.excluded_methods = set()
    
    def is_app_allowed(self, app):
        # Exclude apps in excluded_apps
        return app not in self.excluded_apps
    
    def is_method_allowed(self, method_path):
        # Check if method is in excluded list
        for excluded in self.excluded_methods:
            if method_path.startswith(excluded):
                return False
        return True