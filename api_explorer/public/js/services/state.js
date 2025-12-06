class StateManager {
  constructor() {
    this.state = {
      loading: true,
      contentLoading: false,
      accessDenied: false,
      accessDeniedReason: '',
      apis: {},
      favorites: [],
      searchQuery: '',
      searchText: '',
      selectedApp: null,
      selectedCategory: null,
      selectedFavorite: null,
      expandedApps: new Set(),
      expandedApis: new Set(),
      apiParameters: {},
      apiFiles: {},
      executingApi: null,
      apiResponses: {},
      activeTab: 'apps',
      settings: {
        language: 'English',
        font_family: 'Poppins',
        items_per_page: 20,
        enable_search: 1,
        custom_page_title: '',
        custom_page_description: '',
        sidebar_width_pixels: 260
      },
      currentPage: 1,
      paginatedApis: [],
      paginationInfo: {},
      paginationSettings: {},
      activeRequest: null
    };
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
  }

  update(updates) {
    Object.assign(this.state, updates);
  }

  reset() {
    this.state.selectedApp = null;
    this.state.selectedCategory = null;
    this.state.selectedFavorite = null;
  }
}

export default StateManager;