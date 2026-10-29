import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface FeedbackAttachment {
  id: number;
  feedback: number;
  file: string;
  filename: string;
  file_size: number;
  file_url: string;
  uploaded_at: string;
}

export interface Feedback {
  id: number;
  title: string;
  description: string;
  type: 'BUG' | 'FEATURE';
  status: 'PENDING' | 'IN_ANALYSIS' | 'RESOLVED' | 'REJECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_by?: number | null;
  created_by_name?: string;
  author?: string;
  created_at: string;
  updated_at: string;
  attachments: FeedbackAttachment[];
}

const API_URL = '/api/feedback/';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  constructor(private http: HttpClient) {}

  getFeedbacks(filters?: {
    search?: string;
    type?: string;
    status?: string;
    priority?: string;
  }): Observable<Feedback[]> {
    let params = new HttpParams();
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.priority) {
      params = params.set('priority', filters.priority);
    }

    return this.http.get<Feedback[]>(API_URL, { params });
  }

  getFeedback(id: number): Observable<Feedback> {
    return this.http.get<Feedback>(`${API_URL}${id}/`);
  }

  createFeedback(formData: FormData): Observable<Feedback> {
    return this.http.post<Feedback>(API_URL, formData);
  }

  updateFeedback(id: number, formData: FormData): Observable<Feedback> {
    return this.http.patch<Feedback>(`${API_URL}${id}/`, formData);
  }

  deleteFeedback(id: number): Observable<any> {
    return this.http.delete<any>(`${API_URL}${id}/`);
  }

  deleteAttachment(feedbackId: number, attachmentId: number): Observable<any> {
    return this.http.delete<any>(`${API_URL}${feedbackId}/attachment/${attachmentId}/`);
  }
}

