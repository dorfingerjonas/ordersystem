import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { installZoomGuard } from './app/utils/zoom-guard';

installZoomGuard();

// the install prompt can fire before Angular is ready -> keep it for InstallService
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window.__installPrompt = e as never;
}, { once: true });

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
