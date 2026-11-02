import {
  Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit,
  Output, ViewChild, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Square face-crop dialog: pan + zoom, then export a 512×512 JPEG.
 * Parent opens this after the user picks a file; Confirm emits the cropped File.
 */
@Component({
  selector: 'app-photo-crop-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="crop-backdrop" (click)="cancel.emit()" role="presentation">
      <div class="crop-sheet" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Adjust photo">
        <div class="crop-head">
          <div>
            <h3>Adjust photo</h3>
            <p>Drag to move · pinch/slider to zoom · face should fill the frame</p>
          </div>
          <button type="button" class="icon-x" (click)="cancel.emit()" title="Close">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div
          class="crop-stage"
          #stage
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointercancel)="onPointerUp($event)"
          (wheel)="onWheel($event)">
          <div class="crop-frame">
            @if (ready()) {
              <img
                #imgEl
                class="crop-img"
                [src]="imageSrc"
                alt="Crop preview"
                draggable="false"
                [style.width.px]="drawW()"
                [style.height.px]="drawH()"
                [style.left.px]="imgLeft()"
                [style.top.px]="imgTop()" />
            }
            <div class="crop-mask" aria-hidden="true"></div>
          </div>
        </div>

        <div class="crop-zoom">
          <span class="material-icons-round">zoom_out</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            [value]="zoom()"
            (input)="onZoomInput($event)" />
          <span class="material-icons-round">zoom_in</span>
        </div>

        <div class="crop-actions">
          <button type="button" class="btn-ghost" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="btn-primary" (click)="confirm()" [disabled]="!ready()">
            <span class="material-icons-round">check</span>
            Use photo
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .crop-backdrop {
      position: fixed; inset: 0; z-index: 10050;
      background: rgba(15, 23, 42, 0.55);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; backdrop-filter: blur(2px);
    }
    .crop-sheet {
      width: min(420px, 100%);
      background: var(--surface, #fff);
      border-radius: 18px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.28);
      overflow: hidden;
      display: flex; flex-direction: column;
    }
    .crop-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; padding: 16px 18px 10px;
    }
    .crop-head h3 {
      margin: 0; font-size: 16px; font-weight: 700; color: var(--t1, #0f172a);
    }
    .crop-head p {
      margin: 4px 0 0; font-size: 12px; color: var(--t4, #94a3b8); line-height: 1.35;
    }
    .icon-x {
      width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border, #e2e8f0);
      background: var(--surface-2, #f8fafc); color: var(--t2, #475569);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .icon-x .material-icons-round { font-size: 18px; }

    .crop-stage {
      padding: 8px 18px 4px;
      touch-action: none;
      user-select: none;
    }
    .crop-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 16px;
      overflow: hidden;
      background: #0f172a;
      cursor: grab;
      touch-action: none;
    }
    .crop-frame:active { cursor: grabbing; }
    .crop-img {
      position: absolute;
      max-width: none;
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    .crop-mask {
      position: absolute; inset: 0; pointer-events: none;
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.85);
      border-radius: 16px;
    }

    .crop-zoom {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 18px 4px;
    }
    .crop-zoom .material-icons-round { font-size: 20px; color: var(--t3, #64748b); }
    .crop-zoom input[type="range"] {
      flex: 1; accent-color: var(--accent, #2563eb); height: 28px;
    }

    .crop-actions {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 12px 18px 16px;
    }
    .btn-ghost {
      height: 40px; padding: 0 14px; border-radius: 10px;
      border: 1px solid var(--border, #e2e8f0); background: transparent;
      color: var(--t2, #475569); font-weight: 600; font-size: 13px; cursor: pointer;
    }
    .btn-primary {
      height: 40px; padding: 0 16px; border-radius: 10px; border: none;
      background: var(--accent, #2563eb); color: #fff;
      font-weight: 700; font-size: 13px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary .material-icons-round { font-size: 18px; }
  `]
})
export class PhotoCropDialogComponent implements OnInit, OnDestroy {
  @Input({ required: true }) imageSrc!: string;
  @Input() fileName = 'photo.jpg';
  @Output() confirmCrop = new EventEmitter<File>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLElement>;
  @ViewChild('imgEl') imgRef?: ElementRef<HTMLImageElement>;

  readonly frameSize = signal(300);
  readonly naturalW = signal(0);
  readonly naturalH = signal(0);
  readonly zoom = signal(1.15);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly ready = signal(false);

  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private imgEl: HTMLImageElement | null = null;
  private resizeObs?: ResizeObserver;

  /** Cover scale at zoom=1 so the image always fills the square. */
  private baseScale(): number {
    const fw = this.frameSize();
    const nw = this.naturalW();
    const nh = this.naturalH();
    if (!nw || !nh || !fw) return 1;
    return Math.max(fw / nw, fw / nh);
  }

  drawW = () => this.naturalW() * this.baseScale() * this.zoom();
  drawH = () => this.naturalH() * this.baseScale() * this.zoom();

  imgLeft = () => (this.frameSize() - this.drawW()) / 2 + this.offsetX();
  imgTop  = () => (this.frameSize() - this.drawH()) / 2 + this.offsetY();

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    this.imgEl = new Image();
    this.imgEl.onload = () => {
      this.naturalW.set(this.imgEl!.naturalWidth);
      this.naturalH.set(this.imgEl!.naturalHeight);
      this.ready.set(true);
      queueMicrotask(() => this.measureFrame());
    };
    this.imgEl.src = this.imageSrc;

    this.resizeObs = new ResizeObserver(() => this.measureFrame());
    queueMicrotask(() => {
      const el = this.stageRef?.nativeElement?.querySelector('.crop-frame') as HTMLElement | null;
      if (el) this.resizeObs!.observe(el);
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.resizeObs?.disconnect();
  }

  private measureFrame(): void {
    const el = this.stageRef?.nativeElement?.querySelector('.crop-frame') as HTMLElement | null;
    if (!el) return;
    const size = Math.round(el.clientWidth);
    if (size > 0) {
      this.frameSize.set(size);
      this.clampOffset();
    }
  }

  onZoomInput(ev: Event): void {
    const v = Number((ev.target as HTMLInputElement).value);
    this.zoom.set(v);
    this.clampOffset();
  }

  onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    const delta = ev.deltaY > 0 ? -0.06 : 0.06;
    this.zoom.set(Math.min(3, Math.max(1, this.zoom() + delta)));
    this.clampOffset();
  }

  onPointerDown(ev: PointerEvent): void {
    if (!this.ready()) return;
    this.dragging = true;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.dragging) return;
    const dx = ev.clientX - this.lastX;
    const dy = ev.clientY - this.lastY;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
    this.offsetX.set(this.offsetX() + dx);
    this.offsetY.set(this.offsetY() + dy);
    this.clampOffset();
  }

  onPointerUp(ev: PointerEvent): void {
    this.dragging = false;
    try { (ev.currentTarget as HTMLElement).releasePointerCapture?.(ev.pointerId); } catch { /* ignore */ }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.cancel.emit(); }

  private clampOffset(): void {
    const fw = this.frameSize();
    const dw = this.drawW();
    const dh = this.drawH();
    const maxX = Math.max(0, (dw - fw) / 2);
    const maxY = Math.max(0, (dh - fw) / 2);
    this.offsetX.set(Math.min(maxX, Math.max(-maxX, this.offsetX())));
    this.offsetY.set(Math.min(maxY, Math.max(-maxY, this.offsetY())));
  }

  confirm(): void {
    if (!this.imgEl || !this.ready()) return;

    const out = 512;
    const fw = this.frameSize();
    const scale = this.baseScale() * this.zoom();
    const left = this.imgLeft();
    const top = this.imgTop();

    // Viewport (0,0)-(fw,fw) → source rect in natural image pixels
    const sx = (0 - left) / scale;
    const sy = (0 - top) / scale;
    const sw = fw / scale;
    const sh = fw / scale;

    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(this.imgEl, sx, sy, sw, sh, 0, 0, out, out);

    canvas.toBlob(blob => {
      if (!blob) return;
      const base = this.fileName.replace(/\.[^.]+$/, '') || 'photo';
      const file = new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
      this.confirmCrop.emit(file);
    }, 'image/jpeg', 0.92);
  }
}
