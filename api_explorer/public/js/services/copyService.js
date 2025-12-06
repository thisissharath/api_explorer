class CopyService {
  static async copyResponse(api, response, parameters, formatted = true) {
    let textToCopy;
    
    if (formatted) {
      textToCopy = this.formatResponse(api, response, parameters);
    } else {
      textToCopy = JSON.stringify(response.response, null, 2);
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      this.showNotification('Response copied');
    } catch (err) {
      // Fallback for older browsers
      this.fallbackCopy(textToCopy);
      this.showNotification('Response copied');
    }
  }
  
  static async copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      this.showNotification('Code copied');
    } catch (err) {
      this.fallbackCopy(code);
      this.showNotification('Code copied');
    }
  }
  
  static async copyDocs(docs) {
    const formatted = JSON.stringify(docs, null, 2);
    try {
      await navigator.clipboard.writeText(formatted);
      this.showNotification('Documentation copied');
    } catch (err) {
      this.fallbackCopy(formatted);
      this.showNotification('Documentation copied');
    }
  }
  
  static formatResponse(api, response, parameters) {
    let formatted = '';
    
    if (Object.keys(parameters).length > 0) {
      formatted += `Request:\n`;
      formatted += JSON.stringify(parameters, null, 2);
      formatted += `\n\n`;
    }
    
    formatted += `Response:\n`;
    formatted += JSON.stringify(response.response, null, 2);
    
    return formatted;
  }
  
  static fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
  
  static showNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.copy-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2e3338;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto remove after 2 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 2000);
  }
}

export default CopyService;