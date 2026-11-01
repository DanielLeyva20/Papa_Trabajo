import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Sesion } from '../services/sesion';

/** Las pantallas del sistema solo se ven después de ingresar el PIN. */
export const requiereSesion: CanActivateFn = async (_ruta, estado) => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  return (await sesion.verificar()) ? true : router.createUrlTree(['/ingresar'], { queryParams: { volver: estado.url } });
};

/** Si ya ingresó, la pantalla del PIN lo lleva directo al rol. */
export const soloSinSesion: CanActivateFn = async () => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  return (await sesion.verificar()) ? router.createUrlTree(['/rol']) : true;
};
