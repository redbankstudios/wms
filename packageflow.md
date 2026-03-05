# Package Flow — WMS & Delivery Platform

A reference document for how a package (order) moves through the system end-to-end, including current implementation status and known gaps.

Last updated: 2026-03-05 (GAP-1 + GAP-2 + GAP-3 closed)

---

## Full Lifecycle Overview

```
[INBOUND]     Goods arrive at warehouse → receive → putaway
     ↓
[STOCK]       Inventory available in locations
     ↓
[ORDER IN]    Order created (pending) → inventory allocated
     ↓
[PICK/PACK]   Pick tasks generated → items picked → packed into cartons
     ↓
[DISPATCH]    Packed orders queued → driver assigned → route created → shipped
     ↓
[DELIVERY]    Driver en-route → stop reached → delivery confirmed (delivered)
     ↓
[RETURNS]     Customer returns goods → inspect → disposition
```

---

## Status Enums (types/index.ts)

### Order Status
```
pending → allocated → picking → packed → shipped → delivered
```

### Task Type / Status
- **Types**: `Receive | Putaway | Pick | Pack | Return`
- **Statuses**: `pending | in_progress | completed`

### Inventory Item Status
```
available | reserved | quarantined | pending_receive | picked
```

### Route Stop Status
```
pending | next | completed | issue
```

### Route Status
```
planned | dispatched | on_route | completed | break | available
```

### Inbound Shipment Status
```
scheduled | arrived | receiving | putaway | complete
```

### Inbound Pallet Status
```
expected | arrived | receiving | putaway
```

### Return Status / Disposition
- **Status**: `pending | inspecting | completed`
- **Disposition**: `Restock | Refurbish | Scrap | Return to Vendor`

---

## Stage-by-Stage Breakdown

### Stage 1 — Inbound Receiving
**Order status**: N/A (pre-order goods intake)
**Screen**: `components/screens/inbound.tsx`
**Status**: ✅ Fully implemented

Flow:
1. ASN (inbound shipment) arrives with status `scheduled`
2. Truck arrives → status → `arrived`
3. Pallets scanned/received → `receiving`
4. Items directed to racks → `putaway`
5. Shipment closed → `complete`

Putaway suggestions are generated based on zone rules and rack capacity. Tasks of type `Receive` and `Putaway` are created.

---

### Stage 2 — Warehouse Storage
**Screen**: `components/screens/storage.tsx`, `components/screens/tasks.tsx`
**Status**: ✅ Fully implemented

- Inventory visible by zone/rack/location
- Putaway suggestions shown (preferred rack, fragmentation warnings)
- Task Kanban for warehouse staff: `pending → in_progress → completed`

---

### Stage 3 — Order Creation & Allocation
**Order status**: `pending → allocated`
**Screen**: `components/screens/orders.tsx`
**Status**: ✅ Basic implementation

- Orders created with lines referencing SKUs
- Manual status advance: `pending → allocated`
- Inventory reserved against the order

**Gap**: No auto-allocation logic. No explicit step that creates Pick tasks when order moves to `allocated`.

---

### Stage 4 — Pick & Pack
**Order status**: `allocated → picking → packed`
**Screen**: `components/screens/tasks.tsx` (generic Kanban), `components/screens/orders.tsx`
**Status**: ⚠️ Partial

- Workers drag tasks through Kanban
- Order status manually advanced in orders screen
- No dedicated pick list UI per order
- No barcode scan / line verification
- No pack station workflow
- No carton labeling

---

### Stage 5 — Dispatch
**Order status**: `packed → shipped`
**Screen**: `components/screens/dispatch-queue.tsx`, `components/screens/routes.tsx`
**Status**: ✅ Fully implemented

Flow:
1. Packed orders appear in Dispatch Queue
2. Auto-assign matches driver by delivery zone (haversine) + vehicle capacity
3. `createRouteStop` adds stop to driver's active route
4. Order status advances to `shipped`

Auto-assign logic: `lib/autoAssign.ts`
- Zone match via haversine centroid distance
- Overflow by nearest zone if no exact match
- Checks stops/weight/packages capacity limits

---

### Stage 6 — En-Route Monitoring
**Order status**: `shipped`
**Screens**: `components/screens/dispatcher.tsx`, `components/screens/dispatcher-map.tsx`, `components/screens/mobile-driver.tsx`
**Status**: ⚠️ Partial

**Dispatcher side**:
- Live Map: route polylines, numbered stop markers, pulsing driver markers
- Driver Roster: active drivers with vehicle status
- Exceptions: route issues with severity
- Messages: two-way dispatcher ↔ driver comms

**Driver side** (mobile-driver.tsx):
- Shows assigned route and stops
- Can mark stop as `completed` or `issue`

**Gaps**:
- No real-time GPS position updates from driver device
- Stop completion does not trigger order → `delivered` transition
- No ETA calculation

---

### Stage 7 — Delivery Confirmation ✅ IMPLEMENTED
**Order status**: `shipped → delivered`
**Screen**: `components/screens/mobile-driver.tsx`
**Status**: ✅ Implemented (2026-03-05)

Flow:
1. Driver taps a stop → Stop Detail view opens
2. "Capture POD" → signature pad + photo UI (POD state machine: idle → capturing → success)
3. "Save POD" → POD confirmed
4. "Mark Delivered" button → `handleCompleteStop` runs:
   - `api.routes.updateRouteStop(stopId, { status: "completed" })`
   - `api.orders.updateOrderStatus(orderId, "delivered")` ← if `orderId` is set on the stop

