const AccessDenied = {
  props: ['reason'],
  template: `
    <div class="access-denied-screen">
      <div class="access-denied-container">
        <div class="access-denied-icon">🚫</div>
        <h1 class="access-denied-title">Access Denied</h1>
        <p class="access-denied-message">{{ reason || 'You do not have permission to access API Explorer' }}</p>
      </div>
    </div>
  `
};

export default AccessDenied;