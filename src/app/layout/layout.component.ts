import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, IsActiveMatchOptions, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { MenuService } from '../core/services/menu.service';
import { ThemeService, ThemeMode } from '../core/services/theme.service';
import { SettingsService } from '../core/services/settings.service';
import { SetupNotificationService } from '../core/services/setup-notification.service';
import { InstituteService } from '../core/services/institute.service';
import { ChatPanelComponent } from '../shared/components/chat-panel/chat-panel.component';
import { ChatService } from '../core/services/chat.service';
import { SwalNotificationService } from '../core/services/swal-notification.service';
import { MenuItemTree } from '../core/models/menu.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatPanelComponent],
  template: `
    <div class="shell">

      <!-- Mobile overlay backdrop -->
      @if (mobileOpen()) {
        <div class="mob-backdrop" (click)="mobileOpen.set(false)"></div>
      }

      <aside class="sidebar" [class.collapsed]="collapsed()" [class.mob-open]="mobileOpen()">
        <div class="sidebar-glow" aria-hidden="true"></div>

        <div class="brand">
          <div class="brand-mark">
            @if (instituteLogo()) {
              <img [src]="instituteLogo()" alt="logo" class="brand-logo-img" />
            } @else {
              <img src="/branding/oneskool-logo.png" alt="OneSkool" class="brand-logo-img" />
            }
          </div>
          @if (!collapsed()) {
            <div class="brand-copy">
              <span class="brand-name">{{ instituteName() }}</span>
              <span class="brand-tag">{{ instituteTagline() }}</span>
            </div>
          }
          <!-- Close button on mobile -->
          <button class="mob-close" (click)="mobileOpen.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <nav class="nav">

          <!-- Superadmin system section -->
          @if (isSuperAdmin() && sysMenuItems().length > 0) {
            @if (!collapsed()) {
              <div class="nav-section-label">System</div>
            }
            @for (item of sysMenuItems(); track item.menuItemId) {
              <a [routerLink]="item.routeUrl" routerLinkActive="active"
                 class="nav-item" [title]="item.title"
                 (click)="mobileOpen.set(false)">
                <span class="ni-well"><span class="ni material-icons-round">{{ item.icon }}</span></span>
                @if (!collapsed()) { <span class="nl">{{ item.title }}</span> }
              </a>
            }
            <div class="nav-divider"></div>
          }

          <!-- Main menu -->
          @if (!collapsed() && isSuperAdmin() && sysMenuItems().length > 0) {
            <div class="nav-section-label">Main Menu</div>
          }
          @for (item of mainMenuItems(); track item.menuItemId) {
            @if (!item.children || item.children.length === 0) {
              <a [routerLink]="item.routeUrl || '/dashboard'" routerLinkActive="active"
                 class="nav-item" [title]="item.title"
                 (click)="onNavLeafClick()">
                <span class="ni-well"><span class="ni material-icons-round">{{ item.icon }}</span></span>
                @if (!collapsed()) { <span class="nl">{{ item.title }}</span> }
              </a>
            } @else {
              <div class="nav-group" [class.open]="open().has(item.menuItemId)">
                <button class="nav-item nav-parent"
                        type="button"
                        [class.open]="open().has(item.menuItemId)"
                        [class.active]="isGroupActive(item)"
                        [title]="item.title"
                        (click)="onParentClick(item)">
                  <span class="ni-well"><span class="ni material-icons-round">{{ item.icon }}</span></span>
                  @if (!collapsed()) {
                    <span class="nl">{{ item.title }}</span>
                    <span class="material-icons-round caret">expand_more</span>
                  }
                </button>

                @if (open().has(item.menuItemId) && !collapsed()) {
                  <div class="nav-sub">
                    @for (child of item.children; track child.menuItemId) {
                      <a [routerLink]="child.routeUrl" routerLinkActive="active"
                         class="nav-sub-item" (click)="onNavLeafClick()">
                        <span class="material-icons-round sub-icon">{{ child.icon }}</span>
                        <span class="sub-label">{{ child.title }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            }
          }
        </nav>

        <div class="sidebar-foot">
          <button class="toggle-btn" type="button" (click)="toggleCollapsed()" title="{{ collapsed() ? 'Expand menu' : 'Collapse menu' }}">
            <span class="material-icons-round">{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</span>
            @if (!collapsed()) {
              <span class="toggle-label">Collapse</span>
            }
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <div class="topbar-l">
            <button class="mob-menu-btn" (click)="mobileOpen.set(true)" title="Menu">
              <span class="material-icons-round">menu</span>
            </button>
            <span class="page-date">{{ today }}</span>
          </div>
          <div class="topbar-r">

            <!-- Theme picker -->
            <div class="theme-wrap" [class.open]="themeOpen()" (click)="$event.stopPropagation()">
              <button class="icon-btn" (click)="themeOpen.set(!themeOpen())" title="Theme">
                <span class="material-icons-round">{{ theme.mode() === 'dark' ? 'dark_mode' : theme.mode() === 'system' ? 'brightness_auto' : 'light_mode' }}</span>
              </button>
              @if (themeOpen()) {
                <div class="theme-panel" (click)="$event.stopPropagation()">
                  <p class="theme-panel-title">Appearance</p>
                  <div class="theme-swatches">
                    @for (opt of themeOptions; track opt.value) {
                      <button class="swatch {{ opt.swatchClass }}" [class.active]="theme.mode() === opt.value"
                              (click)="setTheme(opt.value)" [title]="opt.label">
                        @if (theme.mode() === opt.value) {
                          <span class="material-icons-round">check</span>
                        }
                      </button>
                    }
                  </div>
                  <div class="theme-opts">
                    @for (opt of themeOptions; track opt.value) {
                      <button class="theme-opt" [class.active]="theme.mode() === opt.value" (click)="setTheme(opt.value)">
                        <span class="material-icons-round">{{ opt.icon }}</span>
                        <div class="theme-opt-text">
                          <span class="theme-opt-label">{{ opt.label }}</span>
                          <span class="theme-opt-desc">{{ opt.desc }}</span>
                        </div>
                        @if (theme.mode() === opt.value) {
                          <span class="material-icons-round theme-check">check_circle</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Setup Notifications -->
            <div class="notif-wrap" [class.open]="notifOpen()" (click)="$event.stopPropagation()">
              <button class="icon-btn notif-trigger" (click)="toggleNotif()" title="Notifications">
                <span class="material-icons-round">notifications</span>
                @if (totalNotifCount() > 0) {
                  <span class="notif-dot">{{ totalNotifCount() }}</span>
                }
              </button>

              @if (notifOpen()) {
                  <div class="notif-panel" (click)="$event.stopPropagation()">

                    <div class="np-head">
                      <div class="np-head-left">
                        <span class="material-icons-round np-bell">notifications_active</span>
                        <div>
                          <p class="np-title">Notifications</p>
                          <p class="np-sub">
                            @if (totalNotifCount() > 0) { {{ totalNotifCount() }} unread }
                            @else { All caught up! }
                          </p>
                        </div>
                      </div>
                      <div style="display:flex;align-items:center;gap:6px">
                        <!-- Alert toggle -->
                        <button class="np-refresh np-alert-toggle"
                                [class.alerts-off]="!swalSvc.enabled()"
                                (click)="swalSvc.toggle()"
                                [title]="swalSvc.enabled() ? 'Mute pop-up alerts' : 'Enable pop-up alerts'">
                          <span class="material-icons-round">{{ swalSvc.enabled() ? 'notifications_active' : 'notifications_off' }}</span>
                        </button>
                        <button class="np-refresh" (click)="notifSvc.load(true); chatSvc.loadUsers()" title="Refresh">
                          <span class="material-icons-round" [class.spin]="notifSvc.loading()">refresh</span>
                        </button>
                      </div>
                    </div>

                    <!-- ── Unread messages section ── -->
                    @if (unreadChatConvs().length > 0) {
                      <div class="np-section-label">
                        <span class="material-icons-round">chat</span> New Messages
                      </div>
                      @for (c of unreadChatConvs(); track c.conversationId) {
                        <div class="np-item np-chat-item" (click)="openChat(c.conversationId)">
                          <div class="chat-avatar">{{ chatInitials(c.name) }}</div>
                          <div class="np-item-body">
                            <p class="np-item-title">{{ c.name }}</p>
                            <p class="np-item-desc">{{ c.lastMessage }}</p>
                          </div>
                          <span class="chat-unread-badge">{{ c.unreadCount }}</span>
                        </div>
                      }
                    }

                    <!-- ── Setup checklist section ── -->
                    @if (notifSvc.count() > 0) {
                      <div class="np-section-label">
                        <span class="material-icons-round">checklist</span> Setup Checklist
                      </div>
                      <div class="np-list">
                        @for (n of notifSvc.notifications(); track n.id) {
                          <div class="np-item">
                            <div class="np-item-icon np-ic-{{ n.iconColor }}">
                              <span class="material-icons-round">{{ n.icon }}</span>
                            </div>
                            <div class="np-item-body">
                              <p class="np-item-title">{{ n.title }}</p>
                              <p class="np-item-desc">{{ n.desc }}</p>
                              <button class="np-item-link" (click)="goTo(n.route)">
                                Fix Now <span class="material-icons-round">arrow_forward</span>
                              </button>
                            </div>
                            <button class="np-dismiss" (click)="notifSvc.dismiss(n.id)" title="Dismiss">
                              <span class="material-icons-round">close</span>
                            </button>
                          </div>
                        }
                      </div>
                    }

                    @if (totalNotifCount() === 0 && !notifSvc.loading()) {
                      <div class="np-empty">
                        <span class="material-icons-round np-empty-icon">check_circle</span>
                        <p class="np-empty-title">All Set!</p>
                        <p class="np-empty-sub">No notifications right now.</p>
                      </div>
                    }

                    @if (notifSvc.loading()) {
                      <div class="np-loading">
                        <span class="material-icons-round spin">refresh</span> Checking…
                      </div>
                    }

                  </div>
                }
              </div>

            <div class="user-wrap" [class.open]="userMenuOpen()" (click)="$event.stopPropagation()">
              <button type="button" class="user-pill" (click)="toggleUserMenu()" title="Account">
                <div class="u-av">
                  @if (avatarUrl(); as url) {
                    <img [src]="url" alt="" />
                  } @else {
                    {{ initials() }}
                  }
                </div>
                <div class="u-meta">
                  <span class="u-name">{{ auth.currentUser()?.fullName }}</span>
                  <span class="u-role">{{ auth.currentUser()?.role | titlecase }}</span>
                </div>
                <span class="material-icons-round u-chev">expand_more</span>
              </button>
              @if (userMenuOpen()) {
                <div class="user-menu" (click)="$event.stopPropagation()">
                  <button type="button" class="um-item" (click)="goProfile()">
                    <span class="material-icons-round">person</span> My Profile
                  </button>
                  <button type="button" class="um-item danger" (click)="auth.logout()">
                    <span class="material-icons-round">logout</span> Sign out
                  </button>
                </div>
              }
            </div>
            <button class="sign-out" (click)="auth.logout()" title="Sign out">
              <span class="material-icons-round">logout</span>
            </button>
          </div>
        </header>

        <main class="page-content" [class.has-chat-fab]="showChatPanel()">
          <router-outlet />
        </main>
      </div>

    </div>

    <!-- Floating chat only on dashboard — elsewhere it covers page actions. -->
    @if (showChatPanel()) {
      <app-chat-panel />
    }
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
      background: transparent;
    }

    /* ═══ SIDEBAR ═══════════════════════════════════════ */
    .sidebar {
      --sb-pad-x: 12px;
      width: 260px;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, var(--surface)) 0%, var(--surface) 28%, var(--surface-2) 100%);
      border-right: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
      display: flex; flex-direction: column;
      flex-shrink: 0;
      transition: width 0.28s cubic-bezier(.4,0,.2,1);
      position: relative; z-index: var(--z-sidebar);
      box-shadow:
        1px 0 0 color-mix(in srgb, var(--accent) 6%, transparent),
        8px 0 28px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }
    .sidebar-glow {
      pointer-events: none;
      position: absolute; inset: 0 auto auto 0;
      width: 180px; height: 160px;
      background: radial-gradient(circle at 20% 10%, rgba(var(--accent-rgb), 0.16), transparent 68%);
      opacity: 0.9;
    }
    .sidebar.collapsed { width: 76px; }
    .sidebar.collapsed .brand {
      justify-content: center;
      padding: 18px 12px 14px;
    }
    .sidebar.collapsed .brand-copy { display: none; }
    .sidebar.collapsed .nav {
      padding: 8px 10px 12px;
      align-items: stretch;
    }
    .sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 10px 0;
      gap: 0;
    }
    .sidebar.collapsed .ni-well { margin: 0; }
    .sidebar.collapsed .sidebar-foot { padding: 8px 10px 14px; }
    .sidebar.collapsed .toggle-btn { justify-content: center; padding: 10px; }

    /* Brand */
    .brand {
      position: relative;
      display: flex; align-items: center; gap: 12px;
      padding: 18px 14px 16px 16px;
      overflow: hidden; white-space: nowrap; min-height: 72px;
      flex-shrink: 0;
    }
    .brand::after {
      content: '';
      position: absolute; left: 16px; right: 16px; bottom: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border) 18%, var(--border) 82%, transparent);
    }
    .brand-mark {
      width: 40px; height: 40px; border-radius: 12px;
      background:
        linear-gradient(145deg, color-mix(in srgb, var(--accent) 18%, var(--surface)), color-mix(in srgb, var(--accent-h) 12%, var(--surface)));
      border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow:
        0 1px 0 color-mix(in srgb, var(--surface) 70%, transparent) inset,
        0 8px 18px rgba(var(--accent-rgb), 0.18);
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }
    .sidebar:not(.collapsed) .brand:hover .brand-mark {
      transform: translateY(-1px);
      box-shadow:
        0 1px 0 color-mix(in srgb, var(--surface) 75%, transparent) inset,
        0 10px 22px rgba(var(--accent-rgb), 0.24);
    }
    .brand-mark .material-icons-round { font-size: 20px; color: #fff; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24; }
    .brand-logo-img { width: 28px; height: 28px; object-fit: contain; border-radius: 7px; }
    .brand-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .brand-name {
      font-size: 14.5px; font-weight: 700; color: var(--t1);
      letter-spacing: -0.35px; display: block; line-height: 1.2;
      overflow: hidden; text-overflow: ellipsis;
    }
    .brand-tag {
      font-size: 9.5px; color: var(--t4); letter-spacing: 0.72px;
      text-transform: uppercase; display: block; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis;
    }

    /* Nav */
    .nav {
      position: relative;
      flex: 1;
      padding: 12px var(--sb-pad-x) 8px;
      overflow-y: auto; overflow-x: hidden;
      display: flex; flex-direction: column; gap: 3px;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, var(--t5) 70%, transparent) transparent;
    }
    .nav::-webkit-scrollbar { width: 5px; }
    .nav::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--t5) 75%, transparent);
      border-radius: 99px;
    }
    .nav-section-label {
      font-size: 10px; font-weight: 700; color: var(--t4);
      text-transform: uppercase; letter-spacing: 1.05px;
      padding: 12px 10px 6px;
    }
    .nav-divider {
      height: 1px; margin: 8px 8px;
      background: linear-gradient(90deg, transparent, var(--border), transparent);
    }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 8px 8px 8px;
      color: var(--t3);
      text-decoration: none; font-size: 13.25px; font-weight: 500;
      border-radius: 12px; white-space: nowrap;
      border: 1px solid transparent; background: transparent;
      cursor: pointer; width: 100%; text-align: left;
      transition:
        color 0.16s ease,
        background 0.16s ease,
        border-color 0.16s ease,
        box-shadow 0.18s ease,
        transform 0.16s ease;
      position: relative; font-family: inherit;
    }
    .nav-item:hover {
      color: var(--t1);
      background: color-mix(in srgb, var(--surface) 70%, transparent);
      border-color: color-mix(in srgb, var(--border) 70%, transparent);
    }
    .nav-item.active {
      color: var(--accent-d);
      background: linear-gradient(135deg, var(--accent-s), color-mix(in srgb, var(--accent-s) 55%, var(--surface)));
      border-color: color-mix(in srgb, var(--accent) 18%, transparent);
      font-weight: 600;
      box-shadow:
        0 1px 0 color-mix(in srgb, var(--surface) 65%, transparent) inset,
        0 6px 14px rgba(var(--accent-rgb), 0.10);
    }
    .nav-item.active::before {
      content: '';
      position: absolute; left: 0; top: 18%; bottom: 18%;
      width: 3px; border-radius: 0 4px 4px 0;
      background: linear-gradient(180deg, var(--accent), var(--accent-h));
      box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.35);
    }

    .ni-well {
      width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--surface-3) 70%, transparent);
      transition: background 0.16s ease, transform 0.16s ease;
    }
    .nav-item:hover .ni-well {
      background: color-mix(in srgb, var(--accent) 10%, var(--surface-2));
      transform: translateY(-0.5px);
    }
    .nav-item.active .ni-well {
      background: color-mix(in srgb, var(--accent) 16%, var(--surface));
      box-shadow: 0 1px 0 color-mix(in srgb, var(--surface) 70%, transparent) inset;
    }
    .ni {
      font-size: 18px; line-height: 1;
      color: var(--t4);
      transition: color 0.15s;
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    }
    .nav-item:hover .ni { color: var(--t2); }
    .nav-item.active .ni {
      color: var(--accent);
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .nl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .caret {
      font-size: 18px; margin-left: auto; color: var(--t5);
      transition: transform 0.24s cubic-bezier(.4,0,.2,1), color 0.16s;
    }
    .nav-parent.open .caret,
    .nav-parent.active .caret { color: var(--accent); }
    .nav-parent.open .caret { transform: rotate(180deg); }

    .nav-group { position: relative; }

    .nav-sub {
      margin: 2px 0 6px 23px;
      display: flex; flex-direction: column; gap: 2px;
      border-left: 2px solid color-mix(in srgb, var(--accent) 16%, var(--border));
      padding: 2px 0 2px 10px;
      animation: navSubIn 0.2s cubic-bezier(.22,1,.36,1);
    }
    @keyframes navSubIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .nav-sub-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px;
      color: var(--t3);
      font-size: 12.75px; font-weight: 500;
      text-decoration: none; border-radius: 10px;
      border: 1px solid transparent;
      transition: color 0.15s, background 0.15s, border-color 0.15s;
    }
    .nav-sub-item:hover {
      color: var(--t1);
      background: color-mix(in srgb, var(--surface) 80%, transparent);
      border-color: color-mix(in srgb, var(--border) 65%, transparent);
    }
    .nav-sub-item.active {
      color: var(--accent-d);
      font-weight: 600;
      background: var(--accent-s);
      border-color: color-mix(in srgb, var(--accent) 14%, transparent);
    }
    .sub-icon {
      font-size: 15px; color: var(--t4);
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
      transition: color 0.15s;
    }
    .nav-sub-item:hover .sub-icon { color: var(--t2); }
    .nav-sub-item.active .sub-icon {
      color: var(--accent);
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20;
    }
    .sub-label { overflow: hidden; text-overflow: ellipsis; }

    /* Collapse footer */
    .sidebar-foot {
      flex-shrink: 0;
      padding: 8px var(--sb-pad-x) 14px;
      position: relative;
    }
    .sidebar-foot::before {
      content: '';
      position: absolute; left: 16px; right: 16px; top: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border), transparent);
    }
    .toggle-btn {
      margin-top: 8px;
      width: 100%;
      padding: 9px 12px;
      border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
      background: color-mix(in srgb, var(--surface) 85%, transparent);
      color: var(--t3); border-radius: 11px; cursor: pointer;
      display: flex; align-items: center; justify-content: flex-start; gap: 8px;
      transition: all 0.16s ease; font-family: inherit;
      backdrop-filter: blur(6px);
    }
    .toggle-btn .material-icons-round { font-size: 18px; }
    .toggle-label { font-size: 12px; font-weight: 600; letter-spacing: 0.01em; }
    .toggle-btn:hover {
      background: var(--accent-s);
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 22%, transparent);
      box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.10);
    }

    /* ═══ MAIN ═══════════════════════════════════════ */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background-color: var(--bg);
      background-image:
        radial-gradient(900px 420px at 80% -8%, color-mix(in srgb, var(--accent) 5%, transparent), transparent 55%),
        linear-gradient(180deg, color-mix(in srgb, var(--bg-glow, #f5f8fc) 80%, transparent), transparent 220px);
    }

    /* 62px -> 56px. The bar carries a date string, theme, notifications and
       the user pill; 56px holds all of it and returns 6px to content. */
    .topbar {
      height: 56px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      /* Gutter matches .page-content so the bar's contents line up with the
         page title below it; previously 28px against a 28px page padding,
         now both 20px. */
      padding: 0 20px;
      display: flex; align-items: center; justify-content: space-between;
      /* Was z-index 10, which a sticky form footer (100) painted over.
         The ladder in styles.scss now orders these deliberately. */
      position: sticky; top: 0; z-index: var(--z-topbar); flex-shrink: 0;
      box-shadow: var(--sh-xs);
    }
    .topbar-l { display: flex; align-items: center; gap: 12px; }
    .page-date { font-size: 12px; color: var(--t4); font-weight: 500; }
    .topbar-r { display: flex; align-items: center; gap: 8px; }

    /* User pill */
    .user-wrap { position: relative; }
    .user-pill {
      display: flex; align-items: center; gap: 9px;
      padding: 5px 12px 5px 5px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 99px; cursor: pointer;
      transition: all 0.15s; font: inherit;
    }
    .user-pill:hover, .user-wrap.open .user-pill { border-color: var(--accent-s); background: var(--accent-s); }
    .u-av {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10.5px; font-weight: 800; flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(var(--accent-rgb),0.35);
      overflow: hidden;
    }
    .u-av img { width: 100%; height: 100%; object-fit: cover; }
    .u-meta { display: flex; flex-direction: column; text-align: left; }
    .u-name { font-size: 12.5px; font-weight: 700; color: var(--t1); line-height: 1.2; }
    .u-role { font-size: 10px; color: var(--t4); font-weight: 500; }
    .u-chev { font-size: 16px; color: var(--t4); }
    .user-menu {
      position: absolute; right: 0; top: calc(100% + 8px); z-index: 40;
      min-width: 180px; background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; box-shadow: var(--sh); padding: 6px; display: grid; gap: 2px;
    }
    .um-item {
      display: flex; align-items: center; gap: 8px; width: 100%;
      border: none; background: transparent; border-radius: 8px;
      padding: 9px 10px; font: inherit; font-size: 13px; font-weight: 600;
      color: var(--t2); cursor: pointer; text-align: left;
    }
    .um-item:hover { background: var(--surface-2); color: var(--t1); }
    .um-item.danger { color: var(--red); }
    .um-item.danger:hover { background: var(--red-s); }
    .um-item .material-icons-round { font-size: 18px; }

    /* Icon buttons */
    .icon-btn, .sign-out {
      width: 36px; height: 36px;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--t3); border-radius: 10px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .icon-btn .material-icons-round,
    .sign-out .material-icons-round { font-size: 18px; }
    .icon-btn:hover { background: var(--surface-2); color: var(--t1); border-color: var(--border-2); }
    .sign-out:hover { background: var(--red-s); color: var(--red); border-color: var(--red-b); }

    /* ═══ THEME PICKER ══════════════════════════════ */
    .theme-wrap { position: relative; }
    .theme-panel {
      position: absolute; top: calc(100% + 10px); right: 0;
      width: 230px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-xl);
      box-shadow: var(--sh-lg);
      padding: 8px;
      z-index: 200;
      animation: slideDown 0.18s cubic-bezier(.22,1,.36,1);
    }
    @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
    .theme-panel-title {
      font-size: 10px; font-weight: 700; color: var(--t4);
      text-transform: uppercase; letter-spacing: 0.8px;
      padding: 6px 10px 8px;
    }
    .theme-opts { display: flex; flex-direction: column; gap: 2px; }
    .theme-opt {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 10px 10px; border-radius: 10px;
      border: none; background: none; cursor: pointer;
      text-align: left; transition: background 0.12s;
      color: var(--t2); font-family: inherit;
    }
    .theme-opt .material-icons-round { font-size: 19px; color: var(--t3); flex-shrink: 0; }
    .theme-opt:hover { background: var(--surface-2); }
    .theme-opt.active { background: var(--accent-s); color: var(--accent); }
    .theme-opt.active .material-icons-round { color: var(--accent); }
    .theme-opt-text { flex: 1; display: flex; flex-direction: column; }
    .theme-opt-label { font-size: 13px; font-weight: 600; }
    .theme-opt-desc  { font-size: 11px; color: var(--t4); margin-top: 1px; }
    .theme-check { font-size: 16px !important; color: var(--accent) !important; }

    /* Theme mode swatches */
    .theme-swatches { display: flex; gap: 6px; padding: 4px 10px 10px; }
    .swatch {
      flex: 1; height: 32px; border-radius: 8px; border: 2px solid transparent;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
    }
    .swatch.light-sw { background: #e9eef5; border-color: #d7dee8; }
    .swatch.dark-sw  { background: #0d0f14; border-color: #252b3b; }
    .swatch.sys-sw   { background: linear-gradient(135deg, #e9eef5 50%, #0d0f14 50%); border-color: var(--border); }
    .swatch.active   { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-g); }
    .swatch .material-icons-round { font-size: 14px; }
    .swatch.light-sw .material-icons-round { color: #374151; }
    .swatch.dark-sw  .material-icons-round { color: #e2e8f0; }

    /* 28px -> 20px. Together with the 6px off the top bar and the unified
       12px .os-page gap, this is the approved moderate density target.
       The pages that compensated for the old 28px with a local
       :host margin-top of -16px have had that workaround removed in
       the same change, so every page now aligns at one offset. */
    .page-content { padding: 20px; flex: 1; overflow-y: auto; }

    /* ═══ NOTIFICATION BELL ═══════════════════════════ */
    .notif-wrap { position: relative; }

    .notif-trigger { position: relative; }
    .notif-dot {
      position: absolute; top: -4px; right: -4px;
      min-width: 17px; height: 17px; padding: 0 4px;
      background: var(--red); color: #fff;
      font-size: 9.5px; font-weight: 800;
      border-radius: 99px; border: 2px solid var(--surface);
      display: flex; align-items: center; justify-content: center;
      line-height: 1;
    }

    .notif-panel {
      position: absolute; top: calc(100% + 10px); right: 0;
      width: 340px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--sh-lg);
      z-index: 200;
      overflow: hidden;
      animation: slideDown 0.18s cubic-bezier(.22,1,.36,1);
    }

    .np-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }
    .np-head-left { display: flex; align-items: center; gap: 10px; }
    .np-bell { font-size: 20px; color: var(--accent); font-variation-settings: 'FILL' 1; }
    .np-title { font-size: 13px; font-weight: 700; color: var(--t1); line-height: 1.2; }
    .np-sub   { font-size: 11px; color: var(--t4); margin-top: 1px; }
    .np-refresh {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: none; color: var(--t4); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
      .material-icons-round { font-size: 17px; }
    }
    .np-refresh:hover { background: var(--surface-3); color: var(--t1); }
    .np-alert-toggle { color: var(--accent) !important; }
    .np-alert-toggle.alerts-off { color: var(--t4) !important; }
    .np-alert-toggle:hover { background: var(--accent-s) !important; }

    .np-loading {
      display: flex; align-items: center; gap: 8px;
      padding: 20px 16px; font-size: 12.5px; color: var(--t4);
      .material-icons-round { font-size: 16px; }
    }

    .np-empty {
      padding: 28px 16px; text-align: center;
    }
    .np-empty-icon {
      font-size: 36px; color: var(--green);
      font-variation-settings: 'FILL' 1;
      margin-bottom: 8px; display: block;
    }
    .np-empty-title { font-size: 14px; font-weight: 700; color: var(--t1); margin-bottom: 4px; }
    .np-empty-sub   { font-size: 12px; color: var(--t4); }

    .np-list { display: flex; flex-direction: column; max-height: 360px; overflow-y: auto; }

    .np-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      transition: background 0.12s;
    }
    .np-item:last-child { border-bottom: none; }
    .np-item:hover { background: var(--surface-2); }

    .np-item-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 18px; font-variation-settings: 'FILL' 1; }
    }
    .np-ic-accent  { background: var(--accent-s);  border: 1px solid var(--accent-g);  .material-icons-round { color: var(--accent);  } }
    .np-ic-purple  { background: var(--purple-s);  border: 1px solid rgba(124,58,237,.2); .material-icons-round { color: var(--purple);  } }
    .np-ic-green   { background: var(--green-s);   border: 1px solid var(--green-b);   .material-icons-round { color: var(--green);   } }
    .np-ic-blue    { background: var(--accent-s);  border: 1px solid var(--accent-g);  .material-icons-round { color: var(--accent);  } }
    .np-ic-amber   { background: var(--amber-s);   border: 1px solid var(--amber-b);   .material-icons-round { color: var(--amber);   } }

    .np-item-body { flex: 1; min-width: 0; }
    .np-item-title { font-size: 12.5px; font-weight: 700; color: var(--t1); margin-bottom: 2px; }
    .np-item-desc  { font-size: 11.5px; color: var(--t3); line-height: 1.5; margin-bottom: 6px; }
    .np-item-link {
      display: inline-flex; align-items: center; gap: 3px;
      background: none; border: none; padding: 0;
      font-size: 11.5px; font-weight: 700; color: var(--accent);
      cursor: pointer; font-family: inherit;
      .material-icons-round { font-size: 13px; }
    }
    .np-item-link:hover { text-decoration: underline; }

    .np-dismiss {
      width: 24px; height: 24px; border-radius: 6px; border: none; flex-shrink: 0;
      background: none; color: var(--t5); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.12s; margin-top: 1px;
      .material-icons-round { font-size: 15px; }
    }
    .np-dismiss:hover { background: var(--red-s); color: var(--red); }

    /* Chat notifications in panel */
    .np-section-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
      color: var(--t4); padding: 8px 14px 4px;
      border-top: 1px solid var(--border);
    }
    .np-section-label:first-of-type { border-top: none; }
    .np-section-label .material-icons-round { font-size: 13px; }

    .np-chat-item {
      cursor: pointer; align-items: center; padding: 10px 14px;
    }
    .np-chat-item:hover { background: var(--surface-2); }

    .chat-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: var(--accent);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 12.5px; font-weight: 700; flex-shrink: 0;
    }
    .chat-unread-badge {
      background: var(--accent); color: #fff; border-radius: 20px;
      padding: 1px 8px; font-size: 11px; font-weight: 700; flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }

    /* ═══ MOBILE ELEMENTS (hidden on desktop) ══════════ */
    .mob-backdrop { display: none; }
    .mob-menu-btn { display: none; }
    .mob-close    { display: none; }

    /* ═══ RESPONSIVE ════════════════════════════════════ */
    @media (max-width: 768px) {
      /* Sidebar becomes a fixed overlay drawer */
      .sidebar {
        /* dvh so the drawer is not cut off by mobile browser toolbars. */
        position: fixed; left: 0; top: 0; height: 100dvh; z-index: var(--z-sidebar);
        width: 280px !important;
        transform: translateX(-100%);
        transition: transform 0.28s cubic-bezier(.4,0,.2,1);
        box-shadow: var(--sh-xl);
        overflow: hidden;
      }
      .sidebar.mob-open { transform: translateX(0); }

      /* Backdrop */
      .mob-backdrop {
        display: block;
        position: fixed; inset: 0; z-index: calc(var(--z-sidebar) - 1);
        background: rgba(0,0,0,0.45);
        animation: fadeIn 0.2s;
      }

      /* Hamburger in topbar */
      .mob-menu-btn {
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px;
        border: 1px solid var(--border); background: var(--surface);
        border-radius: 10px; cursor: pointer; color: var(--t3);
        flex-shrink: 0;
      }
      .mob-menu-btn .material-icons-round { font-size: 20px; }

      /* Close X inside sidebar */
      .mob-close {
        display: flex; align-items: center; justify-content: center;
        margin-left: auto; width: 30px; height: 30px;
        border: none; background: none; cursor: pointer;
        color: var(--t4); border-radius: 8px;
        flex-shrink: 0;
      }
      .mob-close:hover { background: var(--surface-2); color: var(--t1); }
      .mob-close .material-icons-round { font-size: 20px; }

      /* Desktop collapse button hidden on mobile */
      .sidebar-foot { display: none; }

      /* Main area takes full width */
      .main { margin-left: 0 !important; }

      /* Topbar */
      .topbar { padding: 0 16px; }
      .page-date { display: none; }
      .u-meta { display: none; }
      .u-chev { display: none; }
      .user-pill { padding: 4px; border-radius: 50%; }

      /* Page content — FAB clearance only while chat is mounted (dashboard). */
      .page-content { padding: 16px; }
      .page-content.has-chat-fab {
        padding-bottom: calc(var(--fab-page-pad) + env(safe-area-inset-bottom, 0px));
      }
    }

    @media (max-width: 480px) {
      .page-content { padding: 12px; }
      .page-content.has-chat-fab {
        padding-bottom: calc(var(--fab-page-pad) + env(safe-area-inset-bottom, 0px));
      }
      .topbar { padding: 0 12px; }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  auth       = inject(AuthService);
  theme      = inject(ThemeService);
  notifSvc   = inject(SetupNotificationService);
  chatSvc    = inject(ChatService);
  swalSvc    = inject(SwalNotificationService);
  private router       = inject(Router);
  private menuSvc      = inject(MenuService);
  private settingsSvc  = inject(SettingsService);
  private instituteSvc = inject(InstituteService);

  /** Chat FAB/panel — dashboard route only. */
  readonly showChatPanel = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => this.isDashboardUrl(e.urlAfterRedirects)),
      startWith(this.isDashboardUrl(this.router.url))
    ),
    { initialValue: this.isDashboardUrl(this.router.url) }
  );

  menuItems  = this.menuSvc.items;
  open       = signal<Set<number>>(new Set());
  instituteName    = computed(() => this.auth.currentUser()?.instituteName ?? 'OneSkool');
  instituteTagline = computed(() => this.auth.currentUser()?.tagline ?? 'School Management System');
  instituteLogo    = computed(() => this.resolveLogoUrl(this.auth.currentUser()?.logoUrl));
  isSuperAdmin     = computed(() => this.auth.currentUser()?.role === 'superadmin');
  sysMenuItems     = computed(() => this.menuItems().filter(i => i.routeUrl?.startsWith('/superadmin/')));
  mainMenuItems    = computed(() => this.menuItems().filter(i => !i.routeUrl?.startsWith('/superadmin/')));
  collapsed  = signal(false);
  themeOpen  = signal(false);
  mobileOpen = signal(false);
  notifOpen  = signal(false);
  userMenuOpen = signal(false);
  today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  showNotifications = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return false;
    const role = (user.role ?? '').toLowerCase();
    return !['superadmin', 'teacher', 'parent'].includes(role);
  });

  unreadChatConvs = computed(() => this.chatSvc.conversations().filter(c => c.unreadCount > 0));
  totalNotifCount = computed(() => this.notifSvc.count() + this.chatSvc.totalUnread());

  readonly themeOptions: { value: ThemeMode; label: string; icon: string; desc: string; swatchClass: string }[] = [
    { value: 'light',  label: 'Light',  icon: 'light_mode',      desc: 'Always use light theme', swatchClass: 'light-sw' },
    { value: 'dark',   label: 'Dark',   icon: 'dark_mode',       desc: 'Always use dark theme',  swatchClass: 'dark-sw'  },
    { value: 'system', label: 'System', icon: 'brightness_auto', desc: 'Follow device setting',  swatchClass: 'sys-sw'   },
  ];

  private readonly activeOpts: IsActiveMatchOptions = {
    paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored'
  };

  private closePanels = () => {
    this.themeOpen.set(false);
    this.notifOpen.set(false);
    this.userMenuOpen.set(false);
  };

  /** Page offset captured while the drawer holds the body fixed. */
  private lockedScrollY = 0;

  constructor() {
    // Lock the page while the mobile navigation drawer is open. Previously the
    // page scrolled underneath the scrim and lost its position on close.
    // Reacts to the existing mobileOpen() signal; opens/closes nothing itself.
    effect(() => {
      if (this.mobileOpen()) this.lockBodyScroll();
      else this.unlockBodyScroll();
    });
  }

  private lockBodyScroll() {
    const body = document.body;
    if (body.classList.contains('os-scroll-locked')) return;
    this.lockedScrollY = window.scrollY;
    body.style.top = `-${this.lockedScrollY}px`;
    body.classList.add('os-scroll-locked');
  }

  private unlockBodyScroll() {
    const body = document.body;
    if (!body.classList.contains('os-scroll-locked')) return;
    body.classList.remove('os-scroll-locked');
    body.style.top = '';
    window.scrollTo(0, this.lockedScrollY);
  }

  private deferredShellHandle: { kind: 'idle' | 'timeout'; id: number } | null = null;
  private shellDestroyed = false;

  ngOnInit() {
    this.shellDestroyed = false;
    // Critical path: role menu for navigation shell.
    this.menuSvc.ensureLoaded().subscribe();
    document.addEventListener('click', this.closePanels);
    // School name/logo from the user's institute (not DevCompany branding).
    this.loadInstituteBranding();
    // SignalR connect is cheap; conversation list is deferred so dashboard
    // stats can claim the first network slots after login.
    this.chatSvc.connect();
    this.scheduleDeferredShellWork();
  }

  /** Pull live institute name/logo into the sidebar brand. */
  private loadInstituteBranding() {
    if (!this.auth.isLoggedIn()) return;
    // Superadmin keeps platform (DevCompany) branding from login.
    if (this.auth.currentUser()?.role === 'superadmin') return;

    this.instituteSvc.getMyInstitute().subscribe({
      next: res => {
        if (this.shellDestroyed || res.status === 204 || !res.body) return;
        const body = res.body;
        const hadInstitute = !!this.auth.currentUser()?.instituteId;
        this.auth.patchCurrentUser({
          instituteId: body.instituteId,
          instituteName: body.name,
          tagline: body.name,
          logoUrl: body.logoUrl ?? undefined
        });
        // Old sessions may lack instituteId in the JWT — refresh so tenant APIs work.
        if (!hadInstitute && body.instituteId) {
          this.auth.refreshToken().subscribe({ error: () => {} });
        }
      },
      error: () => {}
    });
  }

  private resolveLogoUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${environment.serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  /** Setup checklist + chat inbox after the first paint / critical dashboard calls. */
  private scheduleDeferredShellWork() {
    this.cancelDeferredShellWork();
    const run = () => {
      this.deferredShellHandle = null;
      // Do not run after logout or layout teardown.
      if (this.shellDestroyed || !this.auth.isLoggedIn()) return;
      this.notifSvc.load();
      this.chatSvc.loadConversations();
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => run(), { timeout: 1200 });
      this.deferredShellHandle = { kind: 'idle', id };
    } else {
      const id = window.setTimeout(run, 300);
      this.deferredShellHandle = { kind: 'timeout', id };
    }
  }

  private cancelDeferredShellWork() {
    const handle = this.deferredShellHandle;
    if (!handle) return;
    this.deferredShellHandle = null;
    if (handle.kind === 'timeout') {
      clearTimeout(handle.id);
      return;
    }
    const w = window as Window & { cancelIdleCallback?: (id: number) => void };
    w.cancelIdleCallback?.(handle.id);
  }

  ngOnDestroy() {
    this.shellDestroyed = true;
    this.cancelDeferredShellWork();
    document.removeEventListener('click', this.closePanels);
    // Never leave the body fixed if the shell is torn down while open.
    this.unlockBodyScroll();
  }

  toggleCollapsed() {
    this.collapsed.update(v => !v);
  }

  /**
   * Collapsed rail (ERP pattern):
   * - 1 child  → go straight to that page
   * - 2+ kids  → expand sidebar and open the group
   * Expanded: toggle the accordion as usual.
   */
  onParentClick(item: MenuItemTree) {
    const kids = item.children ?? [];
    if (this.collapsed()) {
      if (kids.length === 1 && kids[0].routeUrl) {
        this.router.navigateByUrl(kids[0].routeUrl);
        return;
      }
      this.collapsed.set(false);
      this.open.update(s => new Set(s).add(item.menuItemId));
      return;
    }
    this.toggle(item.menuItemId);
  }

  onNavLeafClick() {
    this.mobileOpen.set(false);
  }

  isGroupActive(item: MenuItemTree): boolean {
    return (item.children ?? []).some(c =>
      !!c.routeUrl && this.router.isActive(c.routeUrl, this.activeOpts)
    );
  }

  toggle(id: number) {
    const s = new Set(this.open());
    s.has(id) ? s.delete(id) : s.add(id);
    this.open.set(s);
  }

  setTheme(m: ThemeMode) {
    this.theme.setMode(m);
    this.themeOpen.set(false);
  }

  toggleNotif() {
    const opening = !this.notifOpen();
    this.notifOpen.update(v => !v);
    this.themeOpen.set(false);
    if (opening) { this.notifSvc.load(); this.chatSvc.loadConversations(); }
  }

  goTo(route: string) {
    this.notifOpen.set(false);
    this.userMenuOpen.set(false);
    this.router.navigate([route]);
  }

  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
    this.themeOpen.set(false);
    this.notifOpen.set(false);
  }

  goProfile() {
    this.userMenuOpen.set(false);
    this.router.navigate(['/account/profile']);
  }

  avatarUrl(): string | null {
    const id = this.auth.currentUser()?.photoFileId;
    return id ? `${environment.fileServerUrl}/files/${id}` : null;
  }

  openChat(convId: number) {
    this.notifOpen.set(false);
    this.chatSvc.triggerOpenConvId.set(convId);
    // Panel only exists on dashboard — open the thread there.
    if (!this.showChatPanel()) {
      this.router.navigate(['/dashboard']);
    }
  }

  private isDashboardUrl(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];
    return path === '/dashboard' || path.endsWith('/dashboard');
  }

  chatInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  initials(): string {
    return (this.auth.currentUser()?.fullName ?? '')
      .split(' ').filter((w: string) => w.length > 0).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
