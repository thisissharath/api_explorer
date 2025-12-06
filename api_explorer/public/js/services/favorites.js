class FavoritesService {
  static async getFavorites() {
    try {
      const response = await fetch('/api/method/api_explorer.core.favorites.manager.get_favorites', {
        headers: {
          'X-Frappe-CSRF-Token': this.getCSRFToken() || ''
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.message || [];
    } catch (e) { 
      console.error('Error getting favorites:', e);
      return []; 
    }
  }
  
  static async addFavorite(apiName, apiPath) {
    try {
      const formData = new URLSearchParams();
      formData.append('api_name', apiName);
      formData.append('api_path', apiPath);
      
      const csrfToken = this.getCSRFToken();
      if (csrfToken) {
        formData.append('csrf_token', csrfToken);
      }
      
      const response = await fetch('/api/method/api_explorer.core.favorites.manager.add_favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': csrfToken || ''
        },
        body: formData
      });
      const data = await response.json();
      return data.message || data;
    } catch (e) {
      console.error('Error adding favorite:', e);
      throw e;
    }
  }
  
  static async removeFavorite(apiPath) {
    try {
      const formData = new URLSearchParams();
      formData.append('api_path', apiPath);
      
      const csrfToken = this.getCSRFToken();
      
      const response = await fetch('/api/method/api_explorer.core.favorites.manager.remove_favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': csrfToken
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.message || data;
    } catch (e) {
      console.error('Error removing favorite:', e);
      return { success: false, message: e.message };
    }
  }
  
  static getCSRFToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const windowToken = window.csrf_token;
    const frappeToken = window.frappe?.csrf_token;
    
    return metaToken || windowToken || frappeToken || '';
  }
}

export default FavoritesService;