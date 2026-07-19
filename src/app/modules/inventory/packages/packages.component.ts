import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { PackageDto, ItemDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Packages (Book Sets)" subtitle="Bundle multiple items into one sellable package">
      <button class="btn-primary" (click)="openAdd()"><span class="material-icons-round">add</span> Add Package</button>
    </app-page-header>

    <div class="grid">
      @for (p of packages(); track p.packageId) {
        <div class="pkg-card">
          <div class="pkg-hd">
            <div>
              <h3>{{ p.packageName }}</h3>
              <p>{{ p.packageCode }} · {{ p.details.length }} item{{ p.details.length !== 1 ? 's' : '' }}</p>
            </div>
            <span [class]="'badge ' + (p.isActive ? 'badge-green' : 'badge-gray')">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
          </div>
          <ul class="pkg-items">
            @for (d of p.details; track d.packageDetailId) { <li>{{ d.itemName }} <span>× {{ d.quantity }}</span></li> }
          </ul>
          <div class="pkg-ft">
            <strong>Rs. {{ p.packagePrice | number:'1.2-2' }}</strong>
            <div class="actions">
              <button class="icon-btn" (click)="openEdit(p)" title="Edit"><span class="material-icons-round">edit</span></button>
              <button class="icon-btn danger" (click)="deletePkg(p)" title="Delete"><span class="material-icons-round">delete</span></button>
            </div>
          </div>
        </div>
      }
      @if (!packages().length) { <p class="empty">No packages yet. Click <strong>Add Package</strong> to bundle items like a "Class 1 Book Set".</p> }
    </div>

    @if (showModal()) {
      <div class="overlay" (click)="showModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>{{ editingId() ? 'Edit' : 'Add' }} Package</h3><button class="close-btn" (click)="showModal.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="form" (ngSubmit)="save()" class="modal-body">
            <div class="grid2">
              <div class="field"><label>Package Name <span class="req">*</span></label><input formControlName="packageName" /></div>
              <div class="field"><label>Package Code</label><input formControlName="packageCode" placeholder="auto if blank" /></div>
              <div class="field"><label>Package Price <span class="req">*</span></label><input type="number" step="0.01" formControlName="packagePrice" /></div>
              @if (editingId()) { <div class="field"><label>Status</label><select formControlName="isActive"><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option></select></div> }
            </div>
            <div class="field"><label>Description</label><textarea formControlName="description" rows="2"></textarea></div>

            <label>Package Contents <span class="req">*</span></label>
            <div formArrayName="details" class="lines">
              @for (line of details.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="line">
                  <select formControlName="itemId" class="line-item">
                    <option [ngValue]="null">Select item…</option>
                    @for (it of allItems(); track it.itemId) { <option [ngValue]="it.itemId">{{ it.itemName }}</option> }
                  </select>
                  <input type="number" step="0.01" formControlName="quantity" class="line-qty" placeholder="Qty" />
                  <button type="button" class="icon-btn danger" (click)="removeLine(i)"><span class="material-icons-round">close</span></button>
                </div>
              }
            </div>
            <button type="button" class="btn-secondary add-line" (click)="addLine()"><span class="material-icons-round">add</span> Add Item</button>

            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft">
              <button type="button" class="btn-secondary" (click)="showModal.set(false)">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:16px; }
    .pkg-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; }
    .pkg-hd { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
    .pkg-hd h3 { font-size:14.5px; font-weight:700; margin:0; color:var(--t1); }
    .pkg-hd p { font-size:11.5px; color:var(--t4); margin:2px 0 0; }
    .pkg-items { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:4px; font-size:12.5px; color:var(--t3); max-height:120px; overflow-y:auto; }
    .pkg-items li { display:flex; justify-content:space-between; }
    .pkg-items li span { color:var(--t4); }
    .pkg-ft { display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid var(--border); }
    .pkg-ft strong { font-size:14px; color:var(--t1); }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; grid-column:1/-1; }
    .actions { display:flex; gap:2px; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); border-radius:6px; }
    .icon-btn:hover { color:var(--t1); background:var(--surface-2); }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; white-space:nowrap; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray { background:var(--surface-2); color:var(--t4); }
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:560px; margin:auto; }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-hd h3 { font-size:15px; font-weight:700; margin:0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:8px; }
    .modal-body { padding:20px; max-height:75vh; overflow-y:auto; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 14px; }
    .modal-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; display:block; margin-bottom:6px; }
    .req { color:var(--red); }
    input, select, textarea { padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); width:100%; }
    .lines { display:flex; flex-direction:column; gap:8px; margin-bottom:8px; }
    .line { display:flex; gap:8px; align-items:center; }
    .line-item { flex:1; }
    .line-qty { width:90px; }
    .add-line { display:inline-flex; align-items:center; gap:6px; margin-bottom:16px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class PackagesComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  packages = signal<PackageDto[]>([]);
  allItems = signal<ItemDto[]>([]);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal('');

  form = this.fb.group({
    packageName: ['', Validators.required],
    packageCode: [''],
    packagePrice: [0, Validators.required],
    description: [''],
    isActive: [true],
    details: this.fb.array([])
  });

  get details() { return this.form.get('details') as FormArray; }

  ngOnInit() {
    this.svc.getItems(undefined, undefined, true).subscribe(i => this.allItems.set(i));
    this.load();
  }
  load() { this.svc.getPackages().subscribe(p => this.packages.set(p)); }

  newLine(itemId: number | null = null, quantity = 1) {
    return this.fb.group({ itemId: [itemId, Validators.required], quantity: [quantity, Validators.required] });
  }
  addLine() { this.details.push(this.newLine()); }
  removeLine(i: number) { this.details.removeAt(i); }

  openAdd() {
    this.editingId.set(null);
    this.form.reset({ packagePrice: 0, isActive: true });
    this.details.clear();
    this.addLine();
    this.modalError.set(''); this.showModal.set(true);
  }

  openEdit(p: PackageDto) {
    this.editingId.set(p.packageId);
    this.form.reset({ packageName: p.packageName, packageCode: p.packageCode, packagePrice: p.packagePrice, description: p.description ?? '', isActive: p.isActive });
    this.details.clear();
    p.details.forEach(d => this.details.push(this.newLine(d.itemId, d.quantity)));
    this.modalError.set(''); this.showModal.set(true);
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.details.length === 0) { this.modalError.set('Add at least one item to the package.'); return; }
    this.saving.set(true); this.modalError.set('');
    const v = this.form.value;
    const id = this.editingId();
    const detailLines = (v.details as any[]).map(d => ({ itemId: d.itemId, quantity: d.quantity }));

    const obs = id
      ? this.svc.updatePackage(id, { packageName: v.packageName!, packagePrice: v.packagePrice!, description: v.description || null, isActive: v.isActive!, details: detailLines })
      : this.svc.createPackage({ packageCode: v.packageCode || null, packageName: v.packageName!, packagePrice: v.packagePrice!, description: v.description || null, details: detailLines });

    obs.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deletePkg(p: PackageDto) {
    this.confirmDelete.open('Delete Package?', `This will remove <strong>${p.packageName}</strong>.`,
      () => this.svc.deletePackage(p.packageId), () => this.load());
  }
}
