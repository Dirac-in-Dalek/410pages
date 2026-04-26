-- Store per-account UI preferences while keeping localStorage as a client fallback.
alter table profiles add column if not exists preferences jsonb;
