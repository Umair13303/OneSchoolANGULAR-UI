import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Teacher Android app shell — wraps the existing Angular UI.
 * Build web first (`npm run build`), then `npx cap sync android`.
 */
const config: CapacitorConfig = {
  appId: 'com.oneschool.teacher',
  appName: 'OneSchool Teacher',
  webDir: 'dist/school-management-ui/browser',
  server: {
    // Production API is HTTPS; keep androidScheme https-friendly.
    androidScheme: 'https',
    allowNavigation: [
      'https://demooneschoolbe.runasp.net/*',
      'https://demooneschoolfe.runasp.net/*',
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
