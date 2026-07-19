import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FileUploadResponse } from '../models/file-upload.model';

/**
 * Thin client for the SchoolManagement.FileServer project (separate service,
 * environment.fileServerUrl). Passing schoolName + label together with an
 * entityId gives the file a deterministic, human-readable name on disk
 * ("SchoolName-Label-EntityId") instead of a random one, and a re-upload for
 * the same (entityType, entityId, label) replaces the previous file. Omit
 * entityId when the owning record doesn't exist yet (e.g. a brand-new
 * admission) — the file is still stored, just under a random name, until it
 * gets tagged with the real id afterward.
 */
@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private base = environment.fileServerUrl;
  constructor(private http: HttpClient) {}

  upload(file: File, entityType: string, opts?: { entityId?: number | null; schoolName?: string | null; label?: string | null }) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entityType', entityType);
    if (opts?.entityId != null)   fd.append('entityId', String(opts.entityId));
    if (opts?.schoolName)         fd.append('schoolName', opts.schoolName);
    if (opts?.label)              fd.append('label', opts.label);
    return this.http.post<FileUploadResponse>(`${this.base}/files/upload`, fd);
  }

  deleteFile(fileId: number) {
    return this.http.delete<void>(`${this.base}/files/${fileId}`);
  }
}
