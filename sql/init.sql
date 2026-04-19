create table if not exists public.products (
 id uuid default gen_random_uuid() primary key,
 brand text, category text, name text, price bigint,
 torque text, warranty text, compatibility text,
 image text, desc_vi text, desc_en text, youtube text,
 created_at timestamptz default now()
);
-- thêm sản phẩm mẫu để test
insert into public.products (brand,category,name,price,torque,warranty,compatibility,image,desc_vi) values
('VNM','WheelBase','VNM Direct Drive Xtreme 32Nm',35000000,'32','24 tháng','PC','https://images.unsplash.com/photo-1600861195091-690c92f1d2cc','Vô lăng Direct Drive 32Nm mạnh mẽ cho sim racing chuyên nghiệp');
