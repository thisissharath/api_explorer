# API Explorer Documentation

A comprehensive Frappe app for discovering, testing, and managing all APIs in your Frappe/ERPNext environment.

## Features

- **API Discovery** - Automatically scans and lists all whitelisted APIs across installed apps
- **API Testing** - Execute APIs directly from the browser with custom parameters
- **Favorites** - Save frequently used APIs for quick access
- **Execution Logs** - Track all API calls with detailed request/response logs
- **User History** - Monitor user sessions and login activity
- **Customizable UI** - Dark mode, multiple fonts, and custom branding
- **Role-Based Access** - Control who can access the API Explorer
- **Performance Optimized** - Multi-level caching for fast API scanning
- **Code Generation** - Generate API calls in multiple languages (cURL, Python, JavaScript)
- **Security** - Disable API testing, exclude sensitive APIs, and control token visibility

## Installation

### Prerequisites
- Frappe Framework (v13 or higher)
- Python 3.8+

### Install Steps

```bash
# Get the app
bench get-app https://github.com/thisissharath/api_explorer.git

# Install on your site
bench --site your-site-name install-app api_explorer

# Migrate
bench --site your-site-name migrate

# Clear cache
bench --site your-site-name clear-cache
```

## Quick Start

1. After installation, go to **API Explorer Settings** doctype
2. **Allowed User Roles** is pre-configured with **Administrator** role
3. To add more roles, go to **Security & Access** tab and add roles to **Allowed User Roles** table
4. Access the API Explorer at: `http://your-site/api-explorer`

## Configuration

### API Explorer Settings

Navigate to: **Desk → API Explorer Settings**

#### General Tab

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Enable/disable API Explorer | Enabled |
| **Dark Mode** | Enable dark theme | Disabled |
| **Font Family** | Choose UI font (Poppins, Inter, Roboto, etc.) | Poppins |
| **Custom Page Title** | Customize page title | API Explorer |
| **Custom Page Description** | Customize page description | Manage all methods at one place |

#### API Display Tab

| Setting | Description | Default |
|---------|-------------|---------|
| **Show Public APIs** | Display APIs with `allow_guest=True` | Enabled |
| **Show Internal APIs** | Display whitelisted APIs requiring authentication | Enabled |
| **Show Resource APIs** | Display Frappe REST resource APIs | Disabled |
| **Show Scheduler Jobs** | Display scheduled background jobs | Disabled |
| **Enable Search** | Show search bar for filtering APIs | Enabled |

#### Pagination Tab

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Pagination** | Enable pagination for API lists | Enabled |
| **Items Per Page** | Number of APIs to display per page | 40 |

#### Security & Access Tab

| Setting | Description | Default |
|---------|-------------|---------|
| **Allowed User Roles** | Roles that can access API Explorer | Administrator (pre-configured) |
| **Disable API Testing** | Prevent API execution from UI | Disabled |
| **Log All API Test Calls** | Save execution logs to database | Disabled |
| **Maintain User History** | Track user login sessions | Enabled |
| **Include Tokens in Code** | Show CSRF tokens in generated code | Disabled |

#### Filtering Tab

| Setting | Description | Default |
|---------|-------------|---------|
| **Excluded Apps** | Apps to hide from API Explorer | None |
| **Excluded API Methods** | Specific API paths to hide | None |

#### Performance Tab

| Setting | Description | Default |
|---------|-------------|---------|
| **Max APIs per App** | Limit APIs scanned per app | 1000 |

## Usage

### Accessing API Explorer

1. Navigate to: `http://your-site/api-explorer`
2. Browse APIs by app and category (Public, Internal, Resource, Schedulers)
3. Click on any API to expand details
4. Use **Reload** button to clear cache and reflect updated settings

### Testing APIs

1. Expand an API card
2. Add parameters in key-value format
3. Upload files if needed
4. Click **Execute** button
5. View response with status code and execution time

### Managing Favorites

- Click the **★** icon to add/remove APIs from favorites
- Access favorites from the **FAVORITES** tab

### Generating Code

1. Expand an API
2. Click **Code** dropdown
3. Select language (cURL, Bash, Python, Fetch)
4. Click **Copy** to copy generated code

### Viewing Logs

When **Log All API Test Calls** is enabled:
- Go to **API Execution Logs** doctype
- View all API calls with request/response details
- Filter by user, app, or date

### User History

