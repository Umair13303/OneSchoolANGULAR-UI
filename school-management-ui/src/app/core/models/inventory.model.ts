// ── Master Data ────────────────────────────────────────────────────────────────
export interface ItemCategoryDto { itemCategoryId: number; categoryName: string; isActive: boolean; itemCount: number; }
export interface SaveItemCategoryDto { categoryName: string; isActive: boolean; }

export interface UnitDto { unitId: number; unitName: string; shortName: string; isActive: boolean; }
export interface SaveUnitDto { unitName: string; shortName: string; isActive: boolean; }

export interface TaxDto { taxId: number; taxName: string; taxPercentage: number; isActive: boolean; }
export interface SaveTaxDto { taxName: string; taxPercentage: number; isActive: boolean; }

// ── Items ────────────────────────────────────────────────────────────────────
export interface ItemDto {
  itemId: number;
  itemCode: string;
  barcode?: string | null;
  itemName: string;
  itemCategoryId: number;
  categoryName: string;
  brand?: string | null;
  unitId: number;
  unitName: string;
  description?: string | null;
  minimumStockLevel: number;
  reorderLevel: number;
  lastPurchasePrice: number;
  averageCost: number;
  salePrice: number;
  wholesalePrice?: number | null;
  minimumSalePrice?: number | null;
  taxPercentage: number;
  isActive: boolean;
  quantityOnHand: number;
}

export interface CreateItemDto {
  itemCode?: string | null;
  barcode?: string | null;
  itemName: string;
  itemCategoryId: number;
  brand?: string | null;
  unitId: number;
  description?: string | null;
  minimumStockLevel: number;
  reorderLevel: number;
  salePrice: number;
  wholesalePrice?: number | null;
  minimumSalePrice?: number | null;
  taxPercentage: number;
  openingQuantity: number;
  openingCost: number;
}

export interface UpdateItemDto {
  itemCode: string;
  barcode?: string | null;
  itemName: string;
  itemCategoryId: number;
  brand?: string | null;
  unitId: number;
  description?: string | null;
  minimumStockLevel: number;
  reorderLevel: number;
  salePrice: number;
  wholesalePrice?: number | null;
  minimumSalePrice?: number | null;
  taxPercentage: number;
  isActive: boolean;
}

// ── Suppliers ────────────────────────────────────────────────────────────────
export interface SupplierDto {
  supplierId: number;
  supplierName: string;
  contactPerson?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  isActive: boolean;
}
export interface SaveSupplierDto {
  supplierName: string;
  contactPerson?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  isActive: boolean;
}

// ── Packages ─────────────────────────────────────────────────────────────────
export interface PackageDetailDto { packageDetailId: number; itemId: number; itemName: string; barcode?: string | null; quantity: number; itemSalePrice: number; }
export interface PackageDto {
  packageId: number;
  packageCode: string;
  packageName: string;
  packagePrice: number;
  description?: string | null;
  isActive: boolean;
  details: PackageDetailDto[];
}
export interface PackageLineDto { itemId: number; quantity: number; }
export interface CreatePackageDto { packageCode?: string | null; packageName: string; packagePrice: number; description?: string | null; details: PackageLineDto[]; }
export interface UpdatePackageDto { packageName: string; packagePrice: number; description?: string | null; isActive: boolean; details: PackageLineDto[]; }

// ── Purchases ────────────────────────────────────────────────────────────────
export interface PurchaseDetailDto {
  purchaseDetailId: number; itemId: number; itemName: string;
  quantity: number; purchasePrice: number; discount: number; tax: number; netAmount: number;
}
export interface PurchaseDto {
  purchaseId: number; purchaseNo: string; purchaseDate: string; supplierId: number; supplierName: string;
  invoiceNumber?: string | null; remarks?: string | null;
  grossAmount: number; discountAmount: number; taxAmount: number; netAmount: number;
  status: string; details: PurchaseDetailDto[];
}
export interface CreatePurchaseDetailDto { itemId: number; quantity: number; purchasePrice: number; discount: number; tax: number; }
export interface CreatePurchaseDto {
  purchaseDate: string; supplierId: number; invoiceNumber?: string | null; remarks?: string | null;
  details: CreatePurchaseDetailDto[];
}

// ── Purchase Returns ─────────────────────────────────────────────────────────
export interface PurchaseReturnDetailDto { itemId: number; itemName: string; quantity: number; price: number; netAmount: number; }
export interface PurchaseReturnDto {
  purchaseReturnId: number; returnNo: string; returnDate: string; purchaseId?: number | null;
  supplierId: number; supplierName: string; remarks?: string | null; netAmount: number; status: string;
  details: PurchaseReturnDetailDto[];
}
export interface CreatePurchaseReturnDetailDto { itemId: number; quantity: number; price: number; }
export interface CreatePurchaseReturnDto {
  returnDate: string; purchaseId?: number | null; supplierId: number; remarks?: string | null;
  details: CreatePurchaseReturnDetailDto[];
}

