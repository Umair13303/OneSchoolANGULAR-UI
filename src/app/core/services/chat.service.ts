import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { SwalNotificationService } from './swal-notification.service';

export interface Conversation {
  conversationId:   number;
  name:             string;
  conversationType: 'direct' | 'group';
  classId:          number | null;
  lastMessage:      string;
  lastMessageAt:    string | null;
  unreadCount:      number;
  isOnline:         boolean;
  otherUserId:      number | null;
  members:          ConversationMember[];
}

export interface ConversationMember {
  userId:   number;
  fullName: string;
  roleName: string;
  isAdmin:  boolean;
  isOnline: boolean;
}

export interface ChatMessage {
  chatMessageId:  number;
  conversationId: number;
  senderId:       number;
  senderName:     string;
  content:        string;
  sentAt:         string;
  isRead:         boolean;
  attachmentUrl:  string | null;
  attachmentName: string | null;
  attachmentType: string | null;  // 'image' | 'pdf' | 'file'
  attachmentSize: number | null;
}

export interface UploadResult {
  url:  string;
  name: string;
  type: string;
  size: number;
}

export interface ChatUser {
  userId:   number;
  fullName: string;
  roleName: string;
  isOnline: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http  = inject(HttpClient);
  private auth  = inject(AuthService);
  private swal  = inject(SwalNotificationService);
  private base  = `${environment.apiUrl}/chat`;
  private hub!: signalR.HubConnection;

  conversations       = signal<Conversation[]>([]);
  activeConvId        = signal<number | null>(null);
  messages            = signal<ChatMessage[]>([]);
  connected           = signal(false);
  allUsers            = signal<ChatUser[]>([]);

  totalUnread = computed(() => this.conversations().reduce((s, c) => s + c.unreadCount, 0));

  // Used by notification bell to open a specific DM conversation
  triggerOpenUserId   = signal<number | null>(null);
  // Used directly to open a group or DM by conversationId
  triggerOpenConvId   = signal<number | null>(null);

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  connect() {
    if (this.hub && this.hub.state !== signalR.HubConnectionState.Disconnected) {
      this.startFallbackPoll();
      return;
    }

    const token = () => this.auth.getToken() ?? '';
    const hubUrl = `${environment.apiUrl.replace('/api', '')}/hubs/chat`;
    const currentToken = token();

    // MonsterASP/IIS often advertises WebSockets but the upgrade hangs. In production
    // prefer Long Polling / SSE (they also send the JWT as a header, not only query string).
    const transport = environment.production
      ? signalR.HttpTransportType.LongPolling | signalR.HttpTransportType.ServerSentEvents
      : signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.ServerSentEvents |
        signalR.HttpTransportType.LongPolling;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: token,
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
        transport
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(environment.production ? signalR.LogLevel.Error : signalR.LogLevel.Warning)
      .build();

    this.hub.on('ReceiveMessage', (msg: ChatMessage) => {
      const myId = this.auth.currentUser()?.userId;
      const isActiveConv = this.activeConvId() === msg.conversationId;

      if (isActiveConv) {
        this.messages.update(m =>
          m.some(x => x.chatMessageId === msg.chatMessageId) ? m : [...m, msg]
        );
      }
      this.loadConversations();

      // Show toast for messages from others.
      // If user is already viewing that conversation, skip the toast.
      if (msg.senderId !== myId && !isActiveConv) {
        const preview = msg.attachmentUrl
          ? (msg.attachmentType === 'image' ? '📷 Image' : '📎 ' + (msg.attachmentName ?? 'File'))
          : msg.content;
        this.swal.chatToast(msg.senderName, preview, () => {
          this.triggerOpenConvId.set(msg.conversationId);
        });
      }
    });

    this.hub.on('MessageDeleted', (payload: { messageId: number; conversationId: number }) => {
      this.messages.update(m => m.filter(x => x.chatMessageId !== payload.messageId));
    });

    this.hub.on('UserPresence', (p: { userId: number; isOnline: boolean }) => {
      this.applyPresence(p.userId, p.isOnline);
    });

    // Server tells client to join a new SignalR group when added to a new conversation
    this.hub.on('JoinConversation', (convId: number) => {
      this.hub.invoke('JoinConversation', convId).catch(() => {});
      this.loadConversations();
    });

    this.hub.onreconnected(() => {
      this.connected.set(true);
      this.stopFallbackPoll();
      this.loadConversations();
    });
    this.hub.onclose(() => {
      this.connected.set(false);
      this.startFallbackPoll();
    });

    this.hub.start()
      .then(() => {
        this.connected.set(true);
        this.stopFallbackPoll();
      })
      .catch((err) => {
        console.warn('SignalR connection failed, using REST polling:', err);
        this.connected.set(false);
        this.startFallbackPoll();
      });

    this.startFallbackPoll();
  }