Data model change: `RouteStop.orderId?: string` added to type + `order_id` column in DB.
`orderId` is written to the stop at dispatch time (dispatch-queue.tsx → createRouteStop).

---

### Stage 8 — Customer Tracking ✅ IMPLEMENTED
**Role**: `end_customer`
**Screen**: `components/screens/client-portal.tsx`
**Status**: ✅ Implemented (2026-03-05)

Flow:
1. Customer enters order ID (e.g. `ORD-5001`) in the search field
2. `api.orders.getAllOrders()` looks up the order; `api.orders.getOrderLines()` loads items
3. Status mapped to 5-step visual progress: Ordered → Packed → Shipped → Out for Delivery → Delivered
4. Header color reflects urgency: slate (early), amber (packing), blue (shipped), green (delivered)
5. Driver card shown only when `shipped` or `delivered`
6. Message Driver chat shown only when `shipped` (in transit)
7. Order lines shown with SKU; fallback to package count if lines unavailable
8. "Not found" state shown with retry if order ID doesn't match

Other portal tabs: Delivery Preferences, Request Return (uses real order lines if looked up), Rate Delivery.

---

### Stage 9 — Returns
**Screen**: `components/screens/returns.tsx`
**Status**: ✅ Fully implemented

Flow:
1. Return initiated post-delivery
2. Status: `pending → inspecting → completed`
3. Disposition assigned: Restock / Refurbish / Scrap / Return to Vendor
4. `Return` task created for warehouse staff

---

## Implementation Status Summary

| Stage | Status | Screen |
|-------|--------|--------|
| Inbound Receiving | ✅ Full | `inbound.tsx` |
| Warehouse Storage | ✅ Full | `storage.tsx`, `tasks.tsx` |
| Order Creation / Allocation | ✅ Basic | `orders.tsx` |
| Pick / Pack | ⚠️ Partial | `tasks.tsx` (generic) |
| Dispatch | ✅ Full | `dispatch-queue.tsx`, `routes.tsx` |
| En-Route Monitoring | ⚠️ Partial | `dispatcher.tsx`, `mobile-driver.tsx` |
| Delivery Confirmation | ✅ Implemented | `mobile-driver.tsx` |
| Customer Tracking | ✅ Implemented | `client-portal.tsx` |
| Returns | ✅ Full | `returns.tsx` |

---

## High Priority Gaps

### ~~🔴 GAP-1: Delivery Confirmation (shipped → delivered)~~ ✅ CLOSED 2026-03-05
- `RouteStop.orderId` added to type + DB migration `20260305100000_add_order_id_to_route_stops.sql`
- `dispatch-queue.tsx` writes `orderId` when creating a route stop
- `handleCompleteStop` in `mobile-driver.tsx` now calls `updateOrderStatus(orderId, "delivered")`

### ~~🔴 GAP-2: Customer Tracking Portal~~ ✅ CLOSED 2026-03-05
- Screen already existed as `client-portal.tsx` but ran on hardcoded mock data
- Now does real order lookup via `api.orders.getAllOrders()` + `getOrderLines()`
- 5-step progress bar driven by real `order.status`; dynamic header colour per status
- Driver card + messaging shown only when `shipped`; "not found" state on bad ID
- Return tab uses real order lines when an order has been looked up

### ~~🔴 GAP-3: Proof of Delivery (POD)~~ ✅ CLOSED 2026-03-05
- POD state machine (idle → capturing → success) already existed in `mobile-driver.tsx`
- Signature pad + photo UI shown in "capturing" state
- "Mark Delivered" only appears after POD is saved (state = "success")
- POD capture is a UI mockup (no actual binary storage) — acceptable for current phase

---

## Medium Priority Gaps

### 🟡 GAP-4: Pick/Pack Workflows
- No pick list per order (wave management)
- No barcode scan / line-level verification
- No pack station or carton labeling
- Tasks are generic Kanban, not order-specific

### 🟡 GAP-5: Allocation → Task Auto-Creation
- Moving order to `allocated` does not auto-create Pick tasks
- Worker must manually create tasks or manager must do it

### 🟡 GAP-6: Real-Time Driver GPS
- Dispatcher map shows static route geometry, not live driver position
- No mechanism to update `drivers` table with current lat/lng from device

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `types/index.ts` | All status enums and entity types |
| `data/providers/IDataProvider.ts` | Data layer interface |
| `lib/autoAssign.ts` | Driver auto-assignment algorithm |
| `components/screens/inbound.tsx` | Inbound receiving UI |
| `components/screens/orders.tsx` | Order management + status transitions |
| `components/screens/dispatch-queue.tsx` | Packed orders → dispatch |
| `components/screens/dispatcher.tsx` | Live map, roster, exceptions, messages |
| `components/screens/dispatcher-map.tsx` | Mapbox map (SSR-disabled) |
| `components/screens/mobile-driver.tsx` | Driver app (stop list + mark complete) |
| `components/screens/returns.tsx` | Return processing |
| `components/screens/tasks.tsx` | Generic task Kanban |
| `mock/orders.ts` | Sample orders (all statuses) |
| `mock/routes.ts` | Sample routes + stops |
