-- Add order_id to route_stops so delivery confirmation can update the linked order status
alter table public.route_stops
  add column if not exists order_id text references public.orders(id) on delete set null;

create index if not exists route_stops_order_id_idx on public.route_stops(order_id);
