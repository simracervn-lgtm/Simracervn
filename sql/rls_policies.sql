-- BẬT RLS VÀ TẠO POLICY AN TOÀN
-- Chạy trong Supabase SQL Editor

-- 1. Bật RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 2. Xóa policy cũ nếu có
DROP POLICY IF EXISTS "Public read products" ON products;
DROP POLICY IF EXISTS "Admin manage products" ON products;
DROP POLICY IF EXISTS "Public insert orders" ON orders;
DROP POLICY IF EXISTS "Admin manage orders" ON orders;

-- 3. Products: ai cũng đọc được
CREATE POLICY "Public read products"
ON products FOR SELECT
USING (true);

-- 4. Products: chỉ admin (qua Edge Function service_role) mới sửa
-- Không tạo policy cho anon => mặc định chặn

-- 5. Orders: khách chỉ được INSERT
CREATE POLICY "Public insert orders"
ON orders FOR INSERT
WITH CHECK (true);

-- 6. Orders: chỉ service_role mới đọc/sửa/xóa
-- Không tạo policy cho authenticated/anon => Edge Function dùng service_role bypass RLS

-- 7. Tạo bảng admin_users để phân quyền (tùy chọn)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Thêm email admin của bạn
-- INSERT INTO admin_users (id, email) VALUES ('user-uuid', 'admin@simracervn.com');
