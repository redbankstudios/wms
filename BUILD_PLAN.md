# Build Plan

## Goal
Deliver a multi-tenant WMS + Delivery platform with clear role-based experiences across warehouse ops, dispatch, mobile, and client portals.

## Milestones
1. Foundation
- Solidify navigation/role model and platform intro documentation
- Define tenant, user, and role schemas (Supabase + types)
- Standardize data provider interfaces and error handling

2. Warehouse Ops Core
- Inbound: receiving, ASN, putaway suggestions
- Inventory: stock levels, cycle counts, adjustments
- Storage: zones, racks, capacity planning
- Orders: allocation, pick/pack workflows
- Tasks: assignment, SLA, priority

3. Dispatch & Delivery
- Fleet: vehicles, capacity, availability
- Dispatcher: live map, route construction
- Routes: optimization, stop sequencing
- Dispatch Queue: outbound readiness and handoff
- Driver app: route execution, proof of delivery

4. Client Experience
- B2B client portal: orders, inventory, outbound requests
- End-customer tracking: status, ETA, driver chat
- Billing: invoices, payment status, usage summaries

5. Analytics & Reliability
- Operational dashboards and reports
- Alerts and notifications
- Audit trails and event streams
- Performance, caching, and background jobs

## Immediate Next Steps
- Add Platform Intro page and keep it current
- Validate Supabase schemas vs. UI needs
- Define real RBAC and tenant scoping rules
- Identify endpoints that require realtime updates
