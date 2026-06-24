-- ============================================================
-- SchemaLens demo_shop seed — realistic e-commerce schema
-- Load with: psql $DATABASE_URL -f lib/db/seed/demo_shop.sql
-- ============================================================

-- Drop and recreate the schema for a clean seed
DROP SCHEMA IF EXISTS demo_shop CASCADE;
CREATE SCHEMA demo_shop;

SET search_path = demo_shop;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  parent_id   INTEGER     REFERENCES categories(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id               SERIAL PRIMARY KEY,
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  name             TEXT    NOT NULL,
  slug             TEXT    NOT NULL UNIQUE,
  description      TEXT,
  price            NUMERIC(12, 2) NOT NULL,
  compare_at_price NUMERIC(12, 2),
  sku              TEXT    NOT NULL UNIQUE,
  weight_kg        NUMERIC(8, 3),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id           SERIAL PRIMARY KEY,
  email        TEXT        NOT NULL UNIQUE,
  first_name   TEXT        NOT NULL,
  last_name    TEXT        NOT NULL,
  phone        TEXT,
  date_of_birth DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER  NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT     NOT NULL DEFAULT 'home',  -- 'home', 'work', 'other'
  line1       TEXT     NOT NULL,
  line2       TEXT,
  city        TEXT     NOT NULL,
  state       TEXT     NOT NULL,
  postal_code TEXT     NOT NULL,
  country     TEXT     NOT NULL DEFAULT 'US',
  is_default  BOOLEAN  NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(id),
  shipping_address_id INTEGER REFERENCES addresses(id),
  status          TEXT    NOT NULL DEFAULT 'pending',
  -- allowed values: pending | confirmed | shipped | delivered | cancelled | refunded
  currency        TEXT    NOT NULL DEFAULT 'USD',
  subtotal        NUMERIC(12, 2) NOT NULL,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12, 2) NOT NULL,
  notes           TEXT,
  placed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER        NOT NULL REFERENCES products(id),
  quantity    INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL
);

CREATE TABLE payments (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER        NOT NULL REFERENCES orders(id),
  provider         TEXT           NOT NULL,  -- 'stripe', 'paypal', 'bank_transfer'
  provider_ref     TEXT,
  amount           NUMERIC(12, 2) NOT NULL,
  currency         TEXT           NOT NULL DEFAULT 'USD',
  status           TEXT           NOT NULL DEFAULT 'pending',
  -- allowed values: pending | succeeded | failed | refunded
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, customer_id)
);

CREATE TABLE inventory_movements (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id),
  kind          TEXT    NOT NULL,  -- 'purchase', 'sale', 'adjustment', 'return'
  quantity_delta INTEGER NOT NULL, -- positive = stock in, negative = stock out
  quantity_after INTEGER NOT NULL,
  reference_id  INTEGER,           -- e.g. order_item_id for sales
  note          TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku      ON products(sku);
