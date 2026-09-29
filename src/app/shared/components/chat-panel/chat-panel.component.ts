import {
  Component, inject, OnInit, signal, computed, effect,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Conversation, ChatMessage, ChatUser, UploadResult } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { SwalNotificationService } from '../../../core/services/swal-notification.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- FAB Floating Action Button -->
    <button class="chat-fab" (click)="togglePanel()" [class.has-unread]="chatSvc.totalUnread() > 0" [class.open]="panelOpen()" aria-label="Toggle chat">
      <span class="material-icons-round fab-icon">{{ panelOpen() ? 'close' : 'chat' }}</span>
      @if (chatSvc.totalUnread() > 0 && !panelOpen()) {
        <span class="fab-badge">{{ chatSvc.totalUnread() > 99 ? '99+' : chatSvc.totalUnread() }}</span>
      }
    </button>

    @if (panelOpen()) {
      <div class="chat-panel-backdrop" (click)="panelOpen.set(false)"></div>
      <div class="chat-panel">

        <!-- ── 1. ACTIVE CONVERSATION VIEW (Where user reads and writes messages) ── -->
        @if (activeConv()) {
          <div class="panel-header">
            <button class="back-btn" (click)="closeConv()" title="Back to conversations">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="conv-info">
              <div class="conv-avatar {{ activeConv()!.conversationType === 'group' ? 'group-avatar' : '' }}"
                   [style.background]="activeConv()!.conversationType === 'direct' ? avatarColor(activeConv()!.name) : null">
                @if (activeConv()!.conversationType === 'group') {
                  <span class="material-icons-round">group</span>
                } @else {
                  {{ initials(activeConv()!.name) }}
                }
              </div>
              <div class="conv-header-text">
                <p class="conv-name" [title]="activeConv()!.name">{{ activeConv()!.name }}</p>
                <p class="conv-sub">
                  @if (activeConv()!.conversationType === 'group') {
                    <span>{{ activeConv()!.members.length }} members</span>
                  } @else if (activeConv()!.isOnline) {
                    <span class="live-status"><span class="live-dot"></span> Online</span>
                  } @else {
                    <span class="offline-status">Offline</span>
                  }
                </p>
              </div>
            </div>
            <div class="header-actions">
              <button class="icon-sm" (click)="panelOpen.set(false)" title="Close chat">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>

          <div class="messages-area" #msgArea>
            @for (item of messagesWithMeta(); track item.msg.chatMessageId) {
              <div class="msg-row" [class.mine]="item.msg.senderId === myId()"
                   [class.grouped]="item.grouped" [class.last]="item.lastInGroup">
                @if (item.showSender && item.msg.senderId !== myId() && activeConv()!.conversationType === 'group') {
                  <div class="msg-sender-label">{{ item.msg.senderName }}</div>
                }
                <div class="msg-wrapper">
                  <div class="msg-bubble">
                    @if (item.msg.attachmentType === 'image' && item.msg.attachmentUrl) {
                      <a [href]="apiBase + item.msg.attachmentUrl" target="_blank" class="msg-img-link">
                        <img [src]="apiBase + item.msg.attachmentUrl" class="msg-img" />
                      </a>
                    } @else if (item.msg.attachmentUrl) {
                      <a [href]="apiBase + item.msg.attachmentUrl" target="_blank" class="file-link" download>
                        <span class="material-icons-round">
                          {{ item.msg.attachmentType === 'pdf' ? 'picture_as_pdf' : 'insert_drive_file' }}
                        </span>
                        <span class="file-link-body">
                          <span class="file-link-name">{{ item.msg.attachmentName }}</span>
                          <span class="file-link-size">{{ formatSize(item.msg.attachmentSize) }}</span>
                        </span>
                      </a>
                    }
                    @if (item.msg.content) {
                      <span class="msg-text">{{ item.msg.content }}</span>
                    }
                  </div>
                  @if (item.msg.senderId === myId()) {
                    <button class="msg-delete-btn" (click)="confirmDeleteMsg(item.msg.chatMessageId)" title="Delete message">
                      <span class="material-icons-round">delete_outline</span>
                    </button>
                  }
                </div>
                @if (item.lastInGroup) {
                  <div class="msg-time">{{ item.msg.sentAt | date:'h:mm a' }}</div>
                }
              </div>
            }
            @if (chatSvc.messages().length === 0) {
              <div class="no-msgs">
                <span class="material-icons-round">chat_bubble_outline</span>
                <p>Start a conversation with {{ activeConv()!.name }}</p>
                <span>Write your message below and press Send</span>
              </div>
            }
          </div>

          @if (pendingFile()) {
            <div class="attachment-preview">
              @if (pendingFile()!.type === 'image') {
                <img [src]="apiBase + pendingFile()!.url" class="attach-thumb" />
              } @else {
                <span class="material-icons-round attach-icon">
                  {{ pendingFile()!.type === 'pdf' ? 'picture_as_pdf' : 'insert_drive_file' }}
                </span>
              }
              <span class="attach-name">{{ pendingFile()!.name }}</span>
              <button class="attach-remove" (click)="pendingFile.set(null)">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          }

          <!-- Write message input area -->
          <div class="input-bar">
            <button class="icon-sm attach-btn" (click)="fileInput.click()" title="Attach file" type="button">
              <span class="material-icons-round">attach_file</span>
            </button>
            <input #fileInput type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                   (change)="onFileSelected($event)" />
            <input #inputEl [(ngModel)]="draft" [placeholder]="'Type your message to ' + activeConv()!.name + '…'"
                   (keydown.enter)="send()" class="msg-input" autocomplete="off" />
            <button class="send-btn" (click)="send()" [disabled]="!draft.trim() && !pendingFile()" [class.uploading]="uploading()" type="button" title="Send message">
              @if (uploading()) {
                <span class="material-icons-round spin">sync</span>
              } @else {
                <span class="material-icons-round">send</span>
              }
            </button>
          </div>

        <!-- ── 2. CONVERSATIONS LIST ── -->
        } @else if (view() === 'list') {
          <div class="panel-header">
            <div class="panel-title">
              <span class="material-icons-round">chat</span>
              <span>Messages & Discussions</span>
            </div>
            <div class="header-actions">
              <div class="conn-dot" [class.online]="chatSvc.connected()" [title]="chatSvc.connected() ? 'SignalR Online' : 'Connecting…'"></div>
              <button class="icon-sm notif-toggle"
                      [class.notif-off]="!swalSvc.enabled()"
                      (click)="swalSvc.toggle()"
                      [title]="swalSvc.enabled() ? 'Mute notifications' : 'Enable notifications'">
                <span class="material-icons-round">
                  {{ swalSvc.enabled() ? 'notifications_active' : 'notifications_off' }}
                </span>
              </button>
              <button class="icon-sm" (click)="view.set('new-dm')" title="Start New Chat">
                <span class="material-icons-round">person_add</span>
              </button>
              @if (canCreateGroup()) {
                <button class="icon-sm" (click)="view.set('new-group')" title="New Group">
                  <span class="material-icons-round">group_add</span>
                </button>
              }
              @if (isBroadcaster()) {
                <button class="icon-sm" (click)="view.set('broadcast')" title="Broadcast announcement">
                  <span class="material-icons-round">campaign</span>
                </button>
              }
              <button class="icon-sm" (click)="panelOpen.set(false)" title="Close chat">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>

          <div class="search-row">
            <span class="material-icons-round search-icon">search</span>
            <input [(ngModel)]="search" placeholder="Search conversations…" class="search-input" />
          </div>

          <div class="conv-list">
            @for (c of filteredConvs(); track c.conversationId) {
              <div class="conv-item" (click)="openConv(c)">
                <div class="conv-avatar {{ c.conversationType === 'group' ? 'group-avatar' : '' }}"
                     [style.background]="c.conversationType === 'direct' ? avatarColor(c.name) : null"
                     [class.online-ring]="c.conversationType === 'direct' && c.isOnline">
                  @if (c.conversationType === 'group') {
                    <span class="material-icons-round">group</span>
                  } @else {
                    {{ initials(c.name) }}
                  }
                </div>
                <div class="conv-body">
                  <div class="conv-row1">
                    <span class="conv-name" [class.unread]="c.unreadCount > 0">{{ c.name }}</span>
                    @if (c.lastMessageAt) {
                      <span class="conv-time">{{ c.lastMessageAt | date:'h:mm a' }}</span>
                    }
                  </div>
                  <p class="conv-last" [class.unread]="c.unreadCount > 0">{{ c.lastMessage || 'Click to write a message…' }}</p>
                </div>
                @if (c.unreadCount > 0) {
                  <span class="unread-badge">{{ c.unreadCount }}</span>
                }
                <button class="conv-delete-btn" (click)="confirmDeleteConv($event, c)" title="Delete conversation">
                  <span class="material-icons-round">delete_outline</span>
                </button>
              </div>
            }
            @if (filteredConvs().length === 0) {
              <div class="empty-state">
                <span class="material-icons-round">forum</span>
                <p>No conversations yet</p>
                <span>Select a teacher or user below to start chatting:</span>
                <button class="start-btn" (click)="view.set('new-dm')">
                  <span class="material-icons-round">person_add</span> Select Teacher / User
                </button>
              </div>
            }
          </div>

        <!-- ── 3. SELECT USER / TEACHER TO CHAT ── -->
        } @else if (view() === 'new-dm') {
          <div class="panel-header">
            <button class="back-btn" (click)="view.set('list')" title="Back">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="panel-title"><span>Select Teacher / User</span></div>
            <div class="header-actions">
              <button class="icon-sm" (click)="panelOpen.set(false)" title="Close">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>

          <div class="search-row">
            <span class="material-icons-round search-icon">search</span>
            <input [(ngModel)]="search" placeholder="Search teachers, admins, users…" class="search-input" />
          </div>

          <div class="select-instruction-bar">
            <span class="material-icons-round info-icon">touch_app</span>
            <span>Click any user below to open the chat conversation:</span>
          </div>

          <div class="conv-list">
            @for (u of filteredUsers(); track u.userId) {
              <div class="conv-item new-dm-item" (click)="startDm(u)" [class.loading]="loadingUserId() === u.userId">
                <div class="conv-avatar" [style.background]="avatarColor(u.fullName)" [class.online-ring]="u.isOnline">
                  {{ initials(u.fullName) }}
                </div>
                <div class="conv-body">
                  <div class="conv-name">{{ u.fullName }}</div>
                  <div class="conv-role-badge">
                    <span class="badge badge-sm badge-outline">{{ u.roleName || 'User' }}</span>
                    @if (u.isOnline) {
                      <span class="live-dot-sm" title="Online"></span>
                    }
                  </div>
                </div>
                <button class="chat-now-btn" (click)="startDm(u); $event.stopPropagation()">
                  @if (loadingUserId() === u.userId) {
                    <span class="material-icons-round spin">sync</span> Opening…
                  } @else {
                    <span class="material-icons-round">chat</span> Message
                  }
                </button>
              </div>
            }
            @if (filteredUsers().length === 0) {
              <div class="empty-state">
                <span class="material-icons-round">person_search</span>
                <p>No users found</p>
                <span>Try searching with a different name</span>
              </div>
            }
          </div>

        <!-- ── 4. CREATE GROUP ── -->
        } @else if (view() === 'new-group') {
          <div class="panel-header">
            <button class="back-btn" (click)="view.set('list')">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="panel-title"><span>Create Group</span></div>
            <div class="header-actions">
              <button class="icon-sm" (click)="panelOpen.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>
          <div class="group-form">
            <div class="form-group-field">
              <label class="group-field-label">Group Name</label>
              <input [(ngModel)]="groupName" placeholder="e.g. Science Teachers, Grade 5 Staff…" class="msg-input group-name-input" />
            </div>

            <div class="form-group-field">
              <label class="group-field-label">Add Members</label>
              <div class="search-row inner-search">
                <span class="material-icons-round search-icon">search</span>
                <input [(ngModel)]="search" placeholder="Search teachers or staff…" class="search-input" />
              </div>
            </div>

            @if (selectedUserIds().size > 0) {
              <div class="selected-chips">
                @for (uid of selectedUserIds(); track uid) {
                  <span class="chip">{{ userName(uid) }}
                    <button (click)="toggleUser(uid)">✕</button>
                  </span>
                }
              </div>
            }

            <div class="conv-list nested">
              @for (u of filteredUsers(); track u.userId) {
                <div class="conv-item member-pick-item" (click)="toggleUser(u.userId)" [class.selected]="selectedUserIds().has(u.userId)">
                  <div class="conv-avatar" [style.background]="avatarColor(u.fullName)">{{ initials(u.fullName) }}</div>
                  <div class="conv-body">
                    <div class="conv-name">{{ u.fullName }}</div>
                    <p class="conv-last">{{ u.roleName }}</p>
                  </div>
                  <div class="checkbox-circle" [class.checked]="selectedUserIds().has(u.userId)">
                    @if (selectedUserIds().has(u.userId)) {
                      <span class="material-icons-round check-icon">check</span>
                    }
                  </div>
                </div>
              }
            </div>

            <button class="create-btn" [disabled]="!groupName.trim() || selectedUserIds().size === 0"
                    (click)="createGroup()">
              Create Group {{ selectedUserIds().size > 0 ? '(' + selectedUserIds().size + ' members)' : '' }}
            </button>
          </div>

        <!-- ── 5. BROADCAST ── -->
        } @else if (view() === 'broadcast') {
          <div class="panel-header">
            <button class="back-btn" (click)="view.set('list')">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="panel-title"><span>Broadcast Message</span></div>
            <div class="header-actions">
              <button class="icon-sm" (click)="panelOpen.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>
          <div class="group-form">
            <p class="bc-hint">Send announcements to all staff or parents of specific classes instantly.</p>
            <button class="bc-btn" (click)="openBroadcast('staff')">
              <span class="bc-icon"><span class="material-icons-round">people</span></span>
              <span class="bc-label">All Staff & Faculty</span>
              <span class="material-icons-round bc-chevron">chevron_right</span>
            </button>
            @for (cls of classes(); track cls.classId) {
              <button class="bc-btn" (click)="openBroadcast('class-parents', cls.classId)">
                <span class="bc-icon"><span class="material-icons-round">family_restroom</span></span>
                <span class="bc-label">{{ cls.className }} — All Parents</span>
                <span class="material-icons-round bc-chevron">chevron_right</span>
              </button>
            }
          </div>
        }

      </div>
    }
  `,
  styles: [`
    :host { position: fixed; bottom: 24px; right: 24px; z-index: 1200; }

    /* FAB */
    .chat-fab {
      width: 58px; height: 58px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, var(--accent, #6366f1), var(--accent-d, #4f46e5));
      color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
      position: relative;
    }
    .chat-fab:hover { transform: translateY(-2px) scale(1.06); box-shadow: 0 12px 30px rgba(79, 70, 229, 0.5); }
    .chat-fab:active { transform: scale(.94); }
    .chat-fab.has-unread:not(.open) { animation: fabPulse 2.2s ease-in-out infinite; }
    .fab-icon { font-size: 26px; transition: transform .2s; }
    .chat-fab.open .fab-icon { transform: rotate(90deg); }
    @keyframes fabPulse {
      0%, 100% { box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4), 0 0 0 0 rgba(99,102,241,.4); }
      50%      { box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4), 0 0 0 12px rgba(99,102,241,0); }
    }
    .fab-badge {
      position: absolute; top: -3px; right: -3px; background: #ef4444; color: #fff;
      font-size: 10.5px; font-weight: 700; border-radius: 20px; padding: 2px 7px;
      min-width: 20px; text-align: center; border: 2px solid var(--surface, #fff);
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }

    .chat-panel-backdrop {
      display: none;
    }

    /* Panel */
    .chat-panel {
      position: absolute; bottom: 72px; right: 0;
      width: 410px; height: 620px; max-height: calc(100vh - 110px);
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 20px; box-shadow: 0 20px 45px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; overflow: hidden;
      animation: panelIn .22s cubic-bezier(.16,1,.3,1);
      z-index: 1205;
    }
    @keyframes panelIn {
      from { opacity: 0; transform: translateY(18px) scale(.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Header */
    .panel-header {
      display: flex; align-items: center; gap: 10px; padding: 13px 16px;
      background: linear-gradient(135deg, var(--accent, #6366f1), var(--accent-d, #4f46e5));
      color: #fff; flex-shrink: 0;
    }
    .panel-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; flex: 1; }
    .panel-title .material-icons-round { font-size: 20px; }
    .header-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
    .conn-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.4); margin-right: 4px; transition: background .2s; }
    .conn-dot.online { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.3); }
    .notif-toggle.notif-off { opacity: .55; }
    .icon-sm { background: none; border: none; color: #fff; cursor: pointer; padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background .15s; }
    .icon-sm:hover { background: rgba(255,255,255,.2); }
    .icon-sm .material-icons-round { font-size: 20px; }
    .back-btn { background: none; border: none; color: #fff; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: background .15s; }
    .back-btn:hover { background: rgba(255,255,255,.2); }
    .back-btn .material-icons-round { font-size: 22px; }

    /* Search */
    .search-row {
      display: flex; align-items: center; gap: 8px; position: relative;
      padding: 10px 14px; border-bottom: 1px solid var(--border, #e2e8f0); flex-shrink: 0;
      background: var(--surface, #fff);
    }
    .search-row.inner-search {
      border: none; padding: 0 0 10px;
    }
    .search-icon { position: absolute; left: 24px; font-size: 18px; color: var(--t4, #94a3b8); pointer-events: none; }
    .inner-search .search-icon { left: 12px; }
    .search-input {
      flex: 1; border: 1.5px solid var(--border, #e2e8f0); background: var(--surface-2, #f8fafc); outline: none;
      font-size: 13.5px; color: var(--t1, #0f172a); border-radius: 12px; padding: 8px 12px 8px 34px;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .search-input:focus { border-color: var(--accent, #6366f1); background: var(--surface, #fff); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .search-input::placeholder { color: var(--t4, #94a3b8); }

    .select-instruction-bar {
      display: flex; align-items: center; gap: 6px; padding: 8px 14px;
      background: #eff6ff; color: #1e40af; font-size: 12px; font-weight: 500;
      border-bottom: 1px solid #dbeafe;
    }
    .select-instruction-bar .info-icon { font-size: 16px; color: #3b82f6; }

    /* Conversation list */
    .conv-list { flex: 1; overflow-y: auto; background: var(--surface, #fff); }
    .conv-list.nested { flex: initial; max-height: 220px; border: 1px solid var(--border, #e2e8f0); border-radius: 12px; margin-top: 8px; }
    .conv-item {
      display: flex; align-items: center; gap: 12px; padding: 11px 14px; cursor: pointer;
      border-bottom: 1px solid var(--border, #f1f5f9); transition: background .12s;
      background: var(--surface, #fff); position: relative;
    }
    .conv-item:hover { background: var(--surface-2, #f8fafc); }
    .conv-item.selected { background: rgba(99,102,241,0.08); }
    .conv-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--accent, #6366f1); color: #fff; font-size: 13.5px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 0 0 2px var(--surface, #fff);
    }
    .conv-avatar.group-avatar { background: #8b5cf6; }
    .conv-avatar.group-avatar .material-icons-round { font-size: 20px; }
    .conv-avatar.online-ring { box-shadow: 0 0 0 2px var(--surface, #fff), 0 0 0 3.5px #22c55e; }

    .conv-body { flex: 1; min-width: 0; }
    .conv-row1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .conv-name { font-size: 14px; font-weight: 600; color: var(--t2, #1e293b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
    .conv-name.unread { color: var(--t1, #0f172a); font-weight: 700; }
    .conv-time { font-size: 11px; color: var(--t4, #94a3b8); flex-shrink: 0; }
    .conv-last { font-size: 12.5px; color: var(--t3, #64748b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 3px 0 0; }
    .conv-last.unread { color: var(--t2, #1e293b); font-weight: 600; }
    .conv-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .conv-header-text { min-width: 0; flex: 1; }
    .conv-header-text .conv-name { color: #fff; font-size: 14.5px; }
    .conv-sub { font-size: 11.5px; color: rgba(255,255,255,.85); margin: 2px 0 0; display: flex; align-items: center; gap: 4px; }
    .live-status { display: inline-flex; align-items: center; gap: 4px; color: #bbf7d0; font-weight: 500; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.4); }
    .live-dot-sm { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; margin-left: 5px; }
    .conv-role-badge { display: flex; align-items: center; margin-top: 3px; }
    .badge-outline { font-size: 11px; padding: 1px 7px; border-radius: 10px; background: var(--surface-2, #f1f5f9); color: var(--t2, #475569); border: 1px solid var(--border, #cbd5e1); }
    
    .chat-now-btn {
      background: var(--accent, #6366f1); color: #fff; border: none; border-radius: 18px;
      padding: 6px 14px; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 5px;
      cursor: pointer; transition: transform .15s, background .15s; flex-shrink: 0;
    }
    .chat-now-btn:hover { background: var(--accent-d, #4f46e5); transform: translateY(-1px); }
    .chat-now-btn .material-icons-round { font-size: 16px; }

    .unread-badge {
      background: var(--accent, #6366f1); color: #fff; border-radius: 20px;
      padding: 2px 8px; font-size: 11px; font-weight: 700; flex-shrink: 0; min-width: 20px; text-align: center;
    }
    .conv-delete-btn {
      background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px;
      color: var(--t4, #94a3b8); opacity: 0; transition: opacity .15s, background .15s, color .15s; flex-shrink: 0;
      display: flex; align-items: center; position: absolute; right: 10px;
    }
    .conv-delete-btn .material-icons-round { font-size: 18px; }
    .conv-item:hover .conv-delete-btn { opacity: 1; }
    .conv-item:hover .unread-badge { opacity: 0; }
    .conv-delete-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
    .empty-state, .no-msgs {
      padding: 40px 20px; text-align: center; color: var(--t3, #64748b); display: flex; flex-direction: column;
      align-items: center; gap: 8px;
    }
    .empty-state .material-icons-round, .no-msgs .material-icons-round {
      font-size: 38px; color: var(--t4, #94a3b8); margin-bottom: 4px;
    }
    .empty-state p, .no-msgs p { font-size: 14.5px; font-weight: 600; color: var(--t2, #1e293b); margin: 0; }
    .empty-state span, .no-msgs span { font-size: 12.5px; color: var(--t4, #94a3b8); max-width: 260px; }
    .start-btn {
      margin-top: 10px; background: var(--accent, #6366f1); color: #fff; border: none; border-radius: 20px;
      padding: 8px 18px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;
      cursor: pointer; transition: transform .15s, box-shadow .15s;
    }
    .start-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }

    /* Messages */
    .messages-area {
      flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 3px;
      background: var(--surface, #fff); scroll-behavior: smooth;
    }
    .msg-row { display: flex; flex-direction: column; align-items: flex-start; max-width: 84%; margin-top: 10px; }
    .msg-row:first-child { margin-top: 0; }
    .msg-row.grouped { margin-top: 2px; }
    .msg-row.mine { align-self: flex-end; align-items: flex-end; }
    .msg-sender-label { font-size: 11px; font-weight: 600; color: var(--accent, #6366f1); margin-bottom: 3px; padding-left: 4px; }
    .msg-wrapper { display: flex; align-items: center; gap: 5px; max-width: 100%; }
    .msg-row.mine .msg-wrapper { flex-direction: row-reverse; }
    .msg-bubble {
      background: var(--surface-2, #f1f5f9); color: var(--t1, #0f172a); border-radius: 18px;
      padding: 9px 14px; font-size: 13.5px; line-height: 1.45; word-break: break-word;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .msg-row:not(.mine) .msg-bubble { border-bottom-left-radius: 5px; }
    .msg-row:not(.mine).grouped .msg-bubble { border-top-left-radius: 5px; }
    .msg-row:not(.mine):not(.last) .msg-bubble { border-bottom-left-radius: 5px; }
    .msg-row.mine .msg-bubble {
      background: linear-gradient(135deg, var(--accent, #6366f1), var(--accent-d, #4f46e5));
      color: #fff; border-bottom-right-radius: 5px;
    }
    .msg-row.mine.grouped .msg-bubble { border-top-right-radius: 5px; }
    .msg-row.mine:not(.last) .msg-bubble { border-bottom-right-radius: 5px; }
    .msg-delete-btn {
      background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px;
      color: var(--t4, #94a3b8); opacity: 0; transition: opacity .15s;
      display: flex; align-items: center;
    }
    .msg-delete-btn .material-icons-round { font-size: 16px; }
    .msg-wrapper:hover .msg-delete-btn { opacity: 1; }
    .msg-delete-btn:hover { color: #ef4444; }
    .msg-time { font-size: 10.5px; color: var(--t4, #94a3b8); margin-top: 3px; padding: 0 4px; }

    /* Image/file in bubble */
    .msg-img-link { display: block; }
    .msg-img { max-width: 220px; max-height: 200px; border-radius: 12px; display: block; cursor: pointer; object-fit: cover; }
    .file-link { display: flex; align-items: center; gap: 8px; color: inherit; text-decoration: none; padding: 2px 0; }
    .msg-row.mine .file-link { color: rgba(255,255,255,.95); }
    .file-link .material-icons-round { font-size: 24px; flex-shrink: 0; }
    .file-link-body { display: flex; flex-direction: column; min-width: 0; }
    .file-link-name { font-size: 12.5px; font-weight: 600; word-break: break-all; }
    .file-link-size { font-size: 10.5px; opacity: .75; flex-shrink: 0; }

    /* Attachment input bar */
    .attach-btn { color: var(--t3, #64748b); border-radius: 8px; flex-shrink: 0; }
    .attach-btn:hover { color: var(--accent, #6366f1); background: rgba(99,102,241,0.1); }
    .attach-btn .material-icons-round { font-size: 22px; }

    /* Attachment preview strip */
    .attachment-preview {
      display: flex; align-items: center; gap: 10px; padding: 8px 14px;
      background: rgba(99,102,241,0.08); border-top: 1px solid var(--border, #e2e8f0);
      font-size: 12px; color: var(--t1, #0f172a);
    }
    .attach-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .attach-icon { font-size: 28px; color: var(--accent, #6366f1); flex-shrink: 0; }
    .attach-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .attach-remove { background: none; border: none; cursor: pointer; color: var(--t3, #64748b); display: flex; align-items: center; border-radius: 6px; padding: 2px; }
    .attach-remove:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
    .attach-remove .material-icons-round { font-size: 16px; }

    /* Spinner */
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; display: inline-block; }

    /* Input */
    .input-bar {
      display: flex; align-items: center; gap: 8px; padding: 12px 14px;
      border-top: 1.5px solid var(--border, #e2e8f0); flex-shrink: 0; background: var(--surface, #fff);
      box-shadow: 0 -3px 12px rgba(0,0,0,0.04);
    }
    .msg-input {
      flex: 1; border: 1.5px solid var(--border, #cbd5e1); border-radius: 24px; padding: 10px 16px;
      font-size: 14px; background: var(--surface-2, #f8fafc); color: var(--t1, #0f172a); outline: none;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .msg-input:focus { border-color: var(--accent, #6366f1); background: var(--surface, #fff); box-shadow: 0 0 0 3px rgba(99,102,241,0.18); }
    .send-btn {
      background: linear-gradient(135deg, var(--accent, #6366f1), var(--accent-d, #4f46e5));
      color: #fff; border: none; border-radius: 50%; width: 42px; height: 42px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: transform .15s, box-shadow .15s; box-shadow: 0 2px 8px rgba(79,70,229,0.35);
    }
    .send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 4px 14px rgba(79,70,229,0.45); }
    .send-btn:disabled { opacity: .45; cursor: default; box-shadow: none; }
    .send-btn .material-icons-round { font-size: 20px; }

    /* Group form */
    .group-form {
      padding: 16px; display: flex; flex-direction: column; gap: 10px;
      flex: 1; overflow-y: auto; background: var(--surface, #fff); min-height: 0;
    }
    .form-group-field {
      display: flex; flex-direction: column; gap: 4px; flex: 0 0 auto;
    }
    .group-field-label {
      font-size: 11.5px; font-weight: 700; color: var(--t3, #64748b); text-transform: uppercase; letter-spacing: 0.5px;
    }
    .group-name-input {
      flex: 0 0 auto !important; height: 42px !important; border-radius: 12px !important;
      margin: 0 !important; padding: 10px 14px !important; font-size: 13.5px !important;
    }
    .selected-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0; flex: 0 0 auto; }
    .chip {
      background: rgba(99,102,241,0.1); color: var(--accent, #6366f1); border-radius: 20px;
      padding: 4px 8px 4px 12px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px;
    }
    .chip button {
      background: rgba(0,0,0,.08); border: none; cursor: pointer; color: inherit;
      font-size: 11px; padding: 2px; border-radius: 50%; width: 16px; height: 16px;
      display: flex; align-items: center; justify-content: center;
    }
    .member-pick-item {
      border-radius: 10px; margin-bottom: 2px;
    }
    .checkbox-circle {
      width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border, #cbd5e1);
      display: flex; align-items: center; justify-content: center; margin-left: auto; transition: all .15s;
    }
    .checkbox-circle.checked {
      background: var(--accent, #6366f1); border-color: var(--accent, #6366f1); color: #fff;
    }
    .checkbox-circle .check-icon { font-size: 15px; color: #fff; margin: 0; }
    .create-btn {
      margin-top: auto; flex: 0 0 auto; background: linear-gradient(135deg, var(--accent, #6366f1), var(--accent-d, #4f46e5));
      color: #fff; border: none; border-radius: 12px; padding: 12px; font-size: 14px; cursor: pointer;
      font-weight: 600; box-shadow: 0 2px 6px rgba(79,70,229,0.25); transition: transform .15s, box-shadow .15s;
    }
    .create-btn:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(79,70,229,0.35); }
    .create-btn:disabled { opacity: .4; cursor: default; box-shadow: none; }

    /* Broadcast */
    .bc-hint { font-size: 12.5px; color: var(--t3, #64748b); margin: 0 0 14px; line-height: 1.5; }
    .bc-btn {
      display: flex; align-items: center; gap: 12px; padding: 13px 14px; cursor: pointer;
      background: var(--surface-2, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 14px;
      font-size: 14px; font-weight: 500; color: var(--t2, #1e293b); margin-bottom: 10px; width: 100%; text-align: left;
      transition: background .15s, border-color .15s, transform .1s;
    }
    .bc-btn:hover { background: rgba(99,102,241,0.08); border-color: var(--accent, #6366f1); transform: translateX(2px); }
    .bc-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .bc-icon .material-icons-round { font-size: 20px; color: var(--accent, #6366f1); }
    .bc-label { flex: 1; }
    .bc-chevron { font-size: 20px; color: var(--t4, #94a3b8); }

    /* Responsive: Mobile Fullscreen Bottom-Sheet View */
    @media (max-width: 640px) {
      :host {
        bottom: 76px; right: 16px;
      }
      .chat-fab {
        width: 52px; height: 52px;
      }
      .chat-panel-backdrop {
        display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4);
        z-index: 1201;
      }
      .chat-panel {
        position: fixed; inset: auto 0 0 0;
        width: 100vw; height: 90vh; max-height: 90vh;
        border-radius: 20px 20px 0 0; border: none; border-top: 1px solid var(--border, #e2e8f0);
        z-index: 1205; box-shadow: 0 -10px 30px rgba(0,0,0,0.25);
      }
      .input-bar {
        padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
      }
      .msg-input, .search-input {
        font-size: 16px !important;
      }
    }
  `]
})
export class ChatPanelComponent implements AfterViewChecked {
  chatSvc  = inject(ChatService);
  auth     = inject(AuthService);
  swalSvc  = inject(SwalNotificationService);

  panelOpen       = signal(false);
  view            = signal<'list' | 'new-dm' | 'new-group' | 'broadcast'>('list');
  activeConv      = signal<Conversation | null>(null);
  loadingUserId   = signal<number | null>(null);
  search          = '';
  draft           = '';
  groupName       = '';
  selectedUserIds = signal<Set<number>>(new Set());
  classes         = signal<{ classId: number; className: string }[]>([]);
  pendingFile     = signal<UploadResult | null>(null);
  uploading       = signal(false);
  apiBase         = environment.apiUrl.replace('/api', '');

  private avatarPalette = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#3b82f6'];

  @ViewChild('msgArea') msgArea?: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  myId = computed(() => this.auth.currentUser()?.userId ?? 0);

  canCreateGroup = computed(() => {
    const role = (this.auth.currentUser()?.role ?? '').toLowerCase();
    return ['superadmin','admin','principal','teacher','headmaster','staff'].includes(role);
  });

  isBroadcaster = computed(() => {
    const role = (this.auth.currentUser()?.role ?? '').toLowerCase();
    return ['superadmin','admin','principal','teacher','headmaster'].includes(role);
  });

  filteredConvs = computed(() => {
    const q = this.search.toLowerCase().trim();
    if (!q) return this.chatSvc.conversations();
    return this.chatSvc.conversations().filter(c => c.name.toLowerCase().includes(q));
  });

  filteredUsers = computed(() => {
    const q = this.search.toLowerCase().trim();
    const users = this.chatSvc.allUsers();
    if (!q) return users;
    return users.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      (u.roleName && u.roleName.toLowerCase().includes(q))
    );
  });

  /** Consecutive messages from the same sender are visually grouped (Messenger-style). */
  messagesWithMeta = computed(() => {
    const msgs = this.chatSvc.messages();
    return msgs.map((msg, i) => {
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      return {
        msg,
        grouped: !!prev && prev.senderId === msg.senderId,
        lastInGroup: !next || next.senderId !== msg.senderId,
        showSender: !prev || prev.senderId !== msg.senderId,
      };
    });
  });

  private prevMsgCount = 0;

  constructor() {
    // Watch triggerOpenUserId — notification bell opens a DM
    effect(() => {
      const uid = this.chatSvc.triggerOpenUserId();
      if (!uid) return;
      this.chatSvc.triggerOpenUserId.set(null);
      this.chatSvc.startDm(uid).subscribe(r => {
        this.chatSvc.loadConversations();
        const conv = this.chatSvc.conversations().find(c => c.conversationId === r.conversationId);
        if (conv) {
          this.openConv(conv);
        } else {
          setTimeout(() => {
            const c2 = this.chatSvc.conversations().find(c => c.conversationId === r.conversationId);
            if (c2) this.openConv(c2);
          }, 300);
        }
        this.panelOpen.set(true);
      });
    });

    // Watch triggerOpenConvId
    effect(() => {
      const cid = this.chatSvc.triggerOpenConvId();
      if (!cid) return;
      this.chatSvc.triggerOpenConvId.set(null);
      const conv = this.chatSvc.conversations().find(c => c.conversationId === cid);
      if (conv) { this.openConv(conv); this.panelOpen.set(true); }
    });
  }

  ngAfterViewChecked() {
    const msgs = this.chatSvc.messages();
    if (msgs.length !== this.prevMsgCount && this.msgArea) {
      this.prevMsgCount = msgs.length;
      const el = this.msgArea.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  togglePanel() {
    this.panelOpen.update(v => !v);
    if (this.panelOpen()) {
      this.chatSvc.loadConversations();
      this.chatSvc.loadUsers();
      this.loadClasses();
    }
  }

  openConv(c: Conversation) {
    this.activeConv.set(c);
    this.chatSvc.loadMessages(c.conversationId);
    this.draft = '';
    setTimeout(() => {
      this.inputEl?.nativeElement?.focus();
    }, 120);
  }

  closeConv() {
    this.activeConv.set(null);
    this.chatSvc.loadConversations();
  }

  send() {
    const conv = this.activeConv();
    const text = this.draft.trim();
    const hasFile = !!this.pendingFile();
    if (!conv || (!text && !hasFile)) return;

    this.draft = '';

    if (hasFile) {
      // Use REST endpoint so attachment metadata is persisted
      const attachment = this.pendingFile()!;
      this.pendingFile.set(null);
      this.chatSvc.sendMessageWithAttachment(conv.conversationId, text, attachment).subscribe({
        next: msg => {
          this.chatSvc.messages.update(m =>
            m.some(x => x.chatMessageId === msg.chatMessageId) ? m : [...m, msg]
          );
          this.chatSvc.loadConversations();
        },
        error: err => {
          console.error('Failed to send attachment message', err);
        }
      });
    } else {
      if (this.chatSvc.connected()) {
        this.chatSvc.sendMessage(conv.conversationId, text).catch(() => {
          // Fallback to REST if SignalR fails
          this.sendRestFallback(conv.conversationId, text);
        });
      } else {
        // Direct REST send
        this.sendRestFallback(conv.conversationId, text);
      }
    }
  }

  private sendRestFallback(convId: number, text: string) {
    this.chatSvc.sendMessageWithAttachment(convId, text, null).subscribe({
      next: msg => {
        this.chatSvc.messages.update(m =>
          m.some(x => x.chatMessageId === msg.chatMessageId) ? m : [...m, msg]
        );
        this.chatSvc.loadConversations();
      },
      error: err => {
        console.error('Failed to send message via fallback', err);
      }
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.chatSvc.uploadFile(file).subscribe({
      next: result => { this.pendingFile.set(result); this.uploading.set(false); },
      error: ()   => { this.uploading.set(false); alert('Upload failed. Max 20 MB.'); }
    });
    (event.target as HTMLInputElement).value = '';
  }

  formatSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  startDm(u: ChatUser) {
    this.loadingUserId.set(u.userId);
    this.chatSvc.startDm(u.userId).subscribe({
      next: (r) => {
        this.loadingUserId.set(null);
        this.chatSvc.loadConversations();
        const placeholder: Conversation = {
          conversationId: r.conversationId,
          name: u.fullName,
          conversationType: 'direct',
          classId: null,
          lastMessage: '',
          lastMessageAt: null,
          unreadCount: 0,
          isOnline: u.isOnline,
          otherUserId: u.userId,
          members: [
            { userId: this.myId(), fullName: this.auth.currentUser()?.fullName ?? 'Me', roleName: this.auth.currentUser()?.role ?? '', isAdmin: true, isOnline: true },
            { userId: u.userId, fullName: u.fullName, roleName: u.roleName, isAdmin: false, isOnline: u.isOnline }
          ]
        };
        this.openConv(placeholder);
        this.view.set('list');
        this.search = '';
      },
      error: (err) => {
        this.loadingUserId.set(null);
        console.error('Error starting conversation', err);
      }
    });
  }

  toggleUser(uid: number) {
    this.selectedUserIds.update(s => {
      const copy = new Set(s);
      copy.has(uid) ? copy.delete(uid) : copy.add(uid);
      return copy;
    });
  }

  userName(uid: number) {
    return this.chatSvc.allUsers().find(u => u.userId === uid)?.fullName ?? uid.toString();
  }

  createGroup() {
    if (!this.groupName.trim() || this.selectedUserIds().size === 0) return;
    const ids = [...this.selectedUserIds()];
    this.chatSvc.createGroup(this.groupName.trim(), ids).subscribe(r => {
      this.groupName = '';
      this.selectedUserIds.set(new Set());
      this.chatSvc.loadConversations();
      setTimeout(() => {
        const conv = this.chatSvc.conversations().find(c => c.conversationId === r.conversationId);
        if (conv) this.openConv(conv);
        this.view.set('list');
      }, 200);
    });
  }

  openBroadcast(type: 'staff' | 'class-parents', classId?: number) {
    const obs = type === 'staff'
      ? this.chatSvc.getOrCreateStaffGroup()
      : this.chatSvc.getOrCreateClassParentsGroup(classId!);

    obs.subscribe(r => {
      this.chatSvc.loadConversations();
      setTimeout(() => {
        const conv = this.chatSvc.conversations().find(c => c.conversationId === r.conversationId);
        if (conv) { this.openConv(conv); this.view.set('list'); }
      }, 200);
    });
  }

  private loadClasses() {
    if (!this.isBroadcaster()) return;
    if (this.classes().length > 0) return;
    this.chatSvc['http']
      .get<{ classId: number; className: string }[]>(`${this.chatSvc['base'].replace('/chat', '')}/class`)
      .subscribe({ next: c => this.classes.set(c), error: () => {} });
  }

  confirmDeleteConv(event: Event, c: Conversation) {
    event.stopPropagation();
    const label = c.conversationType === 'group' ? `group "${c.name}"` : `chat with ${c.name}`;
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    this.chatSvc.deleteConversation(c.conversationId).subscribe({
      next: () => {
        if (this.activeConv()?.conversationId === c.conversationId) this.activeConv.set(null);
        this.chatSvc.loadConversations();
      }
    });
  }

  confirmDeleteMsg(msgId: number) {
    if (!confirm('Delete this message?')) return;
    this.chatSvc.deleteMessage(msgId).subscribe({
      next: () => {
        this.chatSvc.messages.update(m => m.filter(x => x.chatMessageId !== msgId));
      }
    });
  }

  avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return this.avatarPalette[hash % this.avatarPalette.length];
  }

  initials(name: string) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0] ?? '').slice(0, 2).join('').toUpperCase();
  }
}
