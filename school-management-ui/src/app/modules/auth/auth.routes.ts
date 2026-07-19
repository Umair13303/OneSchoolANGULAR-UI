import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auto-login',
    loadComponent: () => import('./auto-login.component').then(m => m.AutoLoginComponent)
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
