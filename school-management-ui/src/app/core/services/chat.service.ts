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

  connect() {
    if (this.hub && this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    const token = this.auth.getToken();
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl.replace('/api', '')}/hubs/chat?access_token=${token}`)
      .withAutomaticReconnect()
      .build();

    this.hub.on('ReceiveMessage', (msg: ChatMessage) => {
      const myId = this.auth.currentUser()?.userId;
      const isActiveConv = this.activeConvId() === msg.conversationId;

      if (isActiveConv)
        this.messages.update(m => [...m, msg]);
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

    // Server tells client to join a new SignalR group when added to a new conversation
    this.hub.on('JoinConversation', (convId: number) => {
      this.hub.invoke('JoinConversation', convId).catch(() => {});
      this.loadConversations();
    });

    this.hub.onreconnected(() => this.connected.set(true));
    this.hub.onclose(() => this.connected.set(false));

    this.hub.start()
      .then(() => this.connected.set(true))
      .catch(() => this.connected.set(false));
  }

  disconnect() { this.hub?.stop(); this.connected.set(false); }

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

  sendMessage(convId: number, content: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      return this.hub.invoke('SendMessage', convId, content);
    return Promise.reject('Not connected');
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
