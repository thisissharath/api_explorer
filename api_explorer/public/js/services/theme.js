class ThemeService {
  static init() {
    const isDark = localStorage.getItem('api_explorer_dark_mode') === 'true';
    this.setDarkMode(isDark);
    return isDark;
  }

  static toggle() {
    const isDark = !document.body.classList.contains('dark-mode');
    this.setDarkMode(isDark);
    return isDark;
  }

  static setDarkMode(isDark) {
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('api_explorer_dark_mode', isDark.toString());
  }

  static isDarkMode() {
    return document.body.classList.contains('dark-mode');
  }
}

export default ThemeService;