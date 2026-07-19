import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MenuItemTree } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private url = `${environment.apiUrl}/menu`;
  constructor(private http: HttpClient) {}
  getMenu() { return this.http.get<MenuItemTree[]>(this.url); }
}
