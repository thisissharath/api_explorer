import frappe
from frappe.model.document import Document

class APIExplorerSettings(Document):
	def validate(self):
		# Normalize excluded apps to lowercase
		for row in self.get("excluded_apps", []):
			if row.app_name:
				row.app_name = row.app_name.lower().strip()
		
		# Normalize excluded methods to lowercase
		for row in self.get("excluded_api_methods", []):
			if row.method_path:
				row.method_path = row.method_path.lower().strip()