When **Maintain User History** is enabled:
- Go to **API Explorer User History** doctype
- Track user login sessions and timestamps

## Architecture

### Backend Structure

```
api_explorer/
├── api/                           # API endpoints
│   ├── __init__.py
│   ├── csrf_helper.py            # CSRF token management
│   ├── pagination.py             # Pagination logic
│   └── settings.py               # Settings API
├── core/                         # Core modules
│   ├── auth/
│   │   ├── __init__.py
│   │   └── manager.py            # Authentication & authorization
│   ├── config/
│   │   ├── __init__.py
│   │   └── manager.py            # Configuration management
│   ├── executor/
│   │   ├── __init__.py
│   │   └── manager.py            # API execution engine
│   ├── favorites/
│   │   ├── __init__.py
│   │   └── manager.py            # Favorites management
│   ├── history/
│   │   ├── __init__.py
│   │   └── manager.py            # User history tracking
│   ├── logs/
│   │   ├── __init__.py
│   │   └── manager.py            # Execution logging
│   ├── openapi/
│   │   ├── __init__.py
│   │   └── manager.py            # OpenAPI/Swagger generation
│   └── scanner/
│       ├── __init__.py
│       ├── manager.py            # API scanning orchestration
│       ├── file_scanner.py       # Whitelisted API scanner
│       ├── resource_scanner.py   # Resource API scanner
│       └── scheduler_scanner.py  # Scheduler job scanner
├── api_explorer/
│   └── doctype/                  # Frappe doctypes
│       ├── api_execution_logs/
│       │   ├── __init__.py
│       │   ├── api_execution_logs.json
│       │   └── api_execution_logs.py
│       ├── api_explorer_allowed_role/     # Child table
│       │   ├── __init__.py
│       │   ├── api_explorer_allowed_role.json
│       │   └── api_explorer_allowed_role.py
│       ├── api_explorer_excluded_app/     # Child table
│       │   ├── __init__.py
│       │   ├── api_explorer_excluded_app.json
│       │   └── api_explorer_excluded_app.py
│       ├── api_explorer_excluded_method/  # Child table
│       │   ├── __init__.py
│       │   ├── api_explorer_excluded_method.json
│       │   └── api_explorer_excluded_method.py
│       ├── api_explorer_included_app/     # Child table
│       │   ├── __init__.py
│       │   ├── api_explorer_included_app.json
│       │   └── api_explorer_included_app.py
│       ├── api_explorer_settings/
│       │   ├── __init__.py
│       │   ├── api_explorer_settings.json
│       │   └── api_explorer_settings.py
│       ├── api_explorer_user_favorite/
│       │   ├── __init__.py
│       │   ├── api_explorer_user_favorite.json
│       │   └── api_explorer_user_favorite.py
│       └── api_explorer_user_history/
│           ├── __init__.py
│           ├── api_explorer_user_history.json
│           └── api_explorer_user_history.py
├── config/
│   ├── __init__.py
│   ├── desktop.py                # Desk icons
│   └── routes.py                 # URL routes
├── fixtures/
│   └── api_explorer_settings.json # Default settings
├── public/js/                    # Frontend Vue.js app
│   ├── components/
│   │   ├── AccessDenied.js
│   │   ├── ApiCard.js
│   │   ├── ApiExecutor.js
│   │   └── Stepper.js
│   ├── services/
│   │   ├── api.js
│   │   ├── codeGenerator.js
│   │   ├── copyService.js
│   │   ├── favorites.js
│   │   ├── state.js
│   │   ├── stepper.js
│   │   ├── theme.js
│   │   └── ui.js
│   ├── styles/
│   │   ├── animations.css
│   │   ├── main.css
│   │   └── modal.css
│   └── App.js                    # Main Vue app
├── www/                          # Web pages
│   ├── api-explorer.html
│   └── api-explorer.py           # Page controller
├── __init__.py
├── hooks.py                      # Frappe hooks
├── install.py                    # Post-install script
├── modules.txt
└── patches.txt
```

### Frontend (Vue 3)

- **Single Page Application** with reactive state management
- **Stepper initialization** for smooth loading experience
- **Real-time API testing** with parameter validation
- **Code generation** for multiple languages
- **Responsive design** with dark mode support

### Caching Strategy

1. **Settings Cache** - 10 minutes (Redis)
2. **API Scan Cache** - 5 minutes per user
3. **Pagination Cache** - In-memory for active sessions
4. **File Scanner Cache** - LRU cache for function metadata

