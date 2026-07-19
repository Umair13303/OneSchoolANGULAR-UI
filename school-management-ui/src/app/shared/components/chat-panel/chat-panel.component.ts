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
    <!-- FAB -->
    <button class="chat-fab" (click)="togglePanel()" [class.has-unread]="chatSvc.totalUnread() > 0" [class.open]="panelOpen()">
      <span class="material-icons-round fab-icon">{{ panelOpen() ? 'close' : 'chat' }}</span>
      @if (chatSvc.totalUnread() > 0 && !panelOpen()) {
        <span class="fab-badge">{{ chatSvc.totalUnread() > 99 ? '99+' : chatSvc.totalUnread() }}</span>
      }
    </button>

    @if (panelOpen()) {
      <div class="chat-panel">

        <!-- ── Conversation view ── -->
        @if (activeConv()) {
          <div class="panel-header">
            <button class="back-btn" (click)="closeConv()">
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
              <div>
                <p class="conv-name">{{ activeConv()!.name }}</p>
                <p class="conv-sub">
                  @if (activeConv()!.conversationType === 'group') {
                    {{ activeConv()!.members.length }} members
                  } @else if (activeConv()!.isOnline) {
                    <span class="live-dot"></span> Online
                  } @else {
                    Offline
                  }
                </p>
              </div>
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
                      <span>{{ item.msg.content }}</span>
                    }
                  </div>
                  @if (item.msg.senderId === myId()) {
                    <button class="msg-delete-btn" (click)="confirmDeleteMsg(item.msg.chatMessageId)" title="Delete">
                      <span class="material-icons-round">delete</span>
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
                <span class="material-icons-round">waving_hand</span>
                <p>No messages yet</p>
                <span>Say hello to start the conversation</span>
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
          <div class="input-bar">
            <button class="icon-sm attach-btn" (click)="fileInput.click()" title="Attach file">
              <span class="material-icons-round">attach_file</span>
            </button>
            <input #fileInput type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                   (change)="onFileSelected($event)" />
            <input #inputEl [(ngModel)]="draft" placeholder="Type a message…"
                   (keydown.enter)="send()" class="msg-input" />
            <button class="send-btn" (click)="send()" [disabled]="!draft.trim() && !pendingFile()" [class.uploading]="uploading()">
              @if (uploading()) {
                <span class="material-icons-round spin">sync</span>
              } @else {
                <span class="material-icons-round">send</span>
              }
            </button>
          </div>

        <!-- ── Conversation list ── -->
        } @else if (view() === 'list') {
          <div class="panel-header">
            <div class="panel-title">
              <span class="material-icons-round">forum</span>
              <span>Messages</span>
            </div>
            <div class="header-actions">
              <div class="conn-dot" [class.online]="chatSvc.connected()" [title]="chatSvc.connected() ? 'Connected' : 'Reconnecting…'"></div>
              <!-- Notification toggle -->
              <button class="icon-sm notif-toggle"
                      [class.notif-off]="!swalSvc.enabled()"
                      (click)="swalSvc.toggle()"
                      [title]="swalSvc.enabled() ? 'Mute notifications' : 'Enable notifications'">
                <span class="material-icons-round">
                  {{ swalSvc.enabled() ? 'notifications_active' : 'notifications_off' }}
                </span>
              </button>
              <button class="icon-sm" (click)="view.set('new-dm')" title="New Message">
                <span class="material-icons-round">person_add</span>
              </button>
              @if (canCreateGroup()) {
                <button class="icon-sm" (click)="view.set('new-group')" title="New Group">
                  <span class="material-icons-round">group_add</span>
                </button>
              }
              @if (isBroadcaster()) {
                <button class="icon-sm" (click)="view.set('broadcast')" title="Broadcast">
                  <span class="material-icons-round">campaign</span>
                </button>
              }
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
                  <p class="conv-last" [class.unread]="c.unreadCount > 0">{{ c.lastMessage || 'No messages yet' }}</p>
                </div>
                @if (c.unreadCount > 0) {
                  <span class="unread-badge">{{ c.unreadCount }}</span>
                }
                <button class="conv-delete-btn" (click)="confirmDeleteConv($event, c)" title="Delete">
                  <span class="material-icons-round">delete</span>
                </button>
              </div>
            }
            @if (filteredConvs().length === 0) {
              <div class="empty-state">
                <span class="material-icons-round">forum</span>
                <p>No conversations yet</p>
                <span>Start a new message above</span>
              </div>
            }
          </div>

        <!-- ── New DM: pick a user ── -->
        } @else if (view() === 'new-dm') {
          <div class="panel-header">
            <button class="back-btn" (click)="view.set('list')">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="panel-title"><span>New Message</span></div>
          </div>
          <div class="search-row">
            <span class="material-icons-round search-icon">search</span>
            <input [(ngModel)]="search" placeholder="Search people…" class="search-input" />
          </div>
          <div class="conv-list">
            @for (u of filteredUsers(); track u.userId) {
              <div class="conv-item" (click)="startDm(u)">
                <div class="conv-avatar" [style.background]="avatarColor(u.fullName)" [class.online-ring]="u.isOnline">{{ initials(u.fullName) }}</div>
                <div class="conv-body">
                  <div class="conv-name">{{ u.fullName }}</div>
                  <p class="conv-last">{{ u.roleName }}</p>
                </div>
              </div>
            }
          </div>

        <!-- ── New Group ── -->
        } @else if (view() === 'new-group') {
          <div class="panel-header">
            <button class="back-btn" (click)="view.set('list')">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="panel-title"><span>New Group</span></div>
          </div>
          <div class="group-form">
            <input [(ngModel)]="groupName" placeholder="Group name…" class="msg-input group-name-input" />
            <div class="search-row">
              <span class="material-icons-round search-icon">search</span>
              <input [(ngModel)]="search" placeholder="Add members…" class="search-input" />
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
                <div class="conv-item" (click)="toggleUser(u.userId)" [class.selected]="selectedUserIds().has(u.userId)">
                  <div class="conv-avatar" [style.background]="avatarColor(u.fullName)">{{ initials(u.fullName) }}</div>
                  <div class="conv-body">
                    <div class="conv-name">{{ u.fullName }}</div>
                    <p class="conv-last">{{ u.roleName }}</p>
                  </div>
                  @if (selectedUserIds().has(u.userId)) {
                    <span class="material-icons-round check-icon">check_circle</span>
                  }
                </div>
              }
            </div>
            <button class="create-btn" [disabled]="!groupName.trim() || selectedUserIds().size === 0"
                    (click)="createGroup()">
              Create Group {{ selectedUserIds().size > 0 ? '(' + selectedUserIds().size + ')' : '' }}
            </button>
          </div>

        <!-- ── Broadcast ── -->
        } @else if (view() === 'broadcast') {
          <div class="panel-header">
            <button class="back-btn" (click)="view.set('list')">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="panel-title"><span>Broadcast</span></div>
          </div>
          <div class="group-form">
            <p class="bc-hint">Send a message to a preset group. The group is auto-created on first use.</p>
            <button class="bc-btn" (click)="openBroadcast('staff')">
              <span class="bc-icon"><span class="material-icons-round">people</span></span>
              <span class="bc-label">All Staff</span>
              <span class="material-icons-round bc-chevron">chevron_right</span>
            </button>
            @for (cls of classes(); track cls.classId) {
              <button class="bc-btn" (click)="openBroadcast('class-parents', cls.classId)">
                <span class="bc-icon"><span class="material-icons-round">family_restroom</span></span>
                <span class="bc-label">{{ cls.className }} — Parents</span>
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
      width: 56px; height: 56px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-d));
      color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: var(--sh-lg);
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
      position: relative;
    }
    .chat-fab:hover { transform: translateY(-2px) scale(1.06); box-shadow: var(--sh-xl); }
    .chat-fab:active { transform: scale(.94); }
    .chat-fab.has-unread:not(.open) { animation: fabPulse 2.2s ease-in-out infinite; }
    .fab-icon { font-size: 24px; transition: transform .2s; }
    .chat-fab.open .fab-icon { transform: rotate(90deg); }
    @keyframes fabPulse {
      0%, 100% { box-shadow: var(--sh-lg), 0 0 0 0 rgba(var(--accent-rgb),.35); }
      50%      { box-shadow: var(--sh-lg), 0 0 0 9px rgba(var(--accent-rgb),0); }
    }
    .fab-badge {
      position: absolute; top: -3px; right: -3px; background: var(--red); color: #fff;
      font-size: 10px; font-weight: 700; border-radius: 20px; padding: 2px 6px;
      min-width: 18px; text-align: center; border: 2px solid var(--surface);
      box-shadow: 0 2px 6px rgba(0,0,0,.25);
    }

    /* Panel */
    .chat-panel {
      position: absolute; bottom: 68px; right: 0;
      width: 380px; height: 580px; max-height: calc(100vh - 108px);
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-2xl); box-shadow: var(--sh-xl);
      display: flex; flex-direction: column; overflow: hidden;
      animation: panelIn .2s cubic-bezier(.16,1,.3,1);
    }
    @keyframes panelIn { from { opacity: 0; transform: translateY(18px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

    /* Header */
    .panel-header {
      display: flex; align-items: center; gap: 10px; padding: 14px 16px;
      background: linear-gradient(135deg, var(--accent), var(--accent-d)); color: #fff; flex-shrink: 0;
    }
    .panel-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; flex: 1; }
    .panel-title .material-icons-round { font-size: 20px; }
    .header-actions { display: flex; align-items: center; gap: 2px; margin-left: auto; }
    .conn-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.4); margin-right: 4px; transition: background .2s; }
    .conn-dot.online { background: var(--green); box-shadow: 0 0 0 3px rgba(74,222,128,.25); }
    .notif-toggle.notif-off { opacity: .55; }
    .icon-sm { background: none; border: none; color: #fff; cursor: pointer; padding: 5px; border-radius: 8px; display: flex; transition: background .15s; }
    .icon-sm:hover { background: rgba(255,255,255,.18); }
    .icon-sm .material-icons-round { font-size: 19px; }
    .back-btn { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; display: flex; border-radius: 8px; transition: background .15s; }
    .back-btn:hover { background: rgba(255,255,255,.18); }
    .back-btn .material-icons-round { font-size: 22px; }

    /* Search */
    .search-row {
      display: flex; align-items: center; gap: 8px; position: relative;
      padding: 10px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0;
      background: var(--surface);
    }
    .search-icon { position: absolute; left: 26px; font-size: 17px; color: var(--t4); pointer-events: none; }
    .search-input {
      flex: 1; border: 1.5px solid var(--border); background: var(--surface-2); outline: none;
      font-size: 13px; color: var(--t1); border-radius: var(--r-lg); padding: 8px 12px 8px 32px;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .search-input:focus { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px var(--accent-g); }
    .search-input::placeholder { color: var(--t4); }

    /* Conversation list */
    .conv-list { flex: 1; overflow-y: auto; background: var(--surface); }
    .conv-list.nested { flex: initial; max-height: 220px; border: 1px solid var(--border); border-radius: var(--r-lg); margin-top: 8px; }
    .conv-item {
      display: flex; align-items: center; gap: 11px; padding: 10px 14px; cursor: pointer;
      border-bottom: 1px solid var(--border); transition: background .12s;
      background: var(--surface); position: relative;
    }
    .conv-item:hover { background: var(--surface-2); }
    .conv-item.selected { background: var(--accent-s); }
    .conv-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--accent); color: #fff; font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 0 0 2px var(--surface);
    }
    .conv-avatar.group-avatar { background: var(--purple); }
    .conv-avatar.group-avatar .material-icons-round { font-size: 19px; }
    .conv-avatar.online-ring { box-shadow: 0 0 0 2px var(--surface), 0 0 0 3.5px var(--green); }

    .conv-body { flex: 1; min-width: 0; }
    .conv-row1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .conv-name { font-size: 13.5px; font-weight: 600; color: var(--t2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv-name.unread { color: var(--t1); font-weight: 700; }
    .conv-time { font-size: 10.5px; color: var(--t4); flex-shrink: 0; }
    .conv-last { font-size: 12px; color: var(--t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 2px 0 0; }
    .conv-last.unread { color: var(--t2); font-weight: 500; }
    .conv-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .conv-sub { font-size: 11px; color: rgba(255,255,255,.75); margin: 1px 0 0; display: flex; align-items: center; gap: 4px; }
    .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 2px rgba(74,222,128,.3); }

    .unread-badge {
      background: var(--accent); color: #fff; border-radius: 20px;
      padding: 2px 7px; font-size: 11px; font-weight: 700; flex-shrink: 0; min-width: 18px; text-align: center;
    }
    .conv-delete-btn {
      background: none; border: none; cursor: pointer; padding: 5px; border-radius: 8px;
      color: var(--t4); opacity: 0; transition: opacity .15s, background .15s, color .15s; flex-shrink: 0;
      display: flex; align-items: center; position: absolute; right: 10px;
    }
    .conv-delete-btn .material-icons-round { font-size: 16px; }
    .conv-item:hover .conv-delete-btn { opacity: 1; }
    .conv-item:hover .unread-badge { opacity: 0; }
    .conv-delete-btn:hover { color: var(--red); background: var(--red-s); }
    .empty-state, .no-msgs {
      padding: 48px 24px; text-align: center; color: var(--t3); display: flex; flex-direction: column;
      align-items: center; gap: 6px;
    }
    .empty-state .material-icons-round, .no-msgs .material-icons-round {
      font-size: 34px; color: var(--t4); margin-bottom: 4px;
    }
    .empty-state p, .no-msgs p { font-size: 13.5px; font-weight: 600; color: var(--t2); margin: 0; }
    .empty-state span:last-child, .no-msgs span:last-child { font-size: 12px; color: var(--t4); }

    /* Messages */
    .messages-area { flex: 1; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 2px; background: var(--surface); }
    .msg-row { display: flex; flex-direction: column; align-items: flex-start; max-width: 82%; margin-top: 10px; }
    .msg-row:first-child { margin-top: 0; }
    .msg-row.grouped { margin-top: 2px; }
    .msg-row.mine { align-self: flex-end; align-items: flex-end; }
    .msg-sender-label { font-size: 10.5px; font-weight: 600; color: var(--accent); margin-bottom: 3px; padding-left: 4px; }
    .msg-wrapper { display: flex; align-items: center; gap: 4px; }
    .msg-row.mine .msg-wrapper { flex-direction: row-reverse; }
    .msg-bubble {
      background: var(--surface-2); color: var(--t1); border-radius: 16px;
      padding: 8px 13px; font-size: 13.5px; line-height: 1.45; word-break: break-word;
      box-shadow: var(--sh-xs);
    }
    .msg-row:not(.mine) .msg-bubble { border-bottom-left-radius: 5px; }
    .msg-row:not(.mine).grouped .msg-bubble { border-top-left-radius: 5px; }
    .msg-row:not(.mine):not(.last) .msg-bubble { border-bottom-left-radius: 5px; }
    .msg-row.mine .msg-bubble { background: linear-gradient(135deg, var(--accent), var(--accent-d)); color: #fff; border-bottom-right-radius: 5px; }
    .msg-row.mine.grouped .msg-bubble { border-top-right-radius: 5px; }
    .msg-row.mine:not(.last) .msg-bubble { border-bottom-right-radius: 5px; }
    .msg-delete-btn {
      background: none; border: none; cursor: pointer; padding: 3px; border-radius: 6px;
      color: var(--t4); opacity: 0; transition: opacity .15s;
      display: flex; align-items: center;
    }
    .msg-delete-btn .material-icons-round { font-size: 14px; }
    .msg-wrapper:hover .msg-delete-btn { opacity: 1; }
    .msg-delete-btn:hover { color: var(--red); }
    .msg-time { font-size: 10px; color: var(--t4); margin-top: 3px; padding: 0 4px; }
    /* Image/file in bubble */
    .msg-img-link { display: block; }
    .msg-img { max-width: 210px; max-height: 190px; border-radius: 11px; display: block; cursor: pointer; object-fit: cover; }
    .file-link { display: flex; align-items: center; gap: 8px; color: inherit; text-decoration: none; padding: 2px 0; }
    .msg-row.mine .file-link { color: rgba(255,255,255,.95); }
    .file-link .material-icons-round { font-size: 24px; flex-shrink: 0; }
    .file-link-body { display: flex; flex-direction: column; min-width: 0; }
    .file-link-name { font-size: 12.5px; font-weight: 600; word-break: break-all; }
    .file-link-size { font-size: 10.5px; opacity: .75; flex-shrink: 0; }
    /* Attachment input bar */
    .attach-btn { color: var(--t3); border-radius: 8px; flex-shrink: 0; }
    .attach-btn:hover { color: var(--accent); background: var(--accent-s); }
    .attach-btn .material-icons-round { font-size: 20px; }
    /* Attachment preview strip */
    .attachment-preview {
      display: flex; align-items: center; gap: 10px; padding: 8px 14px;
      background: var(--accent-s); border-top: 1px solid var(--border);
      font-size: 12px; color: var(--t1);
    }
    .attach-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .attach-icon { font-size: 28px; color: var(--accent); flex-shrink: 0; }
    .attach-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .attach-remove { background: none; border: none; cursor: pointer; color: var(--t3); display: flex; align-items: center; border-radius: 6px; padding: 2px; }
    .attach-remove:hover { color: var(--red); background: var(--red-s); }
    .attach-remove .material-icons-round { font-size: 16px; }
    /* Spinner */
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; display: inline-block; }

    /* Input */
    .input-bar { display: flex; align-items: center; gap: 8px; padding: 12px; border-top: 1px solid var(--border); flex-shrink: 0; background: var(--surface); }
    .msg-input { flex: 1; border: 1.5px solid var(--border); border-radius: 22px; padding: 9px 15px; font-size: 13px; background: var(--surface-2); color: var(--t1); outline: none; transition: border-color .15s, box-shadow .15s, background .15s; }
    .msg-input:focus { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px var(--accent-g); }
    .send-btn {
      background: linear-gradient(135deg, var(--accent), var(--accent-d)); color: #fff; border: none;
      border-radius: 50%; width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: transform .15s, box-shadow .15s; box-shadow: var(--sh-xs);
    }
    .send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: var(--sh); }
    .send-btn:disabled { opacity: .4; cursor: default; box-shadow: none; }
    .send-btn .material-icons-round { font-size: 18px; }

    /* Group form */
    .group-form { padding: 14px; display: flex; flex-direction: column; gap: 0; flex: 1; overflow-y: auto; background: var(--surface); }
    .group-name-input { border-radius: var(--r-lg); margin-bottom: 10px; }
    .selected-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 2px; }
    .chip { background: var(--accent-s); color: var(--accent); border-radius: 20px; padding: 3px 6px 3px 11px; font-size: 11.5px; font-weight: 500; display: flex; align-items: center; gap: 5px; }
    .chip button { background: rgba(0,0,0,.06); border: none; cursor: pointer; color: inherit; font-size: 10px; padding: 2px; border-radius: 50%; width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; }
    .check-icon { color: var(--accent); font-size: 19px; margin-left: auto; }
    .create-btn {
      margin-top: 12px; background: linear-gradient(135deg, var(--accent), var(--accent-d)); color: #fff; border: none;
      border-radius: var(--r-lg); padding: 11px; font-size: 13.5px; cursor: pointer; font-weight: 600;
      box-shadow: var(--sh-xs); transition: transform .15s, box-shadow .15s;
    }
    .create-btn:hover:not(:disabled) { box-shadow: var(--sh); }
    .create-btn:disabled { opacity: .4; cursor: default; box-shadow: none; }

    /* Broadcast */
    .bc-hint { font-size: 12px; color: var(--t3); margin: 0 0 14px; line-height: 1.5; }
    .bc-btn {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer;
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-lg);
      font-size: 13.5px; font-weight: 500; color: var(--t2); margin-bottom: 8px; width: 100%; text-align: left;
      transition: background .15s, border-color .15s, transform .1s;
    }
    .bc-btn:hover { background: var(--accent-s); border-color: var(--accent); transform: translateX(2px); }
    .bc-icon { width: 34px; height: 34px; border-radius: 10px; background: var(--accent-s); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .bc-icon .material-icons-round { font-size: 18px; color: var(--accent); }
    .bc-label { flex: 1; }
    .bc-chevron { font-size: 18px; color: var(--t4); }

    /* Responsive: near-full-screen on small viewports */
    @media (max-width: 480px) {
      :host { bottom: 16px; right: 16px; }
      .chat-panel {
        width: calc(100vw - 24px); height: calc(100vh - 100px);
        right: -8px; bottom: 64px;
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
  search          = '';
  draft           = '';
  groupName       = '';
  selectedUserIds = signal<Set<number>>(new Set());
  classes         = signal<{ classId: number; className: string }[]>([]);
  pendingFile     = signal<UploadResult | null>(null);
  uploading       = signal(false);
  apiBase         = environment.apiUrl.replace('/api', '');

  private avatarPalette = ['var(--accent)', 'var(--purple)', 'var(--green)', 'var(--amber)', 'var(--red)', 'var(--accent-d)'];

  @ViewChild('msgArea') msgArea?: ElementRef<HTMLDivElement>;

  myId = computed(() => this.auth.currentUser()?.userId ?? 0);

  canCreateGroup = computed(() => {
    const role = (this.auth.currentUser()?.role ?? '').toLowerCase();
    return ['superadmin','admin','principal'].includes(role);
  });

  isBroadcaster = computed(() => {
    const role = (this.auth.currentUser()?.role ?? '').toLowerCase();
    return ['superadmin','admin','principal','teacher'].includes(role);
  });

  filteredConvs = computed(() => {
    const q = this.search.toLowerCase();
    return this.chatSvc.conversations().filter(c => c.name.toLowerCase().includes(q));
  });

  filteredUsers = computed(() => {
    const q = this.search.toLowerCase();
    return this.chatSvc.allUsers().filter(u => u.fullName.toLowerCase().includes(q));
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
          // conv not loaded yet — load then open
          setTimeout(() => {
            const c2 = this.chatSvc.conversations().find(c => c.conversationId === r.conversationId);
            if (c2) this.openConv(c2);
          }, 400);
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
  }

  closeConv() {
    this.activeConv.set(null);
    this.chatSvc.loadConversations();
  }

  send() {
    const conv = this.activeConv();
    const hasText = !!this.draft.trim();
    const hasFile = !!this.pendingFile();
    if (!conv || (!hasText && !hasFile)) return;

    if (hasFile) {
      // Use REST endpoint so attachment metadata is persisted
      const text = this.draft.trim();
      this.draft = '';
      const attachment = this.pendingFile()!;
      this.pendingFile.set(null);
      this.chatSvc.sendMessageWithAttachment(conv.conversationId, text, attachment).subscribe({
        next: msg => {
          // SignalR will also deliver it; dedupe by id
          this.chatSvc.messages.update(m =>
            m.some(x => x.chatMessageId === msg.chatMessageId) ? m : [...m, msg]
          );
        }
      });
    } else {
      const text = this.draft.trim();
      this.draft = '';
      this.chatSvc.sendMessage(conv.conversationId, text).catch(() => {});
    }
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
    this.chatSvc.startDm(u.userId).subscribe(r => {
      this.chatSvc.loadConversations();
      setTimeout(() => {
        const conv = this.chatSvc.conversations().find(c => c.conversationId === r.conversationId);
        const placeholder: Conversation = {
          conversationId: r.conversationId, name: u.fullName, conversationType: 'direct',
          classId: null, lastMessage: '', lastMessageAt: null, unreadCount: 0,
          isOnline: u.isOnline, otherUserId: u.userId, members: []
        };
        this.openConv(conv ?? placeholder);
        this.view.set('list');
        this.search = '';
      }, 200);
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
    // Only load for broadcasters
    if (!this.isBroadcaster()) return;
    // Reuse existing class data if already loaded
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
    return name.split(' ').map(n => n[0] ?? '').slice(0, 2).join('').toUpperCase();
  }
}
