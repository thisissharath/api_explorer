import StepperService from '/assets/api_explorer/js/services/stepper.js';
import StateManager from '/assets/api_explorer/js/services/state.js';
import UIService from '/assets/api_explorer/js/services/ui.js';
import ThemeService from '/assets/api_explorer/js/services/theme.js';
import ApiService from '/assets/api_explorer/js/services/api.js';
import FavoritesService from '/assets/api_explorer/js/services/favorites.js';
import CodeGenerator from '/assets/api_explorer/js/services/codeGenerator.js';
import CopyService from '/assets/api_explorer/js/services/copyService.js';

import AccessDenied from '/assets/api_explorer/js/components/AccessDenied.js';
import ApiCard from '/assets/api_explorer/js/components/ApiCard.js';
import Stepper from '/assets/api_explorer/js/components/Stepper.js';

const App = {
  components: { AccessDenied, ApiCard, Stepper },
  data() {
    this.stateManager = new StateManager();
    return {
      ...this.stateManager.state,
      steps: [],
      userContext: {},
      showCodeDropdown: {},
      selectedCodeType: {},
      generatedCode: {}
    };
  },
  async mounted() {
    await this.initializeApp();
    this.applyThemeFromSettings();
  },
  computed: {
    filteredFavorites() {
      if (this.activeTab !== 'favs') return [];
      let favs = this.favorites;
      if (this.searchQuery) {
        favs = favs.filter(fav => 
          fav.api_name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          fav.api_path.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      }
      return favs;
    }
  },
  methods: {
    async initializeApp() {
      try {
        const result = await StepperService.initialize((stepData) => {
          if (!stepData.hideSteps) {
            this.steps = stepData.steps;
          }
        });
        
        if (result && result.success) {
          const data = result.data;
          
          this.settings = data.settings || {};
          this.apis = data.apis || {};
          this.favorites = data.favorites || [];
          this.userContext = data.userContext || {};
          
          UIService.applySettings(this.settings);
          this.loading = false;
        } else if (result && result.errorType === 'access_denied') {
          this.loading = false;
          this.accessDenied = true;
          this.accessDeniedReason = result.error;
        } else {
          throw new Error('Initialization failed');
        }
      } catch (error) {
        window.location.href = '/login?redirect-to=api-explorer';
      }
    },
    applyThemeFromSettings() {
      if (this.settings && this.settings.dark_mode !== undefined) {
        ThemeService.setDarkMode(this.settings.dark_mode);
      }
    },
    async onReload() {
      try {
        // Clear server-side cache first
        const response = await fetch('/api/method/api_explorer.core.scanner.manager.clear_cache', {
          method: 'POST',
          headers: {
            'X-Frappe-CSRF-Token': this.getCSRFToken() || ''
          }
        });
        
        // Clear all browser caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Clear all storage
        sessionStorage.clear();
        localStorage.clear();
        
        // Clear cookies related to API Explorer
        document.cookie.split(";").forEach(c => {
          if (c.includes('api_explorer')) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          }
        });
        
      } catch (e) {}
      
      
      // Force hard reload with cache bypass
      window.location.reload(true);
    },
    
    async onLogout() {
      try {
        // Track logout if history is enabled
        if (this.settings.maintain_user_history) {
          await fetch('/api/method/api_explorer.core.history.manager.track_logout', {
            method: 'POST',
            headers: {
              'X-Frappe-CSRF-Token': this.getCSRFToken() || ''
            }
          });
        }
        // Use Frappe's logout endpoint
        await fetch('/api/method/logout', {
          method: 'POST',
          headers: {
            'X-Frappe-CSRF-Token': this.getCSRFToken() || ''
          }
        });
        window.location.href = '/login';
      } catch (e) {
        window.location.href = '/login';
      }
    },
    
    getCSRFToken() {
      const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const windowToken = window.csrf_token;
      const frappeToken = window.frappe?.csrf_token;
      return metaToken || windowToken || frappeToken || '';
    },
    
    setActiveTab(tab) {
      this.activeTab = tab;
      this.selectedApp = null;
      this.selectedCategory = null;
      this.selectedFavorite = null;
    },
    performSearch() {
      if (this.searchQuery !== this.searchText) {
        this.searchQuery = this.searchText;
        this.currentPage = 1;
        this.contentLoading = true;
        
        // Instant local search if no server-side search needed
        if (this.selectedApp && this.selectedCategory && this.apis[this.selectedApp] && this.apis[this.selectedApp][this.selectedCategory]) {
          const apis = this.apis[this.selectedApp][this.selectedCategory];
          let filtered = apis;
          
          if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = apis.filter(api => 
              api.name.toLowerCase().includes(query) || 
              api.path.toLowerCase().includes(query)
            );
          }
          
          const pageSize = this.settings.items_per_page || 20;
          this.paginatedApis = this.settings.enable_pagination ? filtered.slice(0, pageSize) : filtered;
          this.paginationInfo = {
            current_page: 1,
            page_size: pageSize,
            total_items: filtered.length,
            total_pages: Math.ceil(filtered.length / pageSize),
            has_next: filtered.length > pageSize,
            has_prev: false
          };
          this.contentLoading = false;
        } else {
          this.loadPaginatedApis();
        }
      }
    },
    
    selectFavoriteApi(fav) {
      // Find full API details from apis data
      let fullApi = null;
      for (const app in this.apis) {
        for (const category in this.apis[app]) {
          const found = this.apis[app][category].find(api => api.path === fav.api_path);
          if (found) {
            fullApi = found;
            break;
          }
        }
        if (fullApi) break;
      }
      
      // Merge favorite with full API details
      this.selectedFavorite = fullApi ? {...fullApi, api_name: fav.api_name, api_path: fav.api_path} : fav;
      this.selectedApp = null;
      this.selectedCategory = null;
      
      this.expandedApis.add(fav.api_path);
    },
    
    toggleApp(appName) {
      if (this.expandedApps.has(appName)) {
        this.expandedApps.delete(appName);
      } else {
        this.expandedApps.add(appName);
      }
    },
    
    isAppExpanded(appName) {
      return this.expandedApps.has(appName);
    },
    
    onSelectCategory(appName, category) {
      if (this.selectedApp !== appName || this.selectedCategory !== category) {
        this.selectedApp = appName;
        this.selectedCategory = category;
        this.selectedFavorite = null;
        this.currentPage = 1;
        
        // Always use API call for proper pagination
        this.contentLoading = true;
        this.loadPaginatedApis();
      }
    },
    
    async loadPaginatedApis() {
      if (!this.selectedApp || !this.selectedCategory) return;
      
      const requestKey = `${this.selectedApp}_${this.selectedCategory}_${this.currentPage}_${this.searchQuery}`;
      if (this.activeRequest === requestKey) return;
      this.activeRequest = requestKey;
      try {
        const url = `/api/method/api_explorer.api.pagination.get_paginated_apis?app_name=${encodeURIComponent(this.selectedApp)}&category=${encodeURIComponent(this.selectedCategory)}&page=${this.currentPage}&search_query=${encodeURIComponent(this.searchQuery)}`;
        
        const response = await fetch(url, { 
          method: 'GET',
          headers: { 'Cache-Control': 'max-age=30' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.message && this.activeRequest === requestKey) {
          this.paginatedApis = data.message.apis;
          this.paginationInfo = data.message.pagination;
          this.paginationSettings = data.message.settings;
        }
      } catch (e) {
        this.paginatedApis = [];
      } finally {
        this.activeRequest = null;
        this.contentLoading = false;
      }
    },
    
    async goToPage(page) {
      if (page >= 1 && page <= this.paginationInfo.total_pages && page !== this.currentPage) {
        this.currentPage = page;
        this.contentLoading = true;
        this.loadPaginatedApis();
      }
    },
    
    async goToPageInput(event) {
      const page = parseInt(event.target.value);
      if (page && page >= 1 && page <= this.paginationInfo.total_pages && page !== this.currentPage) {
        this.currentPage = page;
        this.contentLoading = true;
        this.loadPaginatedApis();
      } else {
        event.target.value = this.currentPage;
      }
    },
    async onToggleFavorite(api) {
      try {
        // Handle both regular API objects and favorite objects
        const apiPath = api.path || api.api_path;
        const apiName = api.name || api.api_name;
        
        const isFavorite = this.isFavorite(api);
        if (isFavorite) {
          // Optimistically update UI first
          this.favorites = this.favorites.filter(f => f.api_path !== apiPath);
          await FavoritesService.removeFavorite(apiPath);
        } else {
          // Optimistically update UI first
          this.favorites.push({api_name: apiName, api_path: apiPath});
          await FavoritesService.addFavorite(apiName, apiPath);
        }
      } catch (e) {
        // Revert on error
        const apiPath = api.path || api.api_path;
        const apiName = api.name || api.api_name;
        const isFavorite = this.favorites.some(f => f.api_path === apiPath);
        if (isFavorite) {
          this.favorites = this.favorites.filter(f => f.api_path !== apiPath);
        } else {
          this.favorites.push({api_name: apiName, api_path: apiPath});
        }
      }
    },
    
    isFavorite(api) {
      const apiPath = api.path || api.api_path;
      return this.favorites.some(f => f.api_path === apiPath);
    },
    
    toggleApi(api) {
      if (this.expandedApis.has(api.path)) {
        this.expandedApis.delete(api.path);
      } else {
        this.expandedApis.add(api.path);
        this.initializeApiParameters(api);
      }
    },
    
    initializeApiParameters(api) {
      if (!this.apiParameters[api.path] && api.parameters) {
        this.apiParameters[api.path] = api.parameters.map(param => ({
          key: param.name || param,
          value: ''
        }));
      }
    },
    
    isApiExpanded(api) {
      return this.expandedApis.has(api.path);
    },
    
    addParam(apiPath) {
      if (!this.apiParameters[apiPath]) {
        this.apiParameters[apiPath] = [];
      }
      this.apiParameters[apiPath].push({ key: '', value: '' });
    },
    
    addFile(apiPath) {
      if (!this.apiFiles[apiPath]) {
        this.apiFiles[apiPath] = [];
      }
      this.apiFiles[apiPath].push({ key: '', fileName: '', type: 'frappe_request', file: null });
    },
    
    removeParam(apiPath, index) {
      if (this.apiParameters[apiPath]) {
        this.apiParameters[apiPath].splice(index, 1);
      }
    },
    
    removeFile(apiPath, index) {
      if (this.apiFiles[apiPath]) {
        this.apiFiles[apiPath].splice(index, 1);
      }
    },
    
    clearAll(apiPath) {
      this.apiParameters[apiPath] = [];
      this.apiFiles[apiPath] = [];
    },
    
    updateParam(apiPath, index, field, value) {
      if (this.apiParameters[apiPath] && this.apiParameters[apiPath][index]) {
        this.apiParameters[apiPath][index][field] = value;
      }
    },
    
    updateFile(apiPath, index, field, value) {
      if (this.apiFiles[apiPath] && this.apiFiles[apiPath][index]) {
        this.apiFiles[apiPath][index][field] = value;
      }
    },
    
    onFileSelect(apiPath, index, event) {
      const file = event.target.files[0];
      if (file && this.apiFiles[apiPath] && this.apiFiles[apiPath][index]) {
        this.apiFiles[apiPath][index].file = file;
        this.apiFiles[apiPath][index].fileName = file.name;
      }
    },
    
    getApiParameters(apiPath) {
      return this.apiParameters[apiPath] || [];
    },
    
    getApiFiles(apiPath) {
      return this.apiFiles[apiPath] || [];
    },
    
    async executeApi(api) {
      this.executingApi = api.path;
      try {
        const params = this.getApiParameters(api.path);
        const files = this.getApiFiles(api.path);
        
        const paramObj = {};
        params.forEach(p => {
          if (p.key && p.value) paramObj[p.key] = p.value;
        });
        
        const response = await ApiService.executeApi(api.path, paramObj, files);
        this.apiResponses[api.path] = response;
      } catch (e) {
        // Store raw error for consistency with backend format
        this.apiResponses[api.path] = { error: e.message, type: 'NetworkError' };
      }
      this.executingApi = null;
    },
    
    getApiResponse(apiPath) {
      return this.apiResponses[apiPath];
    },
    getAppCounts(appData) {
      const publicCount = appData.public ? appData.public.length : 0;
      const internalCount = appData.internal ? appData.internal.length : 0;
      return { public: publicCount, internal: internalCount, total: publicCount + internalCount };
    },
    
    async copyResponse(api) {
      const response = this.getApiResponse(api.path || api.api_path);
      if (!response) return;
      
      const responseText = typeof response.response === 'string' ? response.response : JSON.stringify(response.response, null, 2);
      
      let copyText;
      if (response.formatted_response_on_copy) {
        const params = this.getApiParameters(api.path || api.api_path);
        const paramObj = {};
        params.forEach(p => {
          if (p.key && p.value) paramObj[p.key] = p.value;
        });
        
        const apiPath = api.path || api.api_path;
        const appName = apiPath.split('.')[0] || 'Unknown';
        
        copyText = `Request:
${JSON.stringify(paramObj, null, 2)}

Response:
${responseText}

Details:
App Name: ${appName}
Path: ${apiPath}
Status Code: ${response.status_code}
Time Taken: ${Math.round(response.response_time)}ms`;
      } else {
        copyText = responseText;
      }
      
      try {
        await navigator.clipboard.writeText(copyText);
        CopyService.showNotification('Response copied');
      } catch (e) {
        const textArea = document.createElement('textarea');
        textArea.value = copyText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        CopyService.showNotification('Response copied');
      }
    },
    
    toggleCodeDropdown(apiPath) {
      this.showCodeDropdown[apiPath] = !this.showCodeDropdown[apiPath];
    },
    
    selectCodeType(apiPath, codeType) {
      // Toggle off if same type is clicked
      if (this.selectedCodeType[apiPath] === codeType) {
        this.selectedCodeType[apiPath] = null;
        this.generatedCode[apiPath] = null;
      } else {
        this.selectedCodeType[apiPath] = codeType;
        this.generateCode(apiPath, codeType);
      }
    },
    
    generateCode(apiPath, codeType) {
      const api = this.findApiByPath(apiPath);
      if (!api) return;
      
      const params = this.getApiParameters(apiPath);
      const files = this.getApiFiles(apiPath);
      const paramObj = {};
      params.forEach(p => {
        if (p.key && p.value) paramObj[p.key] = p.value;
      });
      
      const includeTokens = this.settings.include_tokens_in_code;
      const code = CodeGenerator.generateCode(api, paramObj, files, codeType, includeTokens);
      this.generatedCode[apiPath] = code;
    },
    
    async copyCode(apiPath) {
      const code = this.generatedCode[apiPath];
      if (code) {
        await CopyService.copyCode(code);
      }
    },
    
    async copyDocs(apiPath) {
      try {
        const response = await fetch('/api/method/api_explorer.core.openapi.manager.get_api_schema', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Frappe-CSRF-Token': this.getCSRFToken() || ''
          },
          body: `api_path=${encodeURIComponent(apiPath)}`
        });
        
        if (!response.ok) throw new Error('Failed to fetch API documentation');
        
        const data = await response.json();
        const docs = data.message || data;
        await CopyService.copyDocs(docs);
      } catch (e) {
        CopyService.showNotification('Failed to copy documentation');
      }
    },
    
    findApiByPath(apiPath) {
      // Find API in current paginated results or favorites
      if (this.selectedFavorite && (this.selectedFavorite.api_path === apiPath || this.selectedFavorite.path === apiPath)) {
        return this.selectedFavorite;
      }
      
      return this.paginatedApis.find(api => api.path === apiPath) || 
             { path: apiPath, name: apiPath.split('.').pop() };
    }
  },
  
  template: `
    <div class="app">
      <div v-if="loading && !accessDenied" class="setup-screen">
        <div class="setup-container">
          <h1 class="setup-title">Setting up API Explorer</h1>
          <Stepper :steps="steps" />
        </div>
      </div>
      <AccessDenied v-else-if="accessDenied" :reason="accessDeniedReason" />
      
      <div v-else class="main-app">
        <div class="header">
          <div class="header-left">
            <div class="header-title">{{ settings.custom_page_title || 'API Explorer' }}</div>
            <div class="header-desc">{{ settings.custom_page_description || 'Explore and test Frappe APIs' }}</div>
          </div>
          <div class="header-right">
            <div class="header-controls">
              <button class="header-btn" @click="onReload()">Reload</button>
              <button class="header-btn" @click="onLogout()">Logout</button>
            </div>
          </div>
        </div>
        
        <div class="main">
          <div class="sidebar">
          <div class="search-container" v-if="settings.enable_search">
            <div class="search-wrapper">
              <input 
                type="text" 
                class="search-input" 
                placeholder="Search APIs..."
                v-model="searchText"
                @keyup.enter="performSearch"
              >
              <button class="search-button" @click="performSearch">
                ⌕
              </button>
            </div>
          </div>
          
          <div class="nav-tabs" :class="{ 'no-search': !settings.enable_search }">
              <button 
                class="nav-tab" 
                :class="{ active: activeTab === 'apps' }"
                @click="setActiveTab('apps')"
              >
                APPS
              </button>
              <button 
                class="nav-tab" 
                :class="{ active: activeTab === 'favs' }"
                @click="setActiveTab('favs')"
              >
                FAVORITES
              </button>
          </div>
          
          <div class="nav-section">
            <div v-if="loading" class="loading">Loading...</div>
            
            <div v-else-if="activeTab === 'apps'">
              <div v-for="(appData, appName) in apis" :key="appName">
                <div class="app-item" :class="{ expanded: isAppExpanded(appName) }" @click="toggleApp(appName)">
                  <div class="app-name">{{ appName }}</div>
                  <div class="flex items-center gap-1">
                    <div class="app-counts">
                      <span class="count-badge">{{ getAppCounts(appData).total }}</span>
                    </div>
                    <span class="dropdown-icon" :class="{ expanded: isAppExpanded(appName) }">▼</span>
                  </div>
                </div>
                <div v-if="isAppExpanded(appName)" class="category-list">
                  <div v-for="(apis, category) in appData" :key="category" 
                       class="category-item"
                       :class="{ active: selectedApp === appName && selectedCategory === category }"
                       @click.stop="onSelectCategory(appName, category)">
                    <span>{{ category }}</span>
                    <span class="count-badge">{{ apis.length }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else-if="activeTab === 'favs'">
              <div v-for="fav in filteredFavorites" :key="fav.api_path" 
                   class="category-item"
                   :class="{ active: selectedFavorite && selectedFavorite.api_path === fav.api_path }"
                   @click="selectFavoriteApi(fav)">
                <span>{{ fav.api_name }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="content">
          <div class="content-body">
            <div v-if="contentLoading" class="loading-overlay">
              <div class="spinner"></div>
            </div>
            
            <div v-else-if="activeTab === 'apps' && !selectedApp" class="empty-state">
              <div class="empty-title">Select API Category</div>
              <div class="empty-text">Choose from sidebar to explore APIs</div>
            </div>
            
            <div v-else-if="activeTab === 'favs' && !selectedFavorite" class="empty-state">
              <div class="empty-title">Select Favorite API</div>
              <div class="empty-text">Choose from sidebar to test APIs</div>
            </div>
            
            <div v-else-if="activeTab === 'apps' && paginatedApis.length === 0" class="empty-state">
              <div class="empty-title">No APIs Found</div>
              <div class="empty-text">Try adjusting your search</div>
            </div>
            
            <div v-else-if="activeTab === 'favs' && filteredFavorites.length === 0" class="empty-state">
              <div class="empty-title">No Favorites</div>
              <div class="empty-text">Star some APIs to see them here</div>
            </div>
            <div v-else-if="activeTab === 'favs' && selectedFavorite" class="api-list">
              <ApiCard
                :api="selectedFavorite"
                :settings="settings"
                :executingApi="executingApi"
                :selectedCodeType="selectedCodeType"
                :generatedCode="generatedCode"
                :apiParameters="apiParameters"
                :apiFiles="apiFiles"
                :apiResponses="apiResponses"
                :isFavorite="isFavorite(selectedFavorite)"
                :isExpanded="isApiExpanded({path: selectedFavorite.api_path})"
                @toggle="toggleApi({path: selectedFavorite.api_path})"
                @toggleFavorite="onToggleFavorite"
                @addParam="addParam"
                @addFile="addFile"
                @clearAll="clearAll"
                @updateParam="updateParam"
                @updateFile="updateFile"
                @onFileSelect="onFileSelect"
                @removeParam="removeParam"
                @removeFile="removeFile"
                @executeApi="executeApi"
                @copyResponse="copyResponse"
                @selectCodeType="selectCodeType"
                @copyCode="copyCode"
                @copyDocs="copyDocs"
              />
            </div>
            
            <div v-else-if="activeTab === 'apps'" class="api-list" :class="{ 'loading': contentLoading }">
              <div v-if="paginationSettings.enable_pagination && paginationInfo.total_pages > 1" class="pagination-bar">
                <button class="page-btn" @click="goToPage(currentPage - 1)" :disabled="!paginationInfo.has_prev">‹</button>
                <span class="page-info">{{ currentPage }} of {{ paginationInfo.total_pages }}</span>
                <button class="page-btn" @click="goToPage(currentPage + 1)" :disabled="!paginationInfo.has_next">›</button>
                <span class="item-count">{{ paginationInfo.total_items }} items</span>
              </div>
              
              <ApiCard
                v-for="api in paginatedApis"
                :key="api.path"
                :api="api"
                :settings="settings"
                :executingApi="executingApi"
                :selectedCodeType="selectedCodeType"
                :generatedCode="generatedCode"
                :apiParameters="apiParameters"
                :apiFiles="apiFiles"
                :apiResponses="apiResponses"
                :isFavorite="isFavorite(api)"
                :isExpanded="isApiExpanded(api)"
                @toggle="toggleApi"
                @toggleFavorite="onToggleFavorite"
                @addParam="addParam"
                @addFile="addFile"
                @clearAll="clearAll"
                @updateParam="updateParam"
                @updateFile="updateFile"
                @onFileSelect="onFileSelect"
                @removeParam="removeParam"
                @removeFile="removeFile"
                @executeApi="executeApi"
                @copyResponse="copyResponse"
                @selectCodeType="selectCodeType"
                @copyCode="copyCode"
                @copyDocs="copyDocs"
              />
              
              <div v-if="paginationSettings.enable_pagination && paginationInfo.total_pages > 1" class="pagination-bar">
                <button class="page-btn" @click="goToPage(currentPage - 1)" :disabled="!paginationInfo.has_prev">‹</button>
                <span class="page-info">{{ currentPage }} of {{ paginationInfo.total_pages }}</span>
                <button class="page-btn" @click="goToPage(currentPage + 1)" :disabled="!paginationInfo.has_next">›</button>
                <span class="item-count">{{ paginationInfo.total_items }} items</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  `
};

export default App;