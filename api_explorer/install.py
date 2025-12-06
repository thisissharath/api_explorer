import frappe

def after_install():
	"""Setup default settings after app installation"""
	try:
		# Create API Explorer Settings if not exists
		if not frappe.db.exists("API Explorer Settings", "API Explorer Settings"):
			doc = frappe.get_doc({
				"doctype": "API Explorer Settings",
				"title": "API Explorer Settings",
				"enabled": 1,
				"dark_mode": 0,
				"font_family": "Poppins",
				"custom_page_title": "API Explorer",
				"custom_page_description": "Manage all methods at one place",
				"show_public_apis": 1,
				"show_internal_apis": 1,
				"show_resource_apis": 0,
				"show_scheduler_jobs": 0,
				"enable_search": 1,
				"enable_pagination": 1,
				"items_per_page": 40,
				"disable_api_testing": 0,
				"log_all_api_calls": 0,
				"maintain_user_history": 1,
				"include_tokens_in_code": 0,
				"max_apis_per_app": 1000,
				"allowed_user_roles": [
					{"role": "Administrator"}
				]
			})
			doc.insert(ignore_permissions=True)
			frappe.db.commit()
	except Exception as e:
		frappe.log_error(f"API Explorer installation error: {str(e)}", "API Explorer Install")
