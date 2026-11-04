// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL API CONFIGURATION
// Change apiUrl and fileServerUrl here — every service in the app picks it up.
// ─────────────────────────────────────────────────────────────────────────────
export const environment = {
  production: false,



  // Backend API base URL  (no trailing slash)
  apiUrl: 'http://localhost:5000/api',

  // Local: use Hub files proxy (same as api) so uploads work without a local FileServer.
  fileServerUrl: 'http://localhost:5000/api',

  // Derived: server root without /api  — use for building image/file URLs
  get serverUrl() { return this.apiUrl.replace('/api', ''); }
};
