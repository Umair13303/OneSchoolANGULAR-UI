import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  template: `<p style="padding:2rem;font-family:sans-serif">{{msg}}</p>`
})
export class AutoLoginComponent implements OnInit {
  msg = 'Logging in...';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const p = this.route.snapshot.queryParamMap;
    const token   = p.get('t');
    const refresh = p.get('r');
    const user    = p.get('u');

    if (token && refresh && user) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('auth_user', decodeURIComponent(user));
      this.msg = 'Login successful! Redirecting...';
      this.router.navigate(['/dashboard']);
    } else {
      this.msg = 'Missing parameters.';
    }
  }
}
