import { ApplicationConfig, isDevMode, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de-AT';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../environments/environment';
import { OrderSystemTheme } from './ui-theme';
import { routes } from './app.routes';

registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation(), withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: LOCALE_ID, useValue: 'de-AT' },
    MessageService,
    ConfirmationService,
    providePrimeNG({
      license: environment.primeNgLicense,
      ripple: true,
      theme: {
        preset: OrderSystemTheme,
        options: {
          darkModeSelector: false,
          cssLayer: { name: 'primeng', order: 'base, primeng, app' }
        }
      },
      translation: {
        accept: 'Ja',
        reject: 'Nein',
        cancel: 'Abbrechen',
        clear: 'Leeren',
        apply: 'Übernehmen',
        emptyMessage: 'Keine Einträge',
        emptySearchMessage: 'Nichts gefunden',
        passwordPrompt: 'Passwort eingeben',
        weak: 'Schwach',
        medium: 'Mittel',
        strong: 'Stark'
      }
    })
  ]
};
