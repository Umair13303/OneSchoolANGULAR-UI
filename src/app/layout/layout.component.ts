import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { MenuService } from '../core/services/menu.service';
import { ThemeService, ThemeMode } from '../core/services/theme.service';
import { SettingsService } from '../core/services/settings.service';
import { SetupNotificationService } from '../core/services/setup-notification.service';
import { MenuItemTree } from '../core/models/menu.model';
import { ChatPanelComponent } from '../shared/components/chat-panel/chat-panel.component';
import { ChatService } from '../core/services/chat.service';
import { SwalNotificationService } from '../core/services/swal-notification.service';

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
                <span class="ni material-icons-round">{{ item.icon }}</span>
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
              <a [routerLink]="item.routeUrl" routerLinkActive="active"
                 class="nav-item" [title]="item.title"
                 (click)="mobileOpen.set(false)">
                <span class="ni material-icons-round">{{ item.icon }}</span>
                @if (!collapsed()) { <span class="nl">{{ item.title }}</span> }
              </a>
            } @else {
              <div class="nav-group">
                <!-- Parent button -->
                <button class="nav-item nav-parent"
                        [class.open]="open().has(item.menuItemId)"
                        (click)="!collapsed() && toggle(item.menuItemId)">
                  <span class="ni material-icons-round">{{ item.icon }}</span>
                  @if (!collapsed()) {
                    <span class="nl">{{ item.title }}</span>
                    <span class="material-icons-round caret">expand_more</span>
                  }
                </button>

                <!-- Inline submenu: expanded sidebar only -->
                @if (open().has(item.menuItemId) && !collapsed()) {
                  <div class="nav-sub">
                    @for (child of item.children; track child.menuItemId) {
                      <a [routerLink]="child.routeUrl" routerLinkActive="active"
                         class="nav-sub-item" (click)="mobileOpen.set(false)">
                        <span class="material-icons-round sub-icon">{{ child.icon }}</span>
                        {{ child.title }}
                      </a>
                    }
                  </div>
                }

                <!-- Flyout: collapsed sidebar, shown via CSS :hover on .nav-group -->
                @if (collapsed()) {
                  <div class="nav-flyout">
                    <div class="flyout-title">{{ item.title }}</div>
                    @for (child of item.children; track child.menuItemId) {
                      <a [routerLink]="child.routeUrl" routerLinkActive="active"
                         class="nav-sub-item flyout-item"
                         (click)="mobileOpen.set(false)">
                        <span class="material-icons-round sub-icon">{{ child.icon }}</span>
                        {{ child.title }}
                      </a>
                    }
                  </div>
                }
              </div>
            }
          }
        </nav>

        <button class="toggle-btn" (click)="collapsed.set(!collapsed())">
          <span class="material-icons-round">{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</span>
        </button>
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
                <span class="material-icons-round">
                  {{ theme.mode() === 'dark' ? 'dark_mode' : theme.mode() === 'system' ? 'brightness_auto' : 'light_mode' }}
                </span>
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
                          <span class="material-icons-round">
                            {{ swalSvc.enabled() ? 'notifications_active' : 'notifications_off' }}
                          </span>
                        </button>
                        <button class="np-refresh" (click)="notifSvc.load(); chatSvc.loadUsers()" title="Refresh">
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

            <div class="user-pill">
              <div class="u-av">{{ initials() }}</div>
              <div class="u-meta">
                <span class="u-name">{{ auth.currentUser()?.fullName }}</span>
                <span class="u-role">{{ auth.currentUser()?.role | titlecase }}</span>
              </div>
              <span class="material-icons-round u-chev">expand_more</span>
            </div>
            <button class="sign-out" (click)="auth.logout()" title="Sign out">
              <span class="material-icons-round">logout</span>
            </button>
          </div>
        </header>

        <main class="page-content">
          <router-outlet />
        </main>
      </div>

    </div>

    <app-chat-panel />
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; background: var(--bg); }

    /* ═══ SIDEBAR ═══════════════════════════════════════ */
    .sidebar {
      width: 248px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      flex-shrink: 0;
      transition: width 0.28s cubic-bezier(.4,0,.2,1);
      position: relative; z-index: 20;
      box-shadow: var(--sh);
      overflow: visible;
    }
    .sidebar.collapsed { width: 68px; }

    /* Brand */
    .brand {
      display: flex; align-items: center; gap: 11px;
      padding: 16px 14px 16px 16px;
      border-bottom: 1px solid var(--border);
      overflow: hidden; white-space: nowrap; min-height: 64px;
    }
    .brand-mark {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(var(--accent-rgb), 0.4);
    }
    .brand-mark .material-icons-round { font-size: 20px; color: #fff; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24; }
    .brand-logo-img { width: 28px; height: 28px; object-fit: contain; border-radius: 6px; }
    .brand-name { font-size: 15px; font-weight: 800; color: var(--t1); letter-spacing: -0.4px; display: block; line-height: 1.2; }
    .brand-tag  { font-size: 9.5px; color: var(--t4); letter-spacing: 0.9px; text-transform: uppercase; display: block; margin-top: 2px; font-weight: 600; }

    /* Nav */
    .nav { flex: 1; padding: 10px 10px; overflow-y: auto; overflow-x: visible; display: flex; flex-direction: column; gap: 2px; }
    .nav-section { font-size: 9.5px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: 1px; padding: 12px 8px 4px; }
    .nav-section-label { font-size: 9.5px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: 1px; padding: 10px 10px 4px; }
    .nav-divider { height: 1px; background: var(--border); margin: 6px 10px; }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px;
      color: var(--t3);
      text-decoration: none; font-size: 13px; font-weight: 500;
      border-radius: 10px; white-space: nowrap;
      border: none; background: none; cursor: pointer; width: 100%; text-align: left;
      transition: color 0.15s, background 0.15s;
      position: relative; font-family: inherit;
    }
    .nav-item:hover { color: var(--t1); background: var(--surface-2); }
    .nav-item.active {
      color: var(--accent);
      background: var(--accent-s);
      font-weight: 600;
    }
    .nav-item.active .ni { color: var(--accent); }
    .nav-item.active::before {
      content: '';
      position: absolute; left: 0; top: 22%; bottom: 22%;
      width: 3px; border-radius: 0 3px 3px 0;
      background: var(--accent);
    }

    .ni {
      font-size: 20px; flex-shrink: 0; width: 24px; text-align: center;
      color: var(--t4);
      transition: color 0.15s;
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    }
    .nav-item:hover .ni,
    .nav-item.active .ni {
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .nl { flex: 1; }
    .caret { font-size: 16px; margin-left: auto; color: var(--t5); transition: transform 0.22s; }
    .nav-parent.open .caret { transform: rotate(180deg); }

    .nav-group { position: relative; }
    /* Show flyout on hover when sidebar is collapsed */
    .sidebar.collapsed .nav-group:hover .nav-flyout { opacity: 1; pointer-events: all; transform: translateX(0); }

    .nav-sub {
      margin: 2px 0 4px 22px;
      display: flex; flex-direction: column; gap: 1px;
      border-left: 2px solid var(--border);
      padding-left: 10px;
    }
    .nav-sub-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px;
      color: var(--t4);
      font-size: 12.5px; font-weight: 500;
      text-decoration: none; border-radius: 8px;
      transition: color 0.15s, background 0.15s;
    }
    .nav-sub-item:hover { color: var(--t1); background: var(--surface-2); }
    .nav-sub-item.active { color: var(--accent); font-weight: 600; background: var(--accent-s); }
    .sub-icon { font-size: 15px; color: var(--t4); font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20; }

    /* ── Collapsed flyout popup (CSS hover — no JS) ── */
    .nav-flyout {
      position: absolute;
      left: calc(100% + 6px);
      top: 0;
      min-width: 200px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 8px 28px rgba(0,0,0,.15);
      padding: 6px;
      z-index: 999;
      /* Hidden by default; shown on .nav-group:hover via CSS */
      opacity: 0;
      pointer-events: none;
      transform: translateX(-6px);
      transition: opacity 0.15s, transform 0.15s;
    }
    .flyout-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; color: var(--t4);
      padding: 6px 10px 4px; margin-bottom: 2px;
    }
    .flyout-item {
      padding: 8px 12px; font-size: 13px; font-weight: 500;
      border-radius: 8px; color: var(--t2);
    }
    .flyout-item:hover { background: var(--surface-2); color: var(--t1); }
    .flyout-item.active { background: var(--accent-s); color: var(--accent); font-weight: 600; }
    .nav-sub-item.active .sub-icon { color: var(--accent); font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20; }

    /* Collapse button */
    .toggle-btn {
      margin: 8px 10px 14px;
      padding: 9px;
      border: 1px solid var(--border); background: var(--surface-2);
      color: var(--t4); border-radius: 10px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s; font-family: inherit;
    }
    .toggle-btn .material-icons-round { font-size: 18px; }
    .toggle-btn:hover { background: var(--accent-s); color: var(--accent); border-color: var(--accent-s); }

    /* ═══ MAIN ═══════════════════════════════════════ */
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    .topbar {
      height: 62px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 28px;
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 0; z-index: 10; flex-shrink: 0;
      box-shadow: var(--sh-xs);
    }
    .topbar-l { display: flex; align-items: center; gap: 12px; }
    .page-date { font-size: 12px; color: var(--t4); font-weight: 500; }
    .topbar-r { display: flex; align-items: center; gap: 8px; }

    /* User pill */
    .user-pill {
      display: flex; align-items: center; gap: 9px;
      padding: 5px 12px 5px 5px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 99px; cursor: pointer;
      transition: all 0.15s;
    }
    .user-pill:hover { border-color: var(--accent-s); background: var(--accent-s); }
    .u-av {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10.5px; font-weight: 800; flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(var(--accent-rgb),0.35);
    }
    .u-meta { display: flex; flex-direction: column; }
    .u-name { font-size: 12.5px; font-weight: 700; color: var(--t1); line-height: 1.2; }
    .u-role { font-size: 10px; color: var(--t4); font-weight: 500; }
    .u-chev { font-size: 16px; color: var(--t4); }

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
    .swatch.light-sw { background: #f0f2f5; border-color: #e4e6ea; }
    .swatch.dark-sw  { background: #0d0f14; border-color: #252b3b; }
    .swatch.sys-sw   { background: linear-gradient(135deg, #f0f2f5 50%, #0d0f14 50%); border-color: var(--border); }
    .swatch.active   { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-g); }
    .swatch .material-icons-round { font-size: 14px; }
    .swatch.light-sw .material-icons-round { color: #374151; }
    .swatch.dark-sw  .material-icons-round { color: #e2e8f0; }

    .page-content { padding: 28px; flex: 1; overflow-y: auto; }

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
        position: fixed; left: 0; top: 0; height: 100vh; z-index: 300;
        width: 260px !important;
        transform: translateX(-100%);
        transition: transform 0.28s cubic-bezier(.4,0,.2,1);
        box-shadow: var(--sh-xl);
      }
      .sidebar.mob-open { transform: translateX(0); }

      /* Backdrop */
      .mob-backdrop {
        display: block;
        position: fixed; inset: 0; z-index: 299;
        background: rgba(0,0,0,0.45);
        backdrop-filter: blur(2px);
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
      .toggle-btn { display: none; }

      /* Main area takes full width */
      .main { margin-left: 0 !important; }

      /* Topbar */
      .topbar { padding: 0 14px; }
      .page-date { display: none; }
      .u-meta { display: none; }
      .u-chev { display: none; }
      .user-pill { padding: 4px; border-radius: 50%; }

      /* Page content */
      .page-content { padding: 16px; }
    }

    @media (max-width: 480px) {
      .page-content { padding: 12px; }
      .topbar { padding: 0 12px; }
    }
  `]
})
export class LayoutComponent implements OnInit {
  auth       = inject(AuthService);
  theme      = inject(ThemeService);
  notifSvc   = inject(SetupNotificationService);
  chatSvc    = inject(ChatService);
  swalSvc    = inject(SwalNotificationService);
  private router       = inject(Router);
  private menuSvc      = inject(MenuService);
  private settingsSvc  = inject(SettingsService);

  menuItems  = signal<MenuItemTree[]>([]);
  open       = signal<Set<number>>(new Set());
  instituteName    = computed(() => this.auth.currentUser()?.instituteName ?? 'OneSkool');
  instituteTagline = computed(() => this.auth.currentUser()?.tagline ?? 'School Management System');
  instituteLogo    = computed(() => this.auth.currentUser()?.logoUrl ?? null);
  isSuperAdmin     = computed(() => this.auth.currentUser()?.role === 'superadmin');
  sysMenuItems     = computed(() => this.menuItems().filter(i => i.routeUrl?.startsWith('/superadmin/')));
  mainMenuItems    = computed(() => this.menuItems().filter(i => !i.routeUrl?.startsWith('/superadmin/')));
  collapsed  = signal(false);
  themeOpen  = signal(false);
  mobileOpen = signal(false);
  notifOpen  = signal(false);
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

  private closePanels = () => { this.themeOpen.set(false); this.notifOpen.set(false); };

  ngOnInit() {
    this.menuSvc.getMenu().subscribe({ next: m => this.menuItems.set(m), error: () => {} });
    document.addEventListener('click', this.closePanels);
    this.notifSvc.load();
    this.chatSvc.connect();
    this.chatSvc.loadConversations();
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.closePanels);
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
    this.router.navigate([route]);
  }

  openChat(convId: number) {
    this.notifOpen.set(false);
    this.chatSvc.triggerOpenConvId.set(convId);
  }

  chatInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  initials(): string {
    return (this.auth.currentUser()?.fullName ?? '')
      .split(' ').filter((w: string) => w.length > 0).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
