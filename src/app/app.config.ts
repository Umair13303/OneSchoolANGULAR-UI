import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeEnGB from '@angular/common/locales/en-GB';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';

// en-GB locale so all date pipes render day-first (dd/MM/yyyy) instead of US mm/dd/yyyy.
registerLocaleData(localeEnGB);

/** Map Aura tokens to OneSchool brand + form sizing */
const OneSchoolPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef1ff',
      100: '#dce3ff',
      200: '#b9c7ff',
      300: '#96abff',
      400: '#738fff',
      500: '#4f6ef7',
      600: '#3d5ce5',
      700: '#2a44cc',
      800: '#1e3399',
      900: '#142266',
      950: '#0c1340'
    },
    colorScheme: {
      light: {
        formField: {
          paddingX: '0.875rem',
          paddingY: '0.625rem',
          borderRadius: '8px',
          background: '{surface.0}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{primary.400}',
          focusBorderColor: '{primary.500}'
        }
      },
      dark: {
        formField: {
          paddingX: '0.875rem',
          paddingY: '0.625rem',
          borderRadius: '8px'
        }
      }
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor, timeoutInterceptor])),
    provideAnimationsAsync(),
    MessageService,
    ConfirmationService,
    providePrimeNG({
      theme: {
        preset: OneSchoolPreset,
        options: {
          // Match OneSchool theme toggle: <html data-theme="dark|light">
          darkModeSelector: '[data-theme="dark"]',
          cssLayer: {
            name: 'primeng',
            // Must match real Tailwind v4 layers in styles.tailwind.css
            // (theme, base, components, utilities) — wrong names left
            // PrimeNG under the unlayered * reset and killed padding.
            order: 'theme, base, components, primeng, utilities'
          }
        }
      }
    }),
    { provide: LOCALE_ID, useValue: 'en-GB' }
  ]
};
