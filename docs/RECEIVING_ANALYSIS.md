# Receiving / Inbound Logic Analysis

## 1) Current inbound capability summary
Supported in schema:
- Inbound shipment hierarchy exists:
  - `inbound_shipments`
  - `inbound_pallets`
  - `inbound_boxes`
  - `inbound_box_items`

Supported in UI:
- Inbound screen lists shipments by status.
- Can inspect pallet/box/item detail.
- Can create a new inbound shipment.
- Can generate operational tasks (Receive + Putaway) from selected inbound shipment.

## 2) Purchase Orders / ASN / inbound shipments

### Purchase orders
- No dedicated `purchase_orders` table found.
- No PO line table found.
- No PO matching workflow in current code.

### ASN
- No explicit ASN table.
- `inbound_shipments.reference_number` acts as a generic inbound reference and may function like ASN reference.

### Inbound shipments
- Fully modeled and persisted as entity hierarchy (shipment -> pallet -> box -> box item).

## 3) Receiving endpoints (effective)
All accessed through provider methods mapped to Supabase tables:
- `getInboundByTenant(tenantId)` -> `inbound_shipments`
- `getPalletsByShipment(shipmentId)` -> `inbound_pallets`
- `getBoxesByPallet(palletId)` -> `inbound_boxes`
- `getBoxItems(boxId)` -> `inbound_box_items`
- `createInbound(payload)` -> insert into `inbound_shipments`

No dedicated endpoint/method found for:
- receiving quantity confirmation
- variance capture
- pallet close/complete transaction
- posting received quantities into inventory

## 4) Receiving UI flow (observed)
- Load inbound shipments, zones, clients, racks.
- Select shipment to inspect pallets and expected location assignments.
- `Confirm Inbound & Create Tasks` action does:
  - create one `Receive` task (shipment level)
  - create one `Putaway` task per pallet
  - set selected shipment status to `receiving` in local React state only

Persistence gap:
- Inbound shipment status transition to `receiving` is not persisted to DB in this handler.

## 5) Inventory update logic during receiving
- No automatic stock mutation from inbound confirmation in current screen logic.
- No quantity receipt posting to `inventory_items` in this receiving action.
- No movement/journal record created for receipt.

## 6) Receiving-related task orchestration
- Tasks table is used as execution mechanism.
- Task fields used for receiving:
  - `type`: `Receive` or `Putaway`
  - `location`
  - `scheduledDate`
  - `estimatedPackages`
  - `zone` (for putaway)

This is operationally useful, but not equivalent to inventory posting.

## 7) Limitations against robust receiving
- No PO/ASN reconciliation (expected vs received quantities).
- No over/short/damage variance capture model.
- No scan-event persistence tied to receiving operations.
- No carton/pallet receiving confirmation states beyond static status fields.
- No receiving-to-inventory transactional commit step.

## 8) Data model strengths
- Inbound decomposition to pallet/box/item is already present.
- Preadvice of putaway destination exists (`assigned_zone_id/rack/location_code`).
- Good foundation for Smart Receiving if transactional layers are added.

## UNKNOWN
- UNKNOWN: whether external integrations write receiving completions directly to DB outside this UI.