// ── POS ──────────────────────────────────────────────────────────────────────
export type PosKind = 'Item' | 'Package';
export interface PosLookupDto {
  kind: PosKind; id: number; code: string; barcode?: string | null; name: string;
  price: number; taxPercentage: number; quantityOnHand: number;
}
export interface SalesDetailDto {
  salesDetailId: number; itemId?: number | null; packageId?: number | null; itemName: string;
  quantity: number; price: number; discount: number; tax: number; amount: number;
}
export interface SalesPaymentDto { salesPaymentId: number; paymentMethod: string; amount: number; referenceNo?: string | null; }
export interface SalesDto {
  salesId: number; invoiceNo: string; salesDate: string;
  studentId?: number | null; studentName?: string | null; customerName?: string | null;
  grossAmount: number; discountAmount: number; taxAmount: number; netAmount: number;
  paidAmount: number; changeAmount: number; status: string;
  cashierId: number; cashierName: string; remarks?: string | null; holdReference?: string | null;
  details: SalesDetailDto[]; payments: SalesPaymentDto[];
}
export interface CreateSaleLineDto { kind: PosKind; id: number; quantity: number; price: number; discount: number; tax: number; }
export interface CreatePaymentLineDto { paymentMethod: string; amount: number; referenceNo?: string | null; }
export interface CreateSaleDto {
  studentId?: number | null; customerName?: string | null; remarks?: string | null; holdReference?: string | null;
  hold: boolean; lines: CreateSaleLineDto[]; payments: CreatePaymentLineDto[];
}
export interface CompleteSaleDto { lines?: CreateSaleLineDto[] | null; payments: CreatePaymentLineDto[]; }

// ── Sales Returns ────────────────────────────────────────────────────────────
export interface SalesReturnDetailDto { salesDetailId: number; itemId?: number | null; packageId?: number | null; itemName: string; quantity: number; price: number; amount: number; }
export interface SalesReturnDto {
  salesReturnId: number; returnNo: string; returnDate: string; salesId: number; invoiceNo: string;
  remarks?: string | null; netAmount: number; status: string; details: SalesReturnDetailDto[];
}
export interface CreateSalesReturnLineDto { salesDetailId: number; quantity: number; }
export interface CreateSalesReturnDto { salesId: number; remarks?: string | null; lines: CreateSalesReturnLineDto[]; }

// ── Stock ────────────────────────────────────────────────────────────────────
export interface CurrentStockDto {
  itemId: number; itemCode: string; itemName: string; barcode?: string | null; categoryName: string;
  quantityOnHand: number; minimumStockLevel: number; reorderLevel: number; averageCost: number;
  stockValue: number; lastUpdated: string;
}
export interface StockLedgerDto {
  stockLedgerId: number; transactionDate: string; voucherType: string; voucherNo: string;
  itemId: number; itemName: string; qtyIn: number; qtyOut: number; balance: number; cost: number; userName: string;
}
export interface StockAdjustmentDetailDto { itemId: number; itemName: string; qtyBefore: number; qtyAfter: number; qtyDiff: number; cost: number; }
export interface StockAdjustmentDto {
  stockAdjustmentId: number; adjustmentNo: string; adjustmentDate: string; adjustmentType: string;
  remarks?: string | null; status: string; details: StockAdjustmentDetailDto[];
}
export interface CreateStockAdjustmentLineDto { itemId: number; newQuantity: number; }
export interface CreateStockAdjustmentDto {
  adjustmentDate: string; adjustmentType: 'Adjustment' | 'Damage' | 'Expired' | 'PhysicalVerification';
  remarks?: string | null; lines: CreateStockAdjustmentLineDto[];
}
export interface StockTransferDetailDto { itemId: number; itemName: string; quantity: number; }
export interface StockTransferDto {
  stockTransferId: number; transferNo: string; transferDate: string; fromLocation: string; toLocation: string;
  remarks?: string | null; status: string; details: StockTransferDetailDto[];
}
export interface CreateStockTransferLineDto { itemId: number; quantity: number; }
export interface CreateStockTransferDto {
  transferDate: string; fromLocation: string; toLocation: string; remarks?: string | null;
  lines: CreateStockTransferLineDto[];
}

// ── Reports ──────────────────────────────────────────────────────────────────
export interface PurchaseSummaryRowDto { purchaseId: number; purchaseNo: string; purchaseDate: string; supplierName: string; grossAmount: number; discountAmount: number; taxAmount: number; netAmount: number; }
export interface PurchaseDetailRowDto { purchaseDate: string; purchaseNo: string; supplierName: string; itemName: string; quantity: number; purchasePrice: number; netAmount: number; }
export interface SalesSummaryRowDto { label: string; quantity: number; grossAmount: number; discountAmount: number; taxAmount: number; netAmount: number; invoiceCount: number; }
export interface StockValuationRowDto { itemName: string; categoryName: string; quantityOnHand: number; averageCost: number; stockValue: number; }
export interface ProfitRowDto { label: string; quantitySold: number; saleAmount: number; costAmount: number; profit: number; marginPercent: number; }
export interface PackageSalesRowDto { packageId: number; packageName: string; quantitySold: number; netAmount: number; invoiceCount: number; }

// ── Settings ─────────────────────────────────────────────────────────────────
export interface InventorySettingsDto {
  inventorySettingsId: number; costingMethod: 'LastPurchaseCost' | 'WeightedAverage';
  barcodeEnabled: boolean; packageEnabled: boolean; studentSalesEnabled: boolean; negativeStockAllowed: boolean;
  autoInvoiceNumber: boolean; autoBarcode: boolean; defaultTaxPercentage: number; defaultCurrency: string;
}
export type UpdateInventorySettingsDto = Omit<InventorySettingsDto, 'inventorySettingsId'>;

export const PAYMENT_METHODS = ['Cash', 'Card', 'BankTransfer', 'DigitalWallet'] as const;
export const ADJUSTMENT_TYPES = [
  { value: 'Adjustment', label: 'Manual Adjustment' },
  { value: 'Damage', label: 'Damage Entry' },
  { value: 'Expired', label: 'Expired Stock' },
  { value: 'PhysicalVerification', label: 'Physical Stock Verification' }
] as const;
