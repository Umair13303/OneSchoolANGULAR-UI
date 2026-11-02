import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { FileUploadResponse } from '../../../core/models/file-upload.model';
import { PhotoCropDialogComponent } from '../photo-crop-dialog/photo-crop-dialog.component';

/**
 * Avatar picker. On file select opens a crop/adjust dialog (pan + zoom),
 * then uploads the cropped 512×512 JPEG to FileServer and emits FileUploadResponse.
 *
 * `variant="header"` = 96px rounded-square in admission/edit header.
 * Default body variant = 68px circle.
 */
@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [CommonModule, PhotoCropDialogComponent],
  template: `
    <div class="photo-upload" [class.header]="variant === 'header'">
      <label class="avatar" [class.uploading]="uploading()" [style.background]="!displayUrl() ? fallbackColor : null">
        @if (displayUrl(); as url) {
          <img [src]="url" alt="Photo" />
        } @else if (fallbackColor && fallbackText) {
          <span class="fallback-text">{{ fallbackText }}</span>
        } @else {
          <span class="material-icons-round placeholder-icon">person</span>
        }
        @if (uploading()) {
          <div class="spinner-overlay"><span class="material-icons-round spin">progress_activity</span></div>
        }
        <div class="edit-badge"><span class="material-icons-round">photo_camera</span></div>
        <input type="file" accept="image/*" (change)="onFileSelected($event)" [disabled]="uploading() || !!cropSrc()" />
      </label>
      @if (error()) { <p class="photo-error">{{ error() }}</p> }
    </div>

    @if (cropSrc(); as src) {
      <app-photo-crop-dialog
        [imageSrc]="src"
        [fileName]="cropFileName()"
        (confirmCrop)="onCropConfirmed($event)"
        (cancel)="onCropCancel()" />
    }
  `,
  styles: [`
    .photo-upload { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
    .avatar {
      position: relative; width: 68px; height: 68px; border-radius: 50%;
      background: var(--surface-2); border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; cursor: pointer; flex-shrink: 0;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder-icon { font-size: 36px; color: var(--t4); }
    .fallback-text { font-size: 15px; font-weight: 800; color: #fff; }
    .avatar input[type="file"] { display: none; }
    .edit-badge {
      position: absolute; bottom: 0; right: 0; width: 26px; height: 26px;
      border-radius: 50%; background: var(--accent); color: #fff;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--surface);
    }
    .edit-badge .material-icons-round { font-size: 13px; }
    .spinner-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
    }
    .spin { color: #fff; font-size: 22px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .photo-error { font-size: 11px; color: #ef4444; text-align: center; max-width: 140px; }

    /* ── Header variant (edit / admission card) ── */
    .photo-upload.header { flex-direction: row; }
    .photo-upload.header .avatar {
      width: 96px; height: 96px; border-radius: 18px;
      border: 2px solid rgba(255,255,255,0.65);
      box-shadow: 0 6px 18px rgba(0,0,0,0.16);
    }
    .photo-upload.header .placeholder-icon { font-size: 44px; }
    .photo-upload.header .fallback-text { font-size: 28px; }
    .photo-upload.header .edit-badge {
      width: 28px; height: 28px; border-width: 2px; bottom: -3px; right: -3px;
    }
    .photo-upload.header .edit-badge .material-icons-round { font-size: 15px; }
    .photo-upload.header .photo-error { display: none; }
  `]
})
export class PhotoUploadComponent {
  @Input() entityType = 'image';
  @Input() entityId: number | null = null;
  @Input() schoolName: string | null = null;
  @Input() label = 'Photo';
  @Input() photoUrl: string | null = null;
  @Input() variant: 'body' | 'header' = 'body';
  @Input() fallbackColor: string | null = null;
  @Input() fallbackText: string | null = null;
  @Output() uploaded = new EventEmitter<FileUploadResponse>();

  private uploadSvc = inject(FileUploadService);
  uploading = signal(false);
  error = signal('');
  private localPreview = signal<string | null>(null);

  cropSrc = signal<string | null>(null);
  cropFileName = signal('photo.jpg');

  displayUrl = () => this.localPreview() ?? this.photoUrl;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set('');
    this.cropFileName.set(file.name || 'photo.jpg');
    const reader = new FileReader();
    reader.onload = () => this.cropSrc.set(reader.result as string);
    reader.onerror = () => this.error.set('Could not read image. Please try another file.');
    reader.readAsDataURL(file);
  }

  onCropCancel(): void {
    this.cropSrc.set(null);
  }

  onCropConfirmed(file: File): void {
    this.cropSrc.set(null);
    this.error.set('');

    const previewReader = new FileReader();
    previewReader.onload = () => this.localPreview.set(previewReader.result as string);
    previewReader.readAsDataURL(file);

    this.uploading.set(true);
    this.uploadSvc.upload(file, this.entityType, {
      entityId: this.entityId, schoolName: this.schoolName, label: this.label
    }).subscribe({
      next: res => { this.uploading.set(false); this.uploaded.emit(res); },
      error: (e: any) => {
        this.uploading.set(false);
        this.localPreview.set(null);
        this.error.set(e?.error?.error ?? 'Upload failed. Please try again.');
      }
    });
  }
}
