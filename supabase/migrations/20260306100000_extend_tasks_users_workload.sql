-- Extend tasks table with assignment/scheduling fields
alter table public.tasks
  add column if not exists assignee_id text null,
  add column if not exists order_id text null,
  add column if not exists scheduled_date date null,
  add column if not exists assigned_at timestamptz null,
  add column if not exists estimated_packages integer null,
  add column if not exists estimated_effort numeric null,
  add column if not exists zone text null;

-- FK from tasks.assignee_id → users.id with ON DELETE SET NULL
-- Guard with DO block since ADD CONSTRAINT IF NOT EXISTS is not universally supported
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'tasks_assignee_id_fkey'
      and table_name = 'tasks'
  ) then
    alter table public.tasks
      add constraint tasks_assignee_id_fkey
        foreign key (assignee_id) references public.users(id) on delete set null;
  end if;
end $$;

-- Note: order_id is kept as plain text (no FK) — order IDs are text and
-- referential integrity is not enforced in the current dev phase.

-- Indexes for common query patterns
create index if not exists tasks_assignee_id_idx     on public.tasks(assignee_id);
create index if not exists tasks_scheduled_date_idx  on public.tasks(scheduled_date);

-- Extend users table with workload/quota fields
alter table public.users
  add column if not exists daily_quota_packages integer null,
  add column if not exists daily_quota_tasks integer null,
  add column if not exists preferred_primary_task_type text null,
  add column if not exists allowed_task_types jsonb null,
  add column if not exists default_zone text null;
