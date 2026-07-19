import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FeeService } from '../../../core/services/fee.service';
import { DiscountPolicyDto, DISCOUNT_TYPES, VALUE_TYPES } from '../../../core/models/fee.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-fee-discounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Discount Policies" subtitle="Reusable discount rules applied automatically during fee generation" />

    <div class="card">
      <div class="card-head">
        <div class="head-meta">
          <span class="material-icons-round head-icon">local_offer</span>
          <div>
            <h3>Discount Policies</h3>
            <p>{{ policies().length }} polic{{ policies().length !== 1 ? 'ies' : 'y' }} defined</p>
          </div>
        </div>
        <button class="btn-primary" (click)="openModal()">
          <span class="material-icons-round">add</span> Add Policy
        </button>
      </div>

      <!-- Legend -->
      <div class="legend">
        @for (dt of discountTypes; track dt.value) {
          <span class="dt-chip dt-{{ dt.value.toLowerCase() }}">{{ dt.label }}</span>
        }
      </div>

      <table class="table">
        <thead>
          <tr><th>Policy Name</th><th>Type</th><th>Value</th><th>Description</th><th>Sibling</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (dp of policies(); track dp.discountPolicyId) {
            <tr>
              <td><strong>{{ dp.name }}</strong></td>
              <td><span class="dt-chip dt-{{ dp.discountType.toLowerCase() }}">{{ typeLabel(dp.discountType) }}</span></td>
              <td><strong>{{ dp.valueType === 'Percentage' ? dp.value + '%' : 'PKR ' + (dp.value | number:'1.0-0') }}</strong></td>
              <td class="desc-cell">{{ dp.description || '—' }}</td>
              <td>{{ dp.maxSiblingOrder ? dp.maxSiblingOrder + ordinalSuffix(dp.maxSiblingOrder) + ' child' : '—' }}</td>
              <td><span [class]="'badge ' + (dp.isActive ? 'badge-green' : 'badge-gray')">{{ dp.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="editPolicy(dp)" title="Edit"><span class="material-icons-round">edit</span></button>
                <button class="icon-btn danger" (click)="deletePolicy(dp.discountPolicyId)" title="Delete"><span class="material-icons-round">delete</span></button>
              </td>
            </tr>
          }
          @if (!policies().length) {
            <tr><td colspan="7" class="empty-cell">
              <span class="material-icons-round">local_offer</span>
              <p>No discount policies yet. Add one to enable automatic discounts.</p>
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="modal-icon"><span class="material-icons-round">local_offer</span></div>
            <div>
              <h3>{{ editingId() ? 'Edit' : 'Add' }} Discount Policy</h3>
              <p>{{ editingId() ? 'Update this discount rule.' : 'Create a reusable discount rule.' }}</p>
            </div>
            <button class="close-btn" (click)="closeModal()"><span class="material-icons-round">close</span></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()" class="modal-body">
            <div class="row-2">
              <div class="field flex-2" [class.invalid]="f('name')?.invalid && f('name')?.touched">
                <label>Policy Name <span class="req">*</span></label>
                <input formControlName="name" placeholder="e.g. Sibling Discount – 2nd Child" />
                @if (f('name')?.invalid && f('name')?.touched) { <span class="err">Name is required.</span> }
              </div>
              <div class="field flex-1" [class.invalid]="f('discountType')?.invalid && f('discountType')?.touched">
                <label>Type <span class="req">*</span></label>
                <select formControlName="discountType" (change)="onTypeChange()">
                  <option value="">Select…</option>
                  @for (dt of discountTypes; track dt.value) {
                    <option [value]="dt.value">{{ dt.label }}</option>
                  }
                </select>
                @if (f('discountType')?.invalid && f('discountType')?.touched) { <span class="err">Required.</span> }
              </div>
            </div>

            <div class="row-2">
              <div class="field flex-1">
                <label>Value Type <span class="req">*</span></label>
                <select formControlName="valueType">
                  @for (vt of valueTypes; track vt.value) { <option [value]="vt.value">{{ vt.label }}</option> }
                </select>
              </div>
              <div class="field flex-1" [class.invalid]="f('value')?.invalid && f('value')?.touched">
                <label>Value {{ form.value.valueType === 'Percentage' ? '(%)' : '(PKR)' }} <span class="req">*</span></label>
                <input type="number" formControlName="value" min="0"
                  [max]="form.value.valueType === 'Percentage' ? 100 : 9999999"
                  [placeholder]="form.value.valueType === 'Percentage' ? 'e.g. 25' : 'e.g. 1500'" />
                @if (f('value')?.invalid && f('value')?.touched) { <span class="err">Valid value required.</span> }
              </div>
              @if (showSiblingOrder) {
                <div class="field flex-1">
                  <label>Applies to (Child #)</label>
                  <select formControlName="maxSiblingOrder">
                    <option [ngValue]="null">Any sibling</option>
                    <option [ngValue]="2">2nd child</option>
                    <option [ngValue]="3">3rd child</option>
                    <option [ngValue]="4">4th child</option>
                    <option [ngValue]="5">5th child+</option>
                  </select>
                </div>
              }
            </div>

            <div class="field">
              <label>Description</label>
              <input formControlName="description" placeholder="Brief description of this discount policy" />
            </div>

            @if (editingId()) {
              <div class="field">
                <label>Status</label>
                <select formControlName="isActive">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
            }

            @if (form.value.discountType === 'FullWaiver') {
              <div class="info-box">
                <strong>Full Waiver</strong> — set Value to 100% to waive the entire fee for assigned students.
              </div>
            }

            @if (modalError()) { <div class="alert-err"><span class="material-icons-round">error_outline</span> {{ modalError() }}</div> }
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; margin-top:16px; }
    .card-head {
      display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
      padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2);
    }
    .head-meta { display:flex; align-items:center; gap:12px; }
    .head-icon { font-size:22px; color:#065f46; }
    .card-head h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .card-head p  { font-size:12px; color:var(--t4); margin:2px 0 0; }
    .btn-primary { display:inline-flex; align-items:center; gap:6px; }
    .btn-primary .material-icons-round { font-size:17px; }

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

    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray  { background:var(--surface-2); color:var(--t4); }

    .actions { display:flex; gap:2px; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); display:flex; align-items:center; border-radius:6px; transition:all .15s; }
    .icon-btn:hover { color:var(--t1); background:var(--surface-2); }
    .icon-btn .material-icons-round { font-size:18px; }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }

    /* Modal */
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
    .modal { background:var(--surface); border-radius:14px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 40px rgba(0,0,0,.2); animation:fp .18s cubic-bezier(.34,1.4,.64,1); }
    @keyframes fp { from { transform:scale(.93); opacity:0 } to { transform:scale(1); opacity:1 } }
    .modal-head { display:flex; align-items:center; gap:12px; padding:18px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); position:sticky; top:0; }
    .modal-icon { width:38px; height:38px; border-radius:9px; background:#d1fae5; color:#065f46; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .modal-icon .material-icons-round { font-size:20px; }
    .modal-head h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .modal-head p  { font-size:12px; color:var(--t4); margin:2px 0 0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:7px; display:flex; align-items:center; transition:all .15s; }
    .close-btn:hover { background:var(--surface-2); color:var(--t1); }
    .close-btn .material-icons-round { font-size:20px; }

    .modal-body { padding:20px; }
    .row-2 { display:flex; gap:12px; flex-wrap:wrap; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; min-width:120px; }
    .field.flex-1 { flex:1; }
    .field.flex-2 { flex:2; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    input, select { padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); transition:border-color .15s, box-shadow .15s; }
    input:focus, select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .field.invalid input, .field.invalid select { border-color:var(--red); }
    .err { font-size:11.5px; color:var(--red); }

    .info-box { background:var(--accent-g); border:1px solid var(--accent); border-radius:7px; padding:10px 14px; font-size:12.5px; color:var(--t2); margin-bottom:14px; }
    .alert-err { display:flex; align-items:center; gap:8px; background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:12px; }
    .alert-err .material-icons-round { font-size:17px; flex-shrink:0; }
    .modal-footer { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }
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
