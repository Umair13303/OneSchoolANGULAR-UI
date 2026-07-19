// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION API CONFIGURATION
// Used automatically by `ng build` / `ng build --configuration production`
// (wired up via angular.json fileReplacements).
//
// TODO: once the backend is deployed, replace these placeholders with your
// real public domain/IP, e.g.:
//   apiUrl: 'https://api.yourschoolapp.com/api'
//   fileServerUrl: 'https://files.yourschoolapp.com/api'
// Use HTTPS in production — plain http:// will be blocked by browsers/mobile
// OS network security policies once real users are involved.
// ─────────────────────────────────────────────────────────────────────────────
export const environment = {
  production: true,
  
  apiUrl: 'https://demooneschoolbe.runasp.net/api',

  fileServerUrl: 'https://REPLACE_WITH_YOUR_FILESERVER_DOMAIN/api',

  get serverUrl() { return this.apiUrl.replace('/api', ''); }
};
