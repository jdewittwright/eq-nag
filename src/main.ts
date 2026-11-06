import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import 'src/types/custom';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  // Nag relies on zone.js to update views after IPC callbacks.
  applicationProviders: [ provideZoneChangeDetection() ],
})
  .catch(err => console.error(err));