## API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/method/api_explorer.api.settings.get_settings` | GET | Get current settings |
| `/api/method/api_explorer.core.scanner.manager.scan_apis` | GET | Scan all APIs |
| `/api/method/api_explorer.core.executor.manager.execute_api` | POST | Execute an API |
| `/api/method/api_explorer.core.favorites.manager.get_favorites` | GET | Get user favorites |
| `/api/method/api_explorer.api.pagination.get_paginated_apis` | GET | Get paginated API list |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/method/api_explorer.core.scanner.manager.clear_cache` | POST | Clear all caches |
| `/api/method/api_explorer.core.logs.manager.get_logs` | GET | Get execution logs |
| `/api/method/api_explorer.core.history.manager.get_user_sessions` | GET | Get user sessions |

## Troubleshooting

### APIs not showing

1. Check **API Explorer Settings** → Ensure **Enabled** is checked
2. Verify your role is in **Allowed User Roles**
3. Clear cache: `bench --site your-site clear-cache`
4. Check if apps are in **Excluded Apps** list

### Access Denied

1. Go to **API Explorer Settings**
2. Add your role to **Allowed User Roles** table
3. Save and refresh the page

### Logs not appearing

1. Enable **Log All API Test Calls** in settings
2. Execute an API
3. Check **API Execution Logs** doctype

### Performance issues

1. Reduce **Max APIs per App** (default: 1000)
2. Disable **Show Resource APIs** and **Show Scheduler Jobs**
3. Add frequently scanned apps to **Excluded Apps**

### Tabs collapsed on Settings page

- Click on any tab name to expand it
- All settings are saved properly

## Security

### Security Features

**CSRF Protection**
- All API calls require valid CSRF tokens
- Tokens are automatically managed and validated
- Frontend retrieves tokens via `/api/method/api_explorer.api.csrf_helper.get_csrf_token`
- Every POST request includes `X-Frappe-CSRF-Token` header

**Authentication & Authorization**
- Role-based access control via **Allowed User Roles**
- Session validation on every request
- Guest users are automatically redirected to login
- Website Users are blocked from accessing API Explorer

**API Execution Security**
- All API calls use `frappe.call()` with proper permission checks
- File uploads are sanitized and validated
- Parameter type conversion prevents injection attacks
- Response size limits prevent memory exhaustion

**Data Protection**
- Sensitive data can be excluded via **Excluded API Methods**
- CSRF tokens hidden in generated code by default
- API testing can be disabled in production
- All logs are user-specific and permission-controlled

**Vulnerabilities Addressed**
- XSS: All API endpoints use `xss_safe=False` with proper sanitization
- CSRF: Token validation on all state-changing operations
- SQL Injection: Parameterized queries via Frappe ORM
- Path Traversal: File paths validated and sanitized
- DoS: Rate limiting via Frappe's built-in mechanisms
- Information Disclosure: Sensitive APIs can be excluded

### Security Best Practices

1. **Limit Access** - Only add trusted roles to **Allowed User Roles**
2. **Exclude Sensitive APIs** - Add sensitive API paths to **Excluded API Methods**
3. **Disable Testing in Production** - Enable **Disable API Testing** on production sites
4. **Hide Tokens** - Keep **Include Tokens in Code** disabled
5. **Monitor Logs** - Enable **Log All API Test Calls** to track usage
6. **Regular Audits** - Review **API Execution Logs** for suspicious activity
7. **Principle of Least Privilege** - Grant minimum required roles

## Development

### Local Setup

```bash
# Clone repository
git clone https://github.com/thisissharath/api_explorer.git

# Install in development mode
bench get-app /path/to/api_explorer

# Install on site
bench --site dev.local install-app api_explorer
```

### Running Tests

```bash
# Run all tests
bench --site dev.local run-tests --app api_explorer

# Run specific test
bench --site dev.local run-tests --test api_explorer.tests.test_scanner
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See [LICENSE](license.txt) for details

## Support

- **Issues**: [GitHub Issues](https://github.com/thisissharath/api_explorer/issues)
- **Email**: imsharathkumarv@gmail.com
- **LinkedIn**: [linkedin.com/in/thisissharath](https://linkedin.com/in/thisissharath)

## Credits

Developed by **Sharath Kumar**

Built using Frappe Framework and Vue.js

---

**Version**: 1.0.0  
**Last Updated**: December 2025
