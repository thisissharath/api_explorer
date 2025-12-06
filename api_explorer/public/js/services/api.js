class ApiService {
  static async scanApis() {
    try {
      const response = await fetch('/api/method/api_explorer.core.scanner.manager.scan_apis', {
        headers: {
          'X-Frappe-CSRF-Token': ApiService.getCSRFToken() || ''
        }
      });
      if (!response.ok) return { apps: {} };
      const data = await response.json();
      return data.message || { apps: {} };
    } catch (e) { 
      return { apps: {} }; 
    }
  }
  
  static async executeApi(apiPath, parameters = {}, files = []) {
    try {
      const formData = new FormData();
      formData.append('api_path', apiPath);
      formData.append('parameters', JSON.stringify(parameters));
      
      // Add CSRF token
      const csrfToken = ApiService.getCSRFToken();
      if (csrfToken) {
        formData.append('csrf_token', csrfToken);
      }
      
      // Handle files based on type
      files.forEach(fileParam => {
        if (fileParam.key && fileParam.file) {
          switch (fileParam.type) {
            case 'frappe_request':
              formData.append(fileParam.key, fileParam.file);
              break;
            case 'base64':
              // Convert file to base64
              const reader = new FileReader();
              reader.readAsDataURL(fileParam.file);
              reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                formData.append(fileParam.key, base64);
              };
              break;
            case 'bytes':
              // Send as binary
              formData.append(fileParam.key, fileParam.file);
              break;
            case 'raw_text':
              // Convert to text
              const textReader = new FileReader();
              textReader.readAsText(fileParam.file);
              textReader.onload = () => {
                formData.append(fileParam.key, textReader.result);
              };
              break;
          }
        }
      });
      
      const response = await fetch('/api/method/api_explorer.core.executor.manager.execute_api', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Frappe-CSRF-Token': csrfToken || ''
        }
      });
      
      const data = await response.json();
      // Return the actual response data, not wrapped in message
      return data.message || data;
    } catch (e) {
      throw e;
    }
  }
  
  static getCSRFToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const windowToken = window.csrf_token;
    const frappeToken = window.frappe?.csrf_token;
    
    return metaToken || windowToken || frappeToken || '';
  }
}

export default ApiService;