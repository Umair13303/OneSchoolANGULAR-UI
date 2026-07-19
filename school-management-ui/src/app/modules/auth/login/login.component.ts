import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { SwalNotificationService } from '../../../core/services/swal-notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;

  /** Product name — fixed, not vendor-configurable (that's companyName below). */
  readonly appName = 'OneSkool';
  currentYear = new Date().getFullYear();

  /** Vendor/company credit for the "Powered by" line. */
  companyName = 'Dev Solutions';
  companyLogoUrl = '/branding/dev-solutions-logo.png';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private settingsSvc: SettingsService,
    private swal: SwalNotificationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    if (this.authService.isLoggedIn()) this.router.navigate(['/dashboard']);
  }

  ngOnInit() {
    this.settingsSvc.getAppInfo().subscribe({
      next: r => {
        this.companyName = r.appName || this.companyName;
        this.companyLogoUrl = r.logoUrl || this.companyLogoUrl;
      }
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        const user = this.authService.currentUser();
        if (user) this.swal.loginToast(user.fullName, user.role);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.errorMessage = err.error?.message ?? 'Invalid email or password.';
        } else if (err.status === 0) {
          this.errorMessage = 'Cannot reach the server. Check your connection and try again.';
        } else {
          this.errorMessage = 'Something went wrong on our end. Please try again in a moment.';
        }
        this.loading = false;
      }
    });
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
