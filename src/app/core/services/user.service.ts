import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChangeMyPasswordDto,
  CreateUserDto,
  UpdateMyProfileDto,
  UserListDto
} from '../models/user.model';
import { SetupNotificationService } from './setup-notification.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = `${environment.apiUrl}/user`;
  private allUsers$?: Observable<UserListDto[]>;
  private injector = inject(Injector);

  constructor(private http: HttpClient) {}

  /** Drop session cache (login/logout / after user mutations). */
  clearCaches() {
    this.allUsers$ = undefined;
    this.injector.get(SetupNotificationService).invalidate();
  }

  getAll() {
    if (!this.allUsers$) {
      this.allUsers$ = this.http.get<UserListDto[]>(this.url).pipe(
        tap({ error: () => { this.allUsers$ = undefined; } }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.allUsers$;
  }
  getMe() { return this.http.get<UserListDto>(`${this.url}/me`); }
  updateMe(dto: UpdateMyProfileDto) { return this.http.put<UserListDto>(`${this.url}/me`, dto); }
  changeMyPassword(dto: ChangeMyPasswordDto) {
    return this.http.put<{ message: string }>(`${this.url}/me/password`, dto);
  }
  updateMyPhoto(photoFileId: number) {
    return this.http.put<UserListDto>(`${this.url}/me/photo`, { photoFileId });
  }
  create(dto: CreateUserDto) {
    return this.http.post<UserListDto>(this.url, dto).pipe(
      tap(() => this.clearCaches())
    );
  }
  update(id: number, dto: any) {
    return this.http.put(`${this.url}/${id}`, dto).pipe(
      tap(() => this.clearCaches())
    );
  }
  uploadSignature(id: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ signatureUrl: string }>(`${this.url}/${id}/signature`, fd);
  }
}
