import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ChangeMyPasswordDto,
  CreateUserDto,
  UpdateMyProfileDto,
  UserListDto
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = `${environment.apiUrl}/user`;
  constructor(private http: HttpClient) {}

  getAll() { return this.http.get<UserListDto[]>(this.url); }
  getMe() { return this.http.get<UserListDto>(`${this.url}/me`); }
  updateMe(dto: UpdateMyProfileDto) { return this.http.put<UserListDto>(`${this.url}/me`, dto); }
  changeMyPassword(dto: ChangeMyPasswordDto) {
    return this.http.put<{ message: string }>(`${this.url}/me/password`, dto);
  }
  updateMyPhoto(photoFileId: number) {
    return this.http.put<UserListDto>(`${this.url}/me/photo`, { photoFileId });
  }
  create(dto: CreateUserDto) { return this.http.post<UserListDto>(this.url, dto); }
  update(id: number, dto: any) { return this.http.put(`${this.url}/${id}`, dto); }
  uploadSignature(id: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ signatureUrl: string }>(`${this.url}/${id}/signature`, fd);
  }
}
