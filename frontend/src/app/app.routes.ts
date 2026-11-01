import type { Routes } from '@angular/router';
import { requiereSesion, soloSinSesion } from './core/http/sesion.guard';

export const routes: Routes = [
  {
    path: 'ingresar',
    title: 'Ingresar · Rol de Turnos',
    canActivate: [soloSinSesion],
    loadComponent: () => import('./features/ingreso/ingreso-page').then((m) => m.IngresoPage),
  },
  {
    // Todo el sistema queda detrás del PIN.
    path: '',
    canActivateChild: [requiereSesion],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'rol' },
      {
        path: 'rol',
        title: 'Rol del mes · Rol de Turnos',
        loadComponent: () => import('./features/rol/rol-page').then((m) => m.RolPage),
      },
      {
        path: 'personal',
        title: 'Personal · Rol de Turnos',
        loadComponent: () => import('./features/personal/personal-page').then((m) => m.PersonalPage),
      },
      {
        path: 'sedes',
        title: 'Sedes · Rol de Turnos',
        loadComponent: () => import('./features/sedes/sedes-page').then((m) => m.SedesPage),
      },
      {
        path: 'feriados',
        title: 'Feriados · Rol de Turnos',
        loadComponent: () => import('./features/feriados/feriados-page').then((m) => m.FeriadosPage),
      },
      {
        path: 'descargas',
        title: 'Descargas · Rol de Turnos',
        loadComponent: () => import('./features/descargas/descargas-page').then((m) => m.DescargasPage),
      },
      {
        path: 'importar',
        title: 'Importar desde Excel · Rol de Turnos',
        loadComponent: () => import('./features/importar/importar-page').then((m) => m.ImportarPage),
      },
    ],
  },
  { path: '**', redirectTo: 'rol' },
];
