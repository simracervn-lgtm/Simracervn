-- CHẠY TRƯỚC KHI DÙNG
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand text, category text, name text, price bigint,
  torque text, warranty text, compatibility text,
  image text, desc_vi text, desc_en text, youtube text,
  created_at timestamptz default now()
);
