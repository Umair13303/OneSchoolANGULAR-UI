import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div style="text-align:center;padding:80px 24px">
      <h1 style="font-size:64px;margin:0">🚫</h1>
      <h2 style="color:#1a3c5e">Access Denied</h2>
      <p style="color:#666">You do not have permission to view this page.</p>
      <a routerLink="/dashboard" style="color:#2d6a9f">← Back to Dashboard</a>
    </div>
  `
})
export class UnauthorizedComponent {}
