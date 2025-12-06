class UIService {
  static applySettings(settings) {
    if (settings.custom_page_title) {
      document.title = settings.custom_page_title;
    }
    
    if (settings.font_family) {
      const fontFamily = settings.font_family === 'System Default' 
        ? '-apple-system, BlinkMacSystemFont, sans-serif'
        : `'${settings.font_family}', -apple-system, BlinkMacSystemFont, sans-serif`;
      
      document.body.style.setProperty('font-family', fontFamily, 'important');
      document.documentElement.style.setProperty('font-family', fontFamily, 'important');
      document.body.offsetHeight;
    }
  }
}

export default UIService;