CREATE INDEX idx_orders_customer   ON orders(customer_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_placed_at  ON orders(placed_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_payments_order    ON payments(order_id);
CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_reviews_product   ON reviews(product_id);

-- ---------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------

INSERT INTO categories (name, slug, description) VALUES
  ('Electronics', 'electronics', 'Gadgets, devices, and accessories'),
  ('Clothing', 'clothing', 'Apparel for all seasons'),
  ('Home & Kitchen', 'home-kitchen', 'Everything for your home'),
  ('Sports & Outdoors', 'sports-outdoors', 'Gear for active lifestyles'),
  ('Books', 'books', 'Paperback and hardcover titles');

INSERT INTO categories (name, slug, description, parent_id) VALUES
  ('Laptops', 'laptops', 'Portable computers', 1),
  ('Smartphones', 'smartphones', 'Mobile phones', 1),
  ('Headphones', 'headphones', 'Over-ear and in-ear audio', 1),
  ('Men''s Clothing', 'mens-clothing', NULL, 2),
  ('Women''s Clothing', 'womens-clothing', NULL, 2);

INSERT INTO products (category_id, name, slug, price, compare_at_price, sku, weight_kg, description) VALUES
  (6, 'ProBook X15', 'probook-x15', 1299.00, 1499.00, 'LAP-001', 1.8, '15" laptop with 16 GB RAM and 512 GB SSD'),
  (6, 'UltraSlim 13', 'ultraslim-13', 899.00, NULL, 'LAP-002', 1.1, 'Featherlight 13" ultrabook'),
  (7, 'Nova S9', 'nova-s9', 699.00, 749.00, 'PHN-001', 0.18, 'Flagship Android smartphone'),
  (7, 'BudgetPhone Z', 'budgetphone-z', 199.00, NULL, 'PHN-002', 0.17, 'Affordable everyday smartphone'),
  (8, 'SoundWave Pro', 'soundwave-pro', 249.00, 299.00, 'AUD-001', 0.31, 'Noise-cancelling over-ear headphones'),
  (8, 'EarPods Lite', 'earpods-lite', 49.00, NULL, 'AUD-002', 0.05, 'In-ear wired earphones'),
  (9, 'Cargo Joggers', 'cargo-joggers', 59.00, NULL, 'CLM-001', 0.4, 'Relaxed-fit cargo trousers'),
  (9, 'Oxford Button-Down', 'oxford-button-down', 45.00, 55.00, 'CLM-002', 0.25, 'Classic cotton shirt'),
  (10, 'Wrap Midi Dress', 'wrap-midi-dress', 79.00, 99.00, 'CLW-001', 0.35, 'Floral wrap midi dress'),
  (3, 'Chef''s Knife 8"', 'chefs-knife-8', 89.00, NULL, 'KIT-001', 0.22, 'High-carbon stainless steel knife'),
  (3, 'Cast Iron Skillet 12"', 'cast-iron-skillet-12', 49.00, 69.00, 'KIT-002', 2.7, 'Pre-seasoned cast iron'),
  (4, 'Trail Running Shoes', 'trail-running-shoes', 129.00, 159.00, 'SPT-001', 0.55, 'All-terrain trail runners'),
  (5, 'Clean Code', 'clean-code', 35.00, NULL, 'BK-001', 0.5, 'A handbook of agile software craftsmanship'),
  (5, 'Designing Data-Intensive Applications', 'ddia', 55.00, NULL, 'BK-002', 0.72, 'Martin Kleppmann'),
  (5, 'The Pragmatic Programmer', 'pragmatic-programmer', 45.00, NULL, 'BK-003', 0.48, '20th Anniversary Edition');

INSERT INTO customers (email, first_name, last_name, phone, date_of_birth) VALUES
  ('alice@example.com',   'Alice',   'Nguyen',    '+1-555-0101', '1990-03-15'),
  ('bob@example.com',     'Bob',     'Martinez',  '+1-555-0102', '1985-07-22'),
  ('carol@example.com',   'Carol',   'Kim',       '+1-555-0103', '1992-11-08'),
  ('david@example.com',   'David',   'Patel',     '+1-555-0104', '1988-01-30'),
  ('eve@example.com',     'Eve',     'Johnson',   '+1-555-0105', '1995-06-18'),
  ('frank@example.com',   'Frank',   'Lee',       NULL,          '1979-09-04'),
  ('grace@example.com',   'Grace',   'Chen',      '+1-555-0107', '1993-12-25'),
  ('henry@example.com',   'Henry',   'Williams',  '+1-555-0108', '1982-04-10'),
  ('irene@example.com',   'Irene',   'Davis',     '+1-555-0109', '1998-02-14'),
  ('james@example.com',   'James',   'Wilson',    '+1-555-0110', '1986-08-19'),
  ('kate@example.com',    'Kate',    'Brown',     '+1-555-0111', '1991-05-03'),
  ('liam@example.com',    'Liam',    'Taylor',    '+1-555-0112', '1994-10-27'),
  ('mia@example.com',     'Mia',     'Anderson',  '+1-555-0113', '1989-03-08'),
  ('noah@example.com',    'Noah',    'Thomas',    NULL,          '1996-07-16'),
  ('olivia@example.com',  'Olivia',  'Jackson',   '+1-555-0115', '1987-11-21');

INSERT INTO addresses (customer_id, label, line1, city, state, postal_code) VALUES
  (1, 'home', '42 Maple Ave',         'Portland',    'OR', '97201'),
  (1, 'work', '1 Tech Plaza Suite 5', 'Portland',    'OR', '97204'),
  (2, 'home', '7 Oak Street',         'Austin',      'TX', '78701'),
  (3, 'home', '18 Pine Lane',         'Chicago',     'IL', '60614'),
  (4, 'home', '99 Elm Road',          'Seattle',     'WA', '98101'),
  (5, 'home', '200 Cedar Blvd',       'Denver',      'CO', '80203'),
  (6, 'home', '3 Birch Way',          'New York',    'NY', '10001'),
  (7, 'home', '55 Willow Dr',         'San Diego',   'CA', '92101'),
  (8, 'home', '14 Chestnut St',       'Boston',      'MA', '02101'),
  (9, 'home', '8 Walnut Ave',         'Miami',       'FL', '33101'),
  (10, 'home', '300 Spruce St',       'Phoenix',     'AZ', '85001'),
  (11, 'home', '22 Ash Court',        'Atlanta',     'GA', '30301'),
  (12, 'home', '5 Poplar Blvd',       'Dallas',      'TX', '75201'),
  (13, 'home', '77 Fir Ave',          'Nashville',   'TN', '37201'),
  (14, 'home', '11 Hickory Lane',     'Minneapolis', 'MN', '55401');

INSERT INTO orders (customer_id, shipping_address_id, status, subtotal, discount_amount, shipping_amount, tax_amount, total_amount, placed_at) VALUES
  (1, 1, 'delivered',  1299.00,  0.00,  9.99, 112.41, 1421.40, now() - interval '30 days'),
  (2, 3, 'delivered',   249.00,  0.00,  0.00,  21.53,  270.53, now() - interval '25 days'),
  (3, 4, 'shipped',     899.00, 50.00,  9.99,  74.08,  933.07, now() - interval '10 days'),
  (4, 5, 'confirmed',   199.00,  0.00,  9.99,  17.21,  226.20, now() - interval '5 days'),
  (5, 6, 'pending',     129.00,  0.00,  0.00,  11.16,  140.16, now() - interval '1 day'),
  (1, 1, 'delivered',   134.00,  0.00,  5.99,  11.57,  151.56, now() - interval '60 days'),
  (6, 7, 'cancelled',   699.00,  0.00,  9.99,  60.45,  769.44, now() - interval '15 days'),
  (7, 8, 'delivered',    45.00,  0.00,  4.99,   3.89,   53.88, now() - interval '45 days'),
  (8, 9, 'delivered',   168.00,  0.00,  0.00,  14.53,  182.53, now() - interval '20 days'),
  (9,10, 'shipped',      79.00,  0.00,  5.99,   6.83,   91.82, now() - interval '7 days'),
  (10,11,'confirmed',   145.00, 10.00,  9.99,  12.54,  157.53, now() - interval '3 days'),
  (11,12,'delivered',    55.00,  0.00,  0.00,   4.76,   59.76, now() - interval '50 days'),
  (12,13,'pending',     139.00,  0.00,  9.99,  12.02,  161.01, now() - interval '2 days'),
  (13,14,'delivered',    89.00,  0.00,  0.00,   7.70,   96.70, now() - interval '35 days'),
  (14, 1,'refunded',    249.00,  0.00,  0.00,  21.53,  270.53, now() - interval '40 days');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
  (1,  1, 1, 1299.00, 1299.00),
  (2,  5, 1,  249.00,  249.00),
  (3,  2, 1,  899.00,  899.00),
  (4,  4, 1,  199.00,  199.00),
  (5, 12, 1,  129.00,  129.00),
  (6, 13, 1,   35.00,   35.00),
  (6, 14, 1,   55.00,   55.00),
  (6,  6, 1,   44.00,   44.00),
  (7,  3, 1,  699.00,  699.00),
  (8,  8, 1,   45.00,   45.00),
  (9, 11, 1,   49.00,   49.00),
  (9, 10, 1,   89.00,   89.00),
  (9,  6, 1,   30.00,   30.00),
  (10, 9, 1,   79.00,   79.00),
  (11,15, 1,   45.00,   45.00),
  (11, 6, 2,   49.00,   98.00),
  (12,14, 1,   55.00,   55.00),
  (12, 6, 1,   49.00,   49.00),
  (12,13, 1,   35.00,   35.00),
  (13,10, 1,   89.00,   89.00),
  (14, 5, 1,  249.00,  249.00),
  (15, 5, 1,  249.00,  249.00);

INSERT INTO payments (order_id, provider, provider_ref, amount, status, paid_at) VALUES
  (1,  'stripe',       'ch_001', 1421.40, 'succeeded', now() - interval '30 days'),
  (2,  'stripe',       'ch_002',  270.53, 'succeeded', now() - interval '25 days'),
  (3,  'paypal',       'PAY-003', 933.07, 'succeeded', now() - interval '10 days'),
  (4,  'stripe',       'ch_004',  226.20, 'succeeded', now() - interval '5 days'),
  (5,  'stripe',       NULL,      140.16, 'pending',   NULL),
  (6,  'bank_transfer','BT-006',  151.56, 'succeeded', now() - interval '60 days'),
  (7,  'stripe',       'ch_007',  769.44, 'refunded',  now() - interval '15 days'),
  (8,  'stripe',       'ch_008',   53.88, 'succeeded', now() - interval '45 days'),
  (9,  'paypal',       'PAY-009', 182.53, 'succeeded', now() - interval '20 days'),
  (10, 'stripe',       'ch_010',   91.82, 'succeeded', now() - interval '7 days'),
  (11, 'stripe',       NULL,      157.53, 'pending',   NULL),
  (12, 'stripe',       'ch_012',   59.76, 'succeeded', now() - interval '50 days'),
  (13, 'stripe',       NULL,      161.01, 'pending',   NULL),
  (14, 'bank_transfer','BT-014',   96.70, 'succeeded', now() - interval '35 days'),
  (15, 'stripe',       'ch_015',  270.53, 'refunded',  now() - interval '40 days');

INSERT INTO reviews (product_id, customer_id, rating, title, body, is_verified) VALUES
  (1,  1, 5, 'Best laptop I''ve owned', 'Fast, lightweight, great battery life. Worth every penny.', true),
  (5,  2, 4, 'Great sound quality',     'The ANC is excellent. Comfort could be better after long sessions.', true),
  (2,  3, 5, 'Perfect ultrabook',       'Incredibly thin, keyboard is superb. Battery lasts all day.', true),
  (4,  4, 3, 'Decent budget phone',     'Camera is average but the price is unbeatable.', true),
  (12, 5, 5, 'Love these shoes',        'Super grippy, very comfortable for trail running.', true),
  (8,  7, 4, 'Nice shirt',              'Good quality fabric, fits true to size.', false),
  (10, 8, 5, 'Great knife',             'Razor sharp out of the box. Holds its edge well.', true),
  (11, 9, 4, 'Solid cast iron',         'Pre-seasoning is decent, a bit of extra seasoning recommended.', true),
  (9, 10, 5, 'Beautiful dress',         'Flattering cut, material drapes nicely. Runs slightly large.', true),
  (14,12, 5, 'Essential reading',       'Martin Kleppmann explains distributed systems with uncommon clarity.', true),
  (13,11, 5, 'A classic',               'Required reading for every software developer.', false),
  (3,  6, 2, 'Disappointed',            'Ordered, then it was cancelled by the seller. Frustrating experience.', false);

INSERT INTO inventory_movements (product_id, kind, quantity_delta, quantity_after, reference_id, note) VALUES
  (1,  'purchase',  50,  50, NULL,  'Initial stock'),
  (1,  'sale',      -1,  49, 1,     NULL),
  (2,  'purchase',  30,  30, NULL,  'Initial stock'),
  (2,  'sale',      -1,  29, 3,     NULL),
  (3,  'purchase',  20,  20, NULL,  'Initial stock'),
  (4,  'purchase',  80,  80, NULL,  'Initial stock'),
  (4,  'sale',      -1,  79, 4,     NULL),
  (5,  'purchase',  40,  40, NULL,  'Initial stock'),
  (5,  'sale',      -1,  39, 2,     NULL),
  (5,  'sale',      -1,  38, 14,    NULL),
  (5,  'return',     1,  39, 15,    'Customer return - refund issued'),
  (6,  'purchase', 200, 200, NULL,  'Initial stock'),
  (6,  'sale',      -1, 199, 6,     NULL),
  (6,  'sale',      -2, 197, 11,    NULL),
  (6,  'sale',      -1, 196, 9,     NULL),
  (9,  'purchase',  60,  60, NULL,  'Initial stock'),
  (9,  'sale',      -1,  59, 10,    NULL),
  (10, 'purchase',  35,  35, NULL,  'Initial stock'),
  (10, 'sale',      -1,  34, 13,    NULL),
  (12, 'purchase',  45,  45, NULL,  'Initial stock'),
  (12, 'sale',      -1,  44, 5,     NULL),
  (13, 'purchase',  25,  25, NULL,  'Initial stock'),
  (13, 'sale',      -1,  24, 6,     NULL),
  (14, 'purchase',  20,  20, NULL,  'Initial stock'),
  (14, 'sale',      -1,  19, 6,     NULL),
  (14, 'sale',      -1,  18, 12,    NULL);
