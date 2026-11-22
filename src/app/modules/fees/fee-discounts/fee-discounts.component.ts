import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { FeeService } from '../../../core/services/fee.service';
import { DiscountPolicyDto, DISCOUNT_TYPES, VALUE_TYPES } from '../../../core/models/fee.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-fee-discounts',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent,
    Button, Select, InputText, InputNumber, Tag, Dialog, TableModule, Tooltip
  ],
  template: `
    <app-page-header title="Discount Policies" subtitle="Reusable discount rules applied automatically during fee generation" />

    <div class="card table-card">
      <div class="card-head">
        <div class="head-meta">
          <span class="material-icons-round head-icon">local_offer</span>
          <div>
            <h3>Discount Policies</h3>
            <p>{{ policies().length }} polic{{ policies().length !== 1 ? 'ies' : 'y' }} defined</p>
          </div>
        </div>
        <p-button label="Add Policy" icon="pi pi-plus" (onClick)="openModal()" />
      </div>

      <!-- Legend -->
      <div class="legend">
        @for (dt of discountTypes; track dt.value) {
          <span class="dt-chip dt-{{ dt.value.toLowerCase() }}">{{ dt.label }}</span>
        }
      </div>

      <div class="w-full overflow-x-auto">
        <p-table [value]="policies()" dataKey="discountPolicyId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '100%' }">
          <ng-template #header>
            <tr>
              <th>Policy Name</th><th>Type</th><th>Value</th><th>Description</th><th>Sibling</th><th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </ng-template>
          <ng-template #body let-dp>
            <tr>
              <td><strong>{{ dp.name }}</strong></td>
              <td><span class="dt-chip dt-{{ dp.discountType.toLowerCase() }}">{{ typeLabel(dp.discountType) }}</span></td>
              <td><strong>{{ dp.valueType === 'Percentage' ? dp.value + '%' : 'PKR ' + (dp.value | number:'1.0-0') }}</strong></td>
              <td class="desc-cell">{{ dp.description || '—' }}</td>
              <td>{{ dp.maxSiblingOrder ? dp.maxSiblingOrder + ordinalSuffix(dp.maxSiblingOrder) + ' child' : '—' }}</td>
              <td><p-tag [value]="dp.isActive ? 'Active' : 'Inactive'" [severity]="dp.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="editPolicy(dp)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deletePolicy(dp.discountPolicyId)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="7" class="empty-cell">
              <span class="material-icons-round">local_offer</span>
              <p>No discount policies yet. Add one to enable automatic discounts.</p>
            </td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Discount Policy'"
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '36rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="form" (ngSubmit)="save()">
        <p class="sub mb-3">{{ editingId() ? 'Update this discount rule.' : 'Create a reusable discount rule.' }}</p>
        <div class="row-2">
          <div class="field flex-2">
            <label for="dp-name">Policy Name <span class="req">*</span></label>
            <input pInputText id="dp-name" class="w-full" formControlName="name" placeholder="e.g. Sibling Discount – 2nd Child" />
            @if (f('name')?.invalid && f('name')?.touched) { <span class="err">Name is required.</span> }
          </div>
          <div class="field flex-1">
            <label>Type <span class="req">*</span></label>
            <p-select
              class="w-full"
              [options]="discountTypes"
              optionLabel="label"
              optionValue="value"
              placeholder="Select…"
              appendTo="body"
              [overlayOptions]="{ baseZIndex: 10050 }"
              [invalid]="!!(f('discountType')?.invalid && f('discountType')?.touched)"
              formControlName="discountType"
              (onChange)="onTypeChange()" />
            @if (f('discountType')?.invalid && f('discountType')?.touched) { <span class="err">Required.</span> }
          </div>
        </div>

        <div class="row-2">
          <div class="field flex-1">
            <label>Value Type <span class="req">*</span></label>
            <p-select
              class="w-full"
              [options]="valueTypes"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              [overlayOptions]="{ baseZIndex: 10050 }"
              formControlName="valueType" />
          </div>
          <div class="field flex-1">
            <label>Value {{ form.value.valueType === 'Percentage' ? '(%)' : '(PKR)' }} <span class="req">*</span></label>
            <p-inputnumber
              formControlName="value"
              [min]="0"
              [max]="form.value.valueType === 'Percentage' ? 100 : 9999999"
              [useGrouping]="false"
              [maxFractionDigits]="2"
              [placeholder]="form.value.valueType === 'Percentage' ? 'e.g. 25' : 'e.g. 1500'"
              [invalid]="!!(f('value')?.invalid && f('value')?.touched)"
              styleClass="w-full"
              inputStyleClass="w-full" />
            @if (f('value')?.invalid && f('value')?.touched) { <span class="err">Valid value required.</span> }
          </div>
          @if (showSiblingOrder) {
            <div class="field flex-1">
              <label>Applies to (Child #)</label>
              <p-select
                class="w-full"
                [options]="siblingOrderOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Any sibling"
                [showClear]="true"
                appendTo="body"
                [overlayOptions]="{ baseZIndex: 10050 }"
                formControlName="maxSiblingOrder" />
            </div>
          }
        </div>

        <div class="field">
          <label for="dp-desc">Description</label>
          <input pInputText id="dp-desc" class="w-full" formControlName="description" placeholder="Brief description of this discount policy" />
        </div>

        @if (editingId()) {
          <div class="field">
            <label>Status</label>
            <p-select
              class="w-full"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              [overlayOptions]="{ baseZIndex: 10050 }"
              formControlName="isActive" />
          </div>
        }

        @if (form.value.discountType === 'FullWaiver') {
          <div class="info-box">
            <strong>Full Waiver</strong> — set Value to 100% to waive the entire fee for assigned students.
          </div>
        }

        @if (modalError()) { <div class="alert-err"><span class="material-icons-round">error_outline</span> {{ modalError() }}</div> }
      </form>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeModal()" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
  `,
  styles: [`
    .table-card { padding:0; overflow:hidden; margin-top:16px; }
    .card-head {
      display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
      padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2);
    }
    .head-meta { display:flex; align-items:center; gap:12px; }
    .head-icon { font-size:22px; color:#065f46; }
    .card-head h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .card-head p  { font-size:12px; color:var(--t4); margin:2px 0 0; }

    .legend { display:flex; flex-wrap:wrap; gap:6px; padding:12px 20px; border-bottom:1px solid var(--border); }

    .empty-cell { text-align:center; padding:40px 0 !important; }
    .empty-cell .material-icons-round { font-size:36px; color:var(--border); display:block; margin:0 auto 8px; }
    .empty-cell p { color:var(--t4); font-size:13px; margin:0; }
    .desc-cell { font-size:12.5px; color:var(--t3); max-width:180px; }

    .dt-chip { padding:2px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
    .dt-sibling      { background:#dbeafe; color:#1d4ed8; }
    .dt-teacherchild { background:#fce7f3; color:#be185d; }
    .dt-merit        { background:#d1fae5; color:#065f46; }
    .dt-needbased    { background:#fef9c3; color:#854d0e; }
    .dt-fullwaiver   { background:#fee2e2; color:#991b1b; }
    .dt-earlypayment { background:#ede9fe; color:#6d28d9; }
    .dt-custom       { background:#f3f4f6; color:#374151; }

    .sub { font-size:12px; color:var(--t4); }
    .row-2 { display:flex; gap:12px; flex-wrap:wrap; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; min-width:120px; }
    .field.flex-1 { flex:1; }
    .field.flex-2 { flex:2; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    .err { font-size:11.5px; color:var(--red); }

    .info-box { background:var(--accent-g); border:1px solid var(--accent); border-radius:7px; padding:10px 14px; font-size:12.5px; color:var(--t2); margin-bottom:14px; }
    .alert-err { display:flex; align-items:center; gap:8px; background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:12px; }
    .alert-err .material-icons-round { font-size:17px; flex-shrink:0; }
  `]
})
export class FeeDiscountsComponent implements OnInit {
  private feeSvc        = inject(FeeService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb            = inject(FormBuilder);

  policies    = signal<DiscountPolicyDto[]>([]);
  showModal   = signal(false);
  editingId   = signal<number | null>(null);
  saving      = signal(false);
  modalError  = signal('');
  discountTypes = DISCOUNT_TYPES;
  valueTypes    = VALUE_TYPES;
  statusOptions = [{ label: 'Active', value: true }, { label: 'Inactive', value: false }];
  siblingOrderOptions = [
    { label: '2nd child',  value: 2 },
    { label: '3rd child',  value: 3 },
    { label: '4th child',  value: 4 },
    { label: '5th child+', value: 5 }
  ];

  form = this.fb.group({
    name:            ['', Validators.required],
    discountType:    ['', Validators.required],
    description:     [''],
    valueType:       ['Percentage', Validators.required],
    value:           [null as number | null, [Validators.required, Validators.min(0)]],
    maxSiblingOrder: [null as number | null],
    isActive:        [true]
  });

  f(n: string) { return this.form.get(n); }
  get showSiblingOrder() { return this.form.value.discountType === 'Sibling'; }
  typeLabel(type: string) { return DISCOUNT_TYPES.find(d => d.value === type)?.label ?? type; }
  ordinalSuffix(n: number) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'; }

  ngOnInit() { this.load(); }
  load()     { this.feeSvc.getDiscountPolicies().subscribe(d => this.policies.set(d)); }

  openModal() {
    this.editingId.set(null);
    this.form.reset({ valueType: 'Percentage', isActive: true });
    this.modalError.set('');
    this.showModal.set(true);
  }

  editPolicy(dp: DiscountPolicyDto) {
    this.editingId.set(dp.discountPolicyId);
    this.form.patchValue({
      name: dp.name, discountType: dp.discountType, description: dp.description,
      valueType: dp.valueType, value: dp.value, maxSiblingOrder: dp.maxSiblingOrder ?? null, isActive: dp.isActive
    });
    this.modalError.set('');
    this.showModal.set(true);
  }

  onTypeChange() {
    if (this.form.value.discountType === 'FullWaiver') this.form.patchValue({ valueType: 'Percentage', value: 100 });
    if (this.form.value.discountType !== 'Sibling')    this.form.patchValue({ maxSiblingOrder: null });
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true); this.modalError.set('');
    const v  = this.form.value;
    const id = this.editingId();
    const payload = {
      name: v.name!, discountType: v.discountType!, description: v.description ?? '',
      valueType: v.valueType!, value: v.value!, maxSiblingOrder: v.maxSiblingOrder ?? undefined, isActive: v.isActive!
    };
    const obs = id ? this.feeSvc.updateDiscountPolicy(id, payload) : this.feeSvc.createDiscountPolicy(payload);
    obs.subscribe({
      next:  ()      => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (e:any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deletePolicy(id: number) {
    this.confirmDelete.open('Delete Discount Policy?',
      'Students with this discount will no longer receive it on new fee generation.',
      () => this.feeSvc.deleteDiscountPolicy(id), () => this.load());
  }

  closeModal() { this.showModal.set(false); }
}
