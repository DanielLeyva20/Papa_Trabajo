import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
  withViewTransitions,
  type NavigationError,
} from '@angular/router';
import { routes } from './app.routes';
import { erroresInterceptor } from './core/http/errores.interceptor';

/**
 * Si se publica una versión nueva mientras la página está abierta, los archivos de la versión
 * anterior ya no existen y la navegación falla sin avisar. En ese caso se recarga la página
 * en la dirección a la que se iba (lo mismo que hacer F5, pero automático).
 */
function recargarSiFaltaUnArchivo(error: NavigationError): void {
  const mensaje = String((error.error as Error | undefined)?.message ?? error.error);
  if (/dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically/i.test(mensaje)) {
    window.location.assign(error.url);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([erroresInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withViewTransitions({ skipInitialTransition: true }),
      withNavigationErrorHandler(recargarSiFaltaUnArchivo),
    ),
  ],
};
