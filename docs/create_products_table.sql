-- Create products table
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for customers in the app)
CREATE POLICY "Allow public read access to products" ON products
    FOR SELECT TO public USING (true);

-- Allow authenticated users (admins) to manage products
CREATE POLICY "Allow authenticated users to insert products" ON products
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update products" ON products
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete products" ON products
    FOR DELETE TO authenticated USING (true);
