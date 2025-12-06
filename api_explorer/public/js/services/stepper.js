class StepperService {
  static async initialize(stepCallback) {
    const steps = [
      { id: 'starting', label: 'Starting', method: null },
      { id: 'settings', label: 'Settings', method: 'loadSettings' },
      { id: 'auth', label: 'Authenticating', method: 'authenticateUser' },
      { id: 'apis', label: 'Scanning APIs', method: 'scanApis' },
      { id: 'data', label: 'Preloading data', method: 'loadAllData' },
      { id: 'complete', label: 'Finalising', method: null }
    ];
    
    const results = {};
    
    try {
      // Initialize all steps as pending
      stepCallback({ steps: steps.map(s => ({ ...s, state: 'pending' })) });
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Set current step as processing
        stepCallback({ 
          steps: steps.map((s, idx) => ({
            ...s, 
            state: idx < i ? 'completed' : idx === i ? 'processing' : 'pending'
          }))
        });
        
        if (step.method) {
          try {
            const result = await this[step.method](results);
            results[step.id] = result;
            
          } catch (error) {
            if (step.id === 'auth' && error.message.includes('Access denied')) {
              // For access denied, hide stepper UI
              stepCallback({ hideSteps: true });
            } else {
              // Mark as failed
              stepCallback({ 
                steps: steps.map((s, idx) => ({
                  ...s, 
                  state: idx < i ? 'completed' : idx === i ? 'failed' : 'pending'
                }))
              });
            }
            
            if (step.id === 'auth') {
              if (error.message.includes('User not authenticated') || error.message.includes('Authentication failed')) {
                // Not logged in - redirect to login
                setTimeout(() => {
                  window.location.href = '/login?redirect-to=api-explorer';
                }, 1000);
                return {
                  success: false,
                  error: 'Authentication failed - redirecting to login',
                  errorType: 'auth_failed'
                };
              } else {
                // Logged in but access denied - hide stepper and show access denied screen
                return {
                  success: false,
                  error: 'Contact administrator for more details',
                  errorType: 'access_denied',
                  hideSteps: true
                };
              }
            }
            // For non-auth errors, continue throwing
            throw error;
          }
        }
        
        // Mark as completed
        stepCallback({ 
          steps: steps.map((s, idx) => ({
            ...s, 
            state: idx <= i ? 'completed' : 'pending'
          }))
        });
        
        // Small delay between steps
        if (i < steps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Mark all as completed
      stepCallback({ 
        steps: steps.map(s => ({ ...s, state: 'completed' }))
      });
      
      return {
        success: true,
        data: {
          userContext: results.auth,
          settings: results.settings || {},
          apis: results.apis || {},
          favorites: results.data?.favorites || []
        }
      };
      
    } catch (error) {
      
      throw error;
    }
  }
  
  static async authenticateUser(results) {
    try {
      const response = await fetch('/api/method/api_explorer.core.auth.manager.get_current_user_context');
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      const data = await response.json();
      
      if (data.exc) {
        throw new Error('Authentication failed');
      }
      
      const userContext = data.message;
      

      
      if (!userContext?.authenticated) {
        throw new Error('User not authenticated');
      }
      
      // Check API Explorer access permissions from auth manager
      if (!userContext.permissions?.api_explorer_access) {
        throw new Error('Access denied');
      }
      
      // If we reach here, authentication is successful
      return userContext;
    } catch (error) {
      throw new Error(error.message || 'Authentication failed');
    }
  }
  
  static async loadSettings() {
    try {
      const response = await fetch('/api/method/api_explorer.api.settings.get_settings');
      if (!response.ok) {
        return {};
      }
      const data = await response.json();
      return data.message || {};
    } catch (error) {
      return {};
    }
  }
  
  static async scanApis(results) {
    try {
      const userContext = results.auth;
      if (!userContext?.authenticated) {
        throw new Error('Not authenticated for API scanning');
      }
      
      const response = await fetch('/api/method/api_explorer.core.scanner.manager.scan_apis');
      if (!response.ok) {
        return {};
      }
      const data = await response.json();
      return data.message?.apps || {};
    } catch (error) {
      return {};
    }
  }
  
  static async loadAllData(results) {
    try {
      const userContext = results.auth;
      const settings = results.settings;
      if (!userContext?.authenticated) {
        return { favorites: [] };
      }
      
      // Track login if history is enabled
      if (settings?.maintain_user_history) {
        try {
          await fetch('/api/method/api_explorer.core.history.manager.track_login', {
            method: 'POST',
            headers: {
              'X-Frappe-CSRF-Token': this.getCSRFToken() || ''
            }
          });
        } catch (e) {
          // Ignore history tracking errors
        }
      }
      
      // Load favorites
      const response = await fetch('/api/method/api_explorer.core.favorites.manager.get_favorites');
      let favorites = [];
      
      if (response.ok) {
        const data = await response.json();
        favorites = data.message || [];
      }
      
      return { favorites };
    } catch (error) {
      return { favorites: [] };
    }
  }
  
  static getCSRFToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const windowToken = window.csrf_token;
    const frappeToken = window.frappe?.csrf_token;
    return metaToken || windowToken || frappeToken || '';
  }

}

export default StepperService;