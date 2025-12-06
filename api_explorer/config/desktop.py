from frappe import _

def get_data():
	return [
		{
			"module_name": "API Explorer",
			"color": "#3498db",
			"icon": "octicon octicon-code",
			"type": "link",
			"link": "/app/api-explorer",
			"label": _("API Explorer")
		}
	]