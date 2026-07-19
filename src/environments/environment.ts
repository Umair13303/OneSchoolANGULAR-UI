// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL API CONFIGURATION
// Change apiUrl and fileServerUrl here — every service in the app picks it up.
// ─────────────────────────────────────────────────────────────────────────────
export const environment = {
  production: false,

  // Backend API base URL  (no trailing slash)
  apiUrl: 'https://demooneschoolbe.runasp.net/api',

  // File / media server URL  (no trailing slash)
  fileServerUrl: 'http://localhost:5002/api',

  // Derived: server root without /api  — use for building image/file URLs
  get serverUrl() { return this.apiUrl.replace('/api', ''); }
};
