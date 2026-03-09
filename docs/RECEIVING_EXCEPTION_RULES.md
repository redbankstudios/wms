# Receiving Exception Rules

**Phase:** 4
**Status:** IMPLEMENTED

---

## Exception Types

| Code | Trigger | Auto-raised? |
|------|---------|--------------|
| `unknown_barcode` | Barcode not found in `product_barcodes` | Yes — on scan |
| `sku_mismatch` | Resolved SKU not in shipment manifest (inbound_box_items) | Yes — on scan |
| `overage` | Received qty > expected qty for this SKU | Yes — on scan |
| `shortage` | Expected qty > received qty at session finalize | Yes — on finalize |
| `damaged` | Manual — operator flags a damaged item | No — must call API |
| `missing_item` | Manual — expected item never arrived | No — must call API |

---

## Exception Statuses

| Status | Meaning |
|--------|---------|
| `open` | Needs supervisor review |
| `approved` | Exception accepted (e.g. accept overage, approve shortage credit) |
| `rejected` | Exception dismissed / operator error |
| `resolved` | Exception fully handled (recount, vendor credit issued, etc.) |

---

## Auto-Raised Exceptions

### On scan (`recordReceivingScan`)

1. **unknown_barcode**: barcode not in `product_barcodes` for this tenant.
   - Scan is recorded with `outcome = exception`.
   - Exception row created with `barcode` populated, `sku = null`.

2. **sku_mismatch**: barcode resolves to a SKU but that SKU is not in the manifest.
   - Scan is recorded with `outcome = exception`.
   - Exception row created with `sku` populated, `expected_qty = null`.

3. **overage**: `resolved_base_qty > expected_qty` for the resolved SKU.
   - Scan is recorded with `outcome = exception`.
   - Exception includes both `expected_qty` and `received_qty`.

### On finalize (`finalizeReceivingSession`)

4. **shortage**: for every SKU in the manifest where `received_qty < expected_qty`.
   - Exception includes `expected_qty` and actual `received_qty` (from posted scans).
   - Only raised if the gap is > 0.

---

## Manual Exception Creation

Call `POST /api/receiving/scans` is the main path for auto-exceptions.
For `damaged` and `missing_item`, use the service function directly from a future
exception-management API or resolve them in the supervisor review UI.

```typescript
await createReceivingException(db, tenantId, sessionId, shipmentId, "damaged", {
  sku: "SKU-1001",
  receivedQty: 4,
  notes: "3 units cracked packaging, 1 unit broken screen",
})
```

---

## Resolution Flow

```
Exception raised (open)
    │
    ▼
Supervisor reviews in Exception Queue (Phase 5 UI)
    │
    ├── approve   → status = "approved" → issue vendor credit / accept stock
    ├── reject    → status = "rejected" → operator error, no action
    └── resolve   → status = "resolved" → full handling complete
```

---

## `receiving_exceptions` Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | `EXC-{timestamp}-{rand}` |
| `tenant_id` | text FK | |
| `session_id` | text FK | Receiving session that generated this |
| `inbound_shipment_id` | text FK | |
| `exception_type` | text | See types above |
| `barcode` | text | Raw barcode if applicable |
| `sku` | text | SKU if resolved |
| `expected_qty` | integer | From manifest |
| `received_qty` | integer | Actual received |
| `status` | text | `open` / `approved` / `rejected` / `resolved` |
| `notes` | text | Free text |
| `created_by_user_id` | text | User who raised (null = auto) |
| `resolved_by_user_id` | text | User who resolved |
| `resolved_at` | timestamptz | Resolution timestamp |
