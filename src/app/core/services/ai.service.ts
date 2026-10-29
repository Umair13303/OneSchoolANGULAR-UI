import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GenerateQuestionsRequest, GenerateQuestionsResponse } from '../models/ai.model';

@Injectable({ providedIn: 'root' })
export class AiService {
  private base = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  generateQuestions(dto: GenerateQuestionsRequest) {
    return this.http.post<GenerateQuestionsResponse>(`${this.base}/questions/generate`, dto);
  }
}
