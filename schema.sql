CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ARTICLE',
  price TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  photo_data BLOB,
  photo_type TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, category, price, condition, description, photo, available)
SELECT 'ASUS X Series', 'PC portable', '650 DT', 'Batterie HS',
       'Ordinateur portable en bon état général.', 'asus-x-series.png', 1
WHERE NOT EXISTS (SELECT 1 FROM products);

INSERT INTO products (name, category, price, condition, description, photo, available)
SELECT 'MacBook Pro 2011', 'PC portable', '450 DT', 'Batterie en bon état',
       'MacBook Pro avec batterie en bon état.', 'macbook-pro-2011.jpg', 1
WHERE (SELECT COUNT(*) FROM products) = 1;
