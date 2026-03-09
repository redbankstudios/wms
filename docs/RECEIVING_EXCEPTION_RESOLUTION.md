# Receiving Exception Resolution

**Phase:** 5
**Status:** IMPLEMENTED

---

## Exception Lifecycle

```
open
  │
  ├─── approve  → approved   (supervisor accepts the discrepancy)
  ├─── reject   → rejected   (supervisor rejects / operator error)
  └─── resolve  → resolved   (explicit close with resolution action)
         │
         └── resolve_barcode → resolved (unknown_barcode only — saves to product_barcodes)
```

All transitions are terminal. A resolved/approved/rejected exception cannot be re-opened
through the API without a direct DB update.

---

## Resolution Actions

| action field | Meaning |
|-------------|---------|
| `barcode_saved` | Unknown barcode registered into `product_barcodes` |
| `stock_accepted` | Overage/shortage accepted as-is |
| `stock_rejected` | Overage/shortage rejected / to be counted back |
| `dismissed` | Exception closed without further action |
| `reposted` | Unknown barcode resolved AND original scan re-posted to ledger |

---

## API

### List exceptions
```
GET /api/receiving/exceptions?tenantId=&shipmentId=&sessionId=&status=&exceptionType=
Returns: { exceptions[], analytics }
```

### Exception detail (with linked scan)
```
GET /api/receiving/exceptions/:id?tenantId=
Returns: { exception }  — includes .scan if created from a scan
```

### Approve
```
PATCH /api/receiving/exceptions/:id
{ tenantId, action: "approve", notes? }
```

### Reject
```
PATCH /api/receiving/exceptions/:id
{ tenantId, action: "reject", notes? }
```

### Resolve (generic — shortage/overage/mismatch/damaged)
```
PATCH /api/receiving/exceptions/:id
{ tenantId, action: "resolve", resolutionAction?: "stock_accepted"|"stock_rejected"|"dismissed", resolutionNotes? }
```

### Resolve unknown barcode (barcode learning)
```
PATCH /api/receiving/exceptions/:id
{
  tenantId,
  action: "resolve_barcode",
  productId: "PRD-001",
  uomCode: "case",
  qtyPerUnit: 24,
  barcodeType?: "EAN13",   // default CODE128
  isPrimary?: false,
  repostScan?: true,       // re-post original scan to ledger if not yet posted
  resolutionNotes?: "..."
}
Returns: { ok, status, barcodeId, reposted, movementId? }
```

---

## Exception Analytics

Included in list response:

```json
{
  "analytics": {
    "total": 8,
    "open": 3,
    "resolvedToday": 2,
    "byType": { "unknown_barcode": 2, "shortage": 4, "overage": 2 },
    "topUnknownBarcodes": [{ "barcode": "9999999", "count": 3 }]
  }
}
```

---

## New DB Fields (Phase 5 migration `20260309000004`)

Added to `receiving_exceptions`:

| Field | Purpose |
|-------|---------|
| `scan_id` | Links exception back to the scan that created it |
| `resolved_product_id` | Product chosen during barcode resolution |
| `resolved_sku` | SKU resolved |
| `resolution_action` | How the exception was resolved |
| `resolution_notes` | Supervisor free text |
| `approved_by_user_id` | Who approved |
| `rejected_by_user_id` | Who rejected |

Added to `receiving_scans`:

| Field | Purpose |
|-------|---------|
| `exception_id` | Bi-directional link to the exception raised by this scan |
