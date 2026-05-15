CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  telegram VARCHAR(100),
  passport VARCHAR(100),
  notes TEXT,
  paid_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);