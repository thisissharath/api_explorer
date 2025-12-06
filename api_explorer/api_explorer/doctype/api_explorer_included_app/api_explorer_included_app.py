import frappe
from frappe.model.document import Document

class APIExplorerIncludedApp(Document):
	pass

@frappe.whitelist()
def get_installed_apps():
	return "\n".join(frappe.get_installed_apps())