  disconnect() {
    this.stopFallbackPoll();
    this.hub?.stop();
    this.connected.set(false);
  }

  applyPresence(userId: number, isOnline: boolean) {
    this.conversations.update(list => list.map(c => {
      if (c.otherUserId === userId) return { ...c, isOnline };
      if (c.members?.some(m => m.userId === userId)) {
        return {
          ...c,
          members: c.members.map(m => m.userId === userId ? { ...m, isOnline } : m)
        };
      }
      return c;
    }));
    this.allUsers.update(list => list.map(u =>
      u.userId === userId ? { ...u, isOnline } : u
    ));
  }

  private startFallbackPoll() {
    if (this.pollHandle) return;
    this.pollHandle = setInterval(() => this.pollIfNeeded(), 4000);
  }

  private stopFallbackPoll() {
    if (!this.pollHandle) return;
    clearInterval(this.pollHandle);
    this.pollHandle = null;
  }

  private pollIfNeeded() {
    if (this.connected()) return;
    this.loadConversations();
    const id = this.activeConvId();
    if (id == null) return;
    this.http.get<ChatMessage[]>(`${this.base}/conversations/${id}/messages`).subscribe({
      next: m => {
        const current = this.messages();
        const lastNew = m.at(-1)?.chatMessageId;
        const lastOld = current.at(-1)?.chatMessageId;
        if (m.length !== current.length || lastNew !== lastOld) {
          this.messages.set(m);
        }
      },
      error: () => {}
    });
  }

  loadConversations() {
    this.http.get<Conversation[]>(`${this.base}/conversations`).subscribe(c => this.conversations.set(c));
  }

  loadUsers() {
    this.http.get<ChatUser[]>(`${this.base}/users`).subscribe(u => this.allUsers.set(u));
  }

  loadMessages(convId: number) {
    this.activeConvId.set(convId);
    this.http.get<ChatMessage[]>(`${this.base}/conversations/${convId}/messages`).subscribe(m => {
      this.messages.set(m);
      this.conversations.update(list => list.map(c =>
        c.conversationId === convId ? { ...c, unreadCount: 0 } : c
      ));
    });
  }

  sendMessage(convId: number, content: string): Promise<ChatMessage> {
    // Always persist over REST. SignalR on shared IIS hosts is unreliable for
    // invoke(); live delivery still happens via ReceiveMessage or polling.
    return new Promise<ChatMessage>((resolve, reject) => {
      this.sendMessageWithAttachment(convId, content, null).subscribe({
        next: (msg) => {
          this.messages.update(m =>
            m.some(x => x.chatMessageId === msg.chatMessageId) ? m : [...m, msg]
          );
          this.loadConversations();
          resolve(msg);
        },
        error: (e) => reject(e)
      });
    });
  }


  /** Find or create a DM with a user, then return conversationId */
  startDm(targetUserId: number) {
    return this.http.post<{ conversationId: number }>(`${this.base}/dm`, { targetUserId });
  }

  /** Create a custom group */
  createGroup(name: string, memberIds: number[]) {
    return this.http.post<{ conversationId: number }>(`${this.base}/groups`, { name, memberIds });
  }

  /** Get or create the "All Staff" broadcast group */
  getOrCreateStaffGroup() {
    return this.http.post<{ conversationId: number }>(`${this.base}/groups/broadcast`, { type: 'staff' });
  }

  /** Get or create a "Class X - Parents" broadcast group */
  getOrCreateClassParentsGroup(classId: number) {
    return this.http.post<{ conversationId: number }>(`${this.base}/groups/broadcast`, { type: 'class-parents', classId });
  }

  uploadFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<UploadResult>(`${this.base}/upload`, fd);
  }

  sendMessageWithAttachment(convId: number, content: string, attachment: UploadResult | null) {
    return this.http.post<ChatMessage>(`${this.base}/conversations/${convId}/send`, {
      content,
      attachmentUrl:  attachment?.url  ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentType: attachment?.type ?? null,
      attachmentSize: attachment?.size ?? null
    });
  }

  deleteConversation(convId: number) {
    return this.http.delete(`${this.base}/conversations/${convId}`);
  }

  deleteMessage(msgId: number) {
    return this.http.delete(`${this.base}/messages/${msgId}`);
  }
}
