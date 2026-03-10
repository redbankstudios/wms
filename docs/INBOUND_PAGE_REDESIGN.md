# Inbound Page Redesign

## What changed (v1 — initial redesign)

The inbound management screen (`components/screens/inbound.tsx`) was redesigned from a
**card list + static right panel** layout to a **full-width table + right slide-over panel**.

### Before
- Fixed 320 px left sidebar with one button-card per shipment
- Detail panel permanently rendered to the right of the list
- Detail was visible only when a shipment was selected; otherwise a placeholder filled the space

### After
- Full-width table showing all shipments at a glance
- Clicking any row opens a right-side slide-over panel (`w-[min(960px,78vw)]`)
- Slide-over has a dimmed backdrop; clicking the backdrop (or the × button) closes the panel
- The table remains visible beneath the overlay

---

## What changed (v2 — derived counts, filters, richer header)

### Derived shipment counts

Added `ShipmentCounts` interface and `computeShipmentCounts()` async helper (defined above
`InboundManagement`, reusable).

**What SKU count means:**
- `skus` = count of **distinct SKU strings** across all `InboundBoxItem` rows in the shipment.
  It counts unique products, not line items. If the same SKU appears in multiple boxes, it is
  counted once.

**What units means:**
- `units` = sum of `InboundBoxItem.quantity` across all items in all boxes in all pallets.
  Represents total individual sellable units expected to arrive.

**Loading strategy:**
- After the main page load completes, a background async loop runs `computeShipmentCounts()`
  for each shipment sequentially.
- Each result updates `derivedCounts` state as it arrives — table cells fill in progressively.
- If a shipment's counts are not yet loaded, the table cell shows `—`.
- This avoids blocking the initial render and avoids a massive parallel burst of API calls.
- No new DB columns are added; counts are computed by traversing the existing hierarchy:
  `inbound_shipments → inbound_pallets → inbound_boxes → inbound_box_items`

---

## Table columns (current)

| Column    | Source                                        | Real vs derived                        |
|-----------|-----------------------------------------------|----------------------------------------|
| Reference | `referenceNumber`                             | Real                                   |
| Client    | `clients` lookup on `clientId`                | Real (resolved)                        |
| Status    | `status`                                      | Real + styled pill                     |
| Pallets   | `totalPallets`                                | Real (stored on shipment)              |
| Boxes     | count of `InboundBox` records                 | Derived (background-loaded)            |
| SKUs      | distinct SKU strings across all box items     | Derived (background-loaded)            |
| Arrival   | `arrivalDate` + window start/end              | Real                                   |
| Carrier   | `carrier` (free text)                         | Real                                   |
| Door      | `dockDoor`                                    | Real                                   |
| Priority  | computed from arrival window                  | Derived (< 4h = Urgent, < 24h = High) |

---

## Filters added

Three in-memory filters sit above the table in a compact filter bar:

| Filter | Behavior |
|--------|----------|
| **Search** | Freetext match on `referenceNumber` OR resolved client name (case-insensitive substring) |
| **Status** | Dropdown: All / Scheduled / Arrived / In Progress / Putaway / Complete |
| **Client** | Dropdown: All + each client from the `clients` list |

- Filters are applied locally over already-loaded `shipments` array (no server round-trip).
- A **Clear** button appears when any filter is active.
- A result count shows `N of M shipments` when filters narrow the list.
- Empty-state message differs: "No shipments match filters" vs "No inbound shipments".

---

## Slide-over summary header

The panel header now has three zones:

1. **Title row** — status badge + reference number (font-mono) + priority badge (Urgent/High only)
2. **Client name** — large, truncated
3. **Meta row** — arrival window · door · carrier (inline, icon-prefixed)
4. **Metric grid** — 4 compact tiles: Pallets / Boxes / SKUs / Units
   - Tiles show `—` while background loading is in progress
   - Notes field rendered inline below the grid if present

---

## New interaction model

1. Page loads → summary metric cards + inbound queue table
2. Background: derived counts start loading (boxes/SKUs/units fill in per row)
3. User can filter by status, client, or search text; table updates instantly
4. User clicks a row → slide-over opens from the right, pallets begin loading for tabs
5. Metric grid in slide-over header shows counts (already loaded if background finished)
6. User navigates tabs inside the slide-over (Overview / Pallets / Locations / Receiving)
7. User closes the slide-over by clicking × or the backdrop
8. "New Inbound" button opens the `NewInboundForm` slide-over (independent)

---

## What stayed unchanged

- `PalletAccordion`, `LocationsTab`, `ReceivingTab`, `ExceptionsPanel`, `ScanList` — untouched
- Full receiving workflow: scan modes, exception handling, barcode learning, ledger posting, finalize
- `NewInboundForm` slide-over — untouched
- `handleConfirm()` / task creation logic — untouched
- Summary metric cards (Scheduled / Arrived / In Progress / Putaway / Completed) — untouched
- All API calls and data provider patterns — untouched
- Dark mode, Tailwind class conventions, TypeScript types

---

## What is still deferred

| Item | Reason |
|------|--------|
| **Box count as stored field** | Still computed by traversal; no `totalBoxes` column on `inbound_shipments` |
| **Carrier method type** (LTL/FTL/Parcel) | `carrier` is free text; no enum in schema |
| **Column sorting** | Skipped to avoid scope creep |
| **Server-side filtering / pagination** | Not needed at current data scale |
| **Total estimated weight** | Not modelled on box items in the current schema |
| **Slide-in animation** | Panel appears instantly; transition can be layered later |
| **Parallel background count loading** | Currently sequential; safe to parallelize for larger datasets |

---

## Manual test steps

```sh
npm run dev
```

1. Go to **Inbound** — verify table renders with 10 columns
2. Wait ~2–3 seconds — Boxes / SKUs / Units columns fill in progressively per row
3. Type in the search box — table filters in real time by reference or client name
4. Change the status dropdown — only matching rows appear
5. Change the client dropdown — only matching rows appear
6. Activate multiple filters; verify result count shows `N of M shipments`
7. Click **Clear** — all rows return
8. Click any row — slide-over opens; metric grid shows Pallets/Boxes/SKUs/Units
9. Verify each tab (Overview, Pallets, Locations, Receiving) works as before
10. Locations tab → Confirm Inbound → tasks created, shipment status updates to "receiving"
11. Receiving tab → Start Receiving → scan barcodes/SKUs → exceptions handled
12. Click backdrop or × → panel closes cleanly
13. Click **New Inbound** → form opens; after save, new row appears + panel auto-opens for it
14. Toggle dark mode → filter bar, table, slide-over all render correctly
