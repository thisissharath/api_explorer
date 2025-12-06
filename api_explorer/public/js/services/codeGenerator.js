class CodeGenerator {
  static generateCode(api, parameters, files, codeType, includeTokens = false) {
    const baseUrl = window.location.origin;
    const apiPath = api.path || api.api_path;
    const csrfToken = includeTokens ? this.getCSRFToken() : 'YOUR_CSRF_TOKEN';
    
    // Ensure parameters is an object
    const params = parameters || {};
    const filesList = files || [];
    
    switch (codeType) {
      case 'curl':
        return this.generateCurl(baseUrl, apiPath, params, filesList, csrfToken);
      case 'bash':
        return this.generateBash(baseUrl, apiPath, params, filesList, csrfToken);
      case 'python':
        return this.generatePython(baseUrl, apiPath, params, filesList, csrfToken);
      case 'fetch':
        return this.generateFetch(baseUrl, apiPath, params, filesList, csrfToken);
      default:
        return '';
    }
  }
  
  static generateCurl(baseUrl, apiPath, parameters, files, csrfToken) {
    const hasFiles = files && files.length > 0;
    
    let curl = `curl -X POST "${baseUrl}/api/method/${apiPath}" \\\n`;
    curl += `  -H "X-Frappe-CSRF-Token: ${csrfToken}" \\\n`;
    
    if (hasFiles) {
      curl += `  -H "Content-Type: multipart/form-data" \\\n`;
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) curl += `  -F "${key}=${value}" \\\n`;
      });
      files.forEach(file => {
        if (file.key && file.fileName) curl += `  -F "${file.key}=@${file.fileName}" \\\n`;
      });
      curl = curl.slice(0, -4); // Remove last \\

    } else {
      curl += `  -H "Content-Type: application/x-www-form-urlencoded" \\\n`;
      const data = [];
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) data.push(`${key}=${encodeURIComponent(value)}`);
      });
      if (data.length > 0) curl += `  -d "${data.join('&')}"`;
    }
    
    return curl;
  }
  
  static generateBash(baseUrl, apiPath, parameters, files, csrfToken) {
    const hasFiles = files && files.length > 0;
    
    let bash = `#!/bin/bash\n\n`;
    bash += `API_URL="${baseUrl}/api/method/${apiPath}"\n`;
    bash += `CSRF_TOKEN="${csrfToken}"\n\n`;
    
    bash += `curl -X POST "$API_URL" \\\n`;
    bash += `  -H "X-Frappe-CSRF-Token: $CSRF_TOKEN" \\\n`;
    
    if (hasFiles) {
      bash += `  -H "Content-Type: multipart/form-data"`;
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) bash += ` \\\n  -F "${key}=${value}"`;
      });
      files.forEach(file => {
        if (file.key && file.fileName) bash += ` \\\n  -F "${file.key}=@${file.fileName}"`;
      });
    } else {
      bash += `  -H "Content-Type: application/x-www-form-urlencoded"`;
      const data = [];
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) data.push(`${key}=${encodeURIComponent(value)}`);
      });
      if (data.length > 0) bash += ` \\\n  -d "${data.join('&')}"`;
    }
    
    return bash;
  }
  
  static generatePython(baseUrl, apiPath, parameters, files, csrfToken) {
    const hasFiles = files && files.length > 0;
    
    let python = `import requests\n\n`;
    python += `url = "${baseUrl}/api/method/${apiPath}"\n`;
    python += `headers = {"X-Frappe-CSRF-Token": "${csrfToken}"}\n\n`;
    
    if (hasFiles) {
      python += `data = {\n`;
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) python += `    "${key}": "${value}",\n`;
      });
      python += `}\n\n`;
      python += `files = {\n`;
      files.forEach(file => {
        if (file.key && file.fileName) python += `    "${file.key}": open("${file.fileName}", "rb"),\n`;
      });
      python += `}\n\n`;
      python += `response = requests.post(url, headers=headers, data=data, files=files)\n`;
    } else if (Object.keys(parameters).length > 0) {
      python += `data = {\n`;
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) python += `    "${key}": "${value}",\n`;
      });
      python += `}\n\n`;
      python += `response = requests.post(url, headers=headers, data=data)\n`;
    } else {
      python += `response = requests.post(url, headers=headers)\n`;
    }
    
    python += `print(response.json())`;
    
    return python;
  }
  
  static generateFetch(baseUrl, apiPath, parameters, files, csrfToken) {
    const hasFiles = files && files.length > 0;
    
    let fetch = `const response = await fetch('${baseUrl}/api/method/${apiPath}', {\n`;
    fetch += `  method: 'POST',\n`;
    
    if (hasFiles) {
      fetch += `  headers: {'X-Frappe-CSRF-Token': '${csrfToken}'},\n`;
      fetch += `  body: (() => {\n`;
      fetch += `    const formData = new FormData();\n`;
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) fetch += `    formData.append('${key}', '${value}');\n`;
      });
      files.forEach(file => {
        if (file.key && file.fileName) fetch += `    formData.append('${file.key}', fileInput.files[0]); // ${file.fileName}\n`;
      });
      fetch += `    return formData;\n`;
      fetch += `  })()\n`;
    } else if (Object.keys(parameters).length > 0) {
      const data = [];
      Object.entries(parameters).forEach(([key, value]) => {
        if (key && value) data.push(`${key}=${encodeURIComponent(value)}`);
      });
      fetch += `  headers: {\n`;
      fetch += `    'X-Frappe-CSRF-Token': '${csrfToken}',\n`;
      fetch += `    'Content-Type': 'application/x-www-form-urlencoded'\n`;
      fetch += `  },\n`;
      fetch += `  body: '${data.join('&')}'\n`;
    } else {
      fetch += `  headers: {'X-Frappe-CSRF-Token': '${csrfToken}'}\n`;
    }
    
    fetch += `});\n\n`;
    fetch += `const data = await response.json();\n`;
    fetch += `console.log(data);`;
    
    return fetch;
  }
  
  static getCSRFToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const windowToken = window.csrf_token;
    const frappeToken = window.frappe?.csrf_token;
    return metaToken || windowToken || frappeToken || '';
  }
}

export default CodeGenerator;