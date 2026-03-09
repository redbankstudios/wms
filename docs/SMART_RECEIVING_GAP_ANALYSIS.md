# Smart Receiving Gap Analysis

## 1) Scope and target capabilities
Target future capabilities:
1. Universal Barcode System
2. Packaging Conversion
3. Unknown Barcode Learning
4. AI-Assisted Receiving

Current baseline:
- Inbound hierarchy exists (`inbound_shipments -> pallets -> boxes -> box_items`).
- Tasks can be generated for Receive/Putaway.
- Product model has single optional barcode and SKU-centric flows.
- No persisted scan execution ledger.

## 2) Capability gap matrix
| Capability | Current state | Gap severity | Blocking issues |
|---|---|---|---|
| Universal Barcode System | Single `products.barcode`; no alias table; no barcode lookup API | Critical | Cannot map many-to-one barcodes reliably |
| Packaging Conversion | No persisted UOM/pack hierarchy in core product schema | Critical | Cannot convert scanned case/inner/unit into inventory units |
| Unknown Barcode Learning | No unresolved barcode queue/workflow | Critical | Unknown scans cannot be captured, triaged, and linked |
| AI-Assisted Receiving | No receiving scan telemetry or variance dataset | High | No training/feedback data loop for AI suggestions |

## 3) Missing tables (recommended)

## Universal barcode + packaging core
- `product_barcodes`
  - `id`, `tenant_id`, `product_id`, `barcode`, `symbology`, `is_primary`, `status`, `source`, `created_at`
  - Unique constraints: `(tenant_id, barcode)`, optional `(tenant_id, product_id, barcode)`
- `product_uoms`
  - `id`, `tenant_id`, `product_id`, `uom_code` (`UNIT`, `INNER`, `CASE`, `PALLET`), `is_base`, dimensions/weight
- `product_uom_conversions`
  - `id`, `tenant_id`, `product_id`, `from_uom`, `to_uom`, `factor`, `rounding_rule`
- `product_barcode_mappings`
  - barcode -> specific UOM mapping (`barcode`, `uom_code`, `qty_per_scan`)

## Receiving execution / traceability
- `receiving_sessions`
  - operator, dock, device, shipment, start/end, status
- `receiving_scans`
  - session, timestamp, scanned barcode/SKU, resolved product/UOM, qty, confidence, outcome
- `receiving_scan_exceptions`
  - unknown barcode, mismatch, overage/shortage, damage, reason, resolution status
- `receiving_line_receipts`
  - expected vs received quantities by shipment/pallet/box/product/UOM

## Inventory mutation ledger
- `inventory_movements`
  - immutable entries: receive, putaway, transfer, pick, return, adjust
  - includes source reference (session/scan/task/order/return)
- `inventory_balances` (optional materialized model)
  - canonical current on-hand by tenant/location/product/UOM

## Learning/AI support
- `barcode_learning_queue`
  - unknown barcode candidates, frequency, proposed matches, human verdict
- `receiving_recommendations`
  - suggested resolution/putaway actions with confidence and accepted/rejected feedback

## 4) Missing services and backend behavior

## Required services
- Barcode resolution service:
  - input barcode + tenant -> product/UOM mapping (supports aliases and pack codes)
- Conversion service:
  - normalize scanned UOM qty into base inventory units
- Receiving transaction service:
  - atomically commit receipt + movement ledger + status changes
- Exception orchestration:
  - create/resolve unknown or mismatch exceptions
- Learning pipeline:
  - mine repeated unknown barcodes and suggest mappings

## Current gaps in repository
- No server-side transaction boundary for receiving commits.
- No persisted scan processing pipeline.
- No service that validates expected ASN/PO quantities against actual.
- No AI recommendation endpoint or feedback capture flow.

## 5) Schema changes required in existing tables
- `products`
  - keep existing `barcode` for backward compatibility, but migrate to `product_barcodes` as source of truth.
- `inbound_box_items`
  - add optional FK to product ID and UOM metadata for stronger matching.
- `tasks`
  - add `source_ref_type/source_ref_id` to tie tasks to receiving sessions/exceptions.
- `inventory_items`
  - either deprecate snapshot-only writes or derive from movement ledger.
- `events`
  - optional: reserve namespaces and correlation IDs if retained for observability.

## 6) UI changes required

## Receiving UI
- Real scan capture screen with:
  - camera/scanner input
  - immediate barcode resolution
  - pack/UOM interpretation
  - expected vs scanned comparison
- Exception resolution UI:
  - unknown barcode linking
  - mismatch/variance approval
  - damage/quarantine workflow
- Session controls:
  - open/close session, operator/device attribution, audit trail view

## Product/catalog UI
- Multi-barcode editor per product.
- UOM and conversion editor (unit/inner/case/pallet).
- Supplier barcode mapping management.

## Warehouse/inventory UI
- Movement ledger timeline and filters.
- Reconciliation dashboard (expected vs received vs posted).
- Human-in-the-loop review queue for AI or unknown barcode suggestions.

## 7) Multi-tenant and security prerequisites (blockers)
- Enable and enforce RLS policies on all tenant-scoped tables.
- Move critical receiving mutation logic behind trusted backend boundary (not browser direct writes).
- Enforce authenticated user/session identity on receiving operations.
- Add role-based authorization for receiving approvals and barcode master-data edits.

## 8) Prioritized implementation phases
1. Foundation:
   - RLS/auth hardening
   - `product_barcodes`, UOM/conversion schema
2. Transactional receiving:
   - receiving sessions/scans/exceptions + inventory movements
3. UX operationalization:
   - scan-driven receiving UI + exception resolution
4. Learning + AI:
   - unknown barcode learning queue + recommendation feedback loop

## 9) Direct blockers for Smart Receiving start
- No universal barcode schema.
- No conversion schema.
- No receiving scan ledger.
- No movement ledger.
- Weak tenant/auth enforcement path for high-integrity receiving operations.

## UNKNOWN
- UNKNOWN: production data volume and scanner hardware constraints (impacting indexing, batch ingest, and latency targets).
- UNKNOWN: whether remote environment already contains private extensions not in checked-in migrations.
