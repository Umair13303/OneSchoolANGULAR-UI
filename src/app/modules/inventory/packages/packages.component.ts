import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { Tooltip } from 'primeng/tooltip';
import { InventoryService } from '../../../core/services/inventory.service';
import { PackageDto, ItemDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent,
    Button, Select, InputText, InputNumber, Textarea, Tag, Dialog, Tooltip
  ],
  template: `
    <app-page-header title="Packages (Book Sets)" subtitle="Bundle multiple items into one sellable package">
      <p-button label="Add Package" icon="pi pi-plus" (onClick)="openAdd()" />
    </app-page-header>

    <div class="grid">
      @for (p of packages(); track p.packageId) {
        <div class="pkg-card">
          <div class="pkg-hd">
            <div>
              <h3>{{ p.packageName }}</h3>
              <p>{{ p.packageCode }} · {{ p.details.length }} item{{ p.details.length !== 1 ? 's' : '' }}</p>
            </div>
            <p-tag [value]="p.isActive ? 'Active' : 'Inactive'" [severity]="p.isActive ? 'success' : 'secondary'" [rounded]="true" />
          </div>
          <ul class="pkg-items">
            @for (d of p.details; track d.packageDetailId) { <li>{{ d.itemName }} <span>× {{ d.quantity }}</span></li> }
          </ul>
          <div class="pkg-ft">
            <strong>Rs. {{ p.packagePrice | number:'1.2-2' }}</strong>
            <div class="flex items-center gap-1">
              <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openEdit(p)" />
              <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deletePkg(p)" />
            </div>
          </div>
        </div>
      }
      @if (!packages().length) { <p class="empty">No packages yet. Click <strong>Add Package</strong> to bundle items like a "Class 1 Book Set".</p> }
    </div>

    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Package'"
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '38rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
          <div class="field"><label for="pk-name">Package Name <span class="req">*</span></label><input pInputText id="pk-name" class="w-full" formControlName="packageName" /></div>
          <div class="field"><label for="pk-code">Package Code</label><input pInputText id="pk-code" class="w-full" formControlName="packageCode" placeholder="auto if blank" /></div>
          <div class="field"><label for="pk-price">Package Price <span class="req">*</span></label>
            <p-inputnumber inputId="pk-price" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="packagePrice" />
          </div>
          @if (editingId()) {
            <div class="field"><label>Status</label>
              <p-select class="w-full" [options]="statusOptions" optionLabel="label" optionValue="value"
                        appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" formControlName="isActive" />
            </div>
          }
        </div>
        <div class="field"><label for="pk-desc">Description</label><textarea pTextarea id="pk-desc" class="w-full" formControlName="description" rows="2"></textarea></div>

        <label class="block-label">Package Contents <span class="req">*</span></label>
        <div formArrayName="details" class="lines">
          @for (line of details.controls; track $index; let i = $index) {
            <div [formGroupName]="i" class="flex items-center gap-2">
              <p-select class="min-w-0 flex-1" [options]="allItems()" optionLabel="itemName" optionValue="itemId"
                        placeholder="Select item…" [filter]="true" filterBy="itemName"
                        appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" formControlName="itemId" />
              <p-inputnumber styleClass="w-24" inputStyleClass="w-24" placeholder="Qty" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="quantity" />
              <p-button type="button" icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Remove item" pTooltip="Remove" (onClick)="removeLine(i)" />
            </div>
          }
        </div>
        <p-button type="button" class="add-line" label="Add Item" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addLine()" />

        @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
      </form>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showModal.set(false)" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

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
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    .field > label, .block-label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .block-label { display:block; margin-bottom:6px; }
    .req { color:var(--red); }
    .lines { display:flex; flex-direction:column; gap:8px; margin-bottom:8px; }
    .add-line { display:inline-block; margin-bottom:16px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class PackagesComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  statusOptions = [{ label: 'Active', value: true }, { label: 'Inactive', value: false }];
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
