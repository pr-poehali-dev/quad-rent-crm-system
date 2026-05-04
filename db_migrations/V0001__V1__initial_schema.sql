
-- Квадроциклы
CREATE TABLE quads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  year INTEGER,
  power VARCHAR(50),
  hourly_rate INTEGER NOT NULL DEFAULT 1800,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','rented','maintenance','retired')),
  mileage INTEGER DEFAULT 0,
  last_service_date DATE,
  next_service_mileage INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Клиенты
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  telegram VARCHAR(100),
  passport VARCHAR(100),
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Бронирования
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  quad_id INTEGER REFERENCES quads(id),
  client_id INTEGER REFERENCES clients(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_hours NUMERIC(5,2),
  amount INTEGER NOT NULL,
  deposit INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','issued','returned','cancelled')),
  payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash','card','transfer')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Финансовые операции
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
  category VARCHAR(100) NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  booking_id INTEGER REFERENCES bookings(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Семплы: 9 квадроциклов BogatovTravel
INSERT INTO quads (name, model, year, power, hourly_rate, status, mileage, last_service_date) VALUES
('Кабан-1', 'Yamaha Grizzly 700', 2022, '55 л.с.', 1800, 'available', 1240, '2026-04-15'),
('Кабан-2', 'Yamaha Grizzly 700', 2022, '55 л.с.', 1800, 'available', 980, '2026-04-20'),
('Тигр-1', 'Can-Am Outlander 850', 2023, '78 л.с.', 2200, 'rented', 670, '2026-04-10'),
('Тигр-2', 'Can-Am Outlander 850', 2023, '78 л.с.', 2200, 'available', 540, '2026-04-10'),
('Буйвол-1', 'Polaris Sportsman 570', 2022, '44 л.с.', 1600, 'available', 1580, '2026-03-30'),
('Буйвол-2', 'Polaris Sportsman 570', 2022, '44 л.с.', 1600, 'maintenance', 1620, '2026-02-10'),
('Рысь-1', 'Honda FourTrax 420', 2021, '35 л.с.', 1400, 'available', 2100, '2026-04-05'),
('Рысь-2', 'Honda FourTrax 420', 2021, '35 л.с.', 1400, 'available', 1950, '2026-04-05'),
('Барс-1', 'ATV-Pro 750', 2024, '62 л.с.', 2000, 'available', 320, '2026-05-01');

-- Семплы клиентов
INSERT INTO clients (full_name, phone, is_blacklisted, notes) VALUES
('Алексей Морозов', '+7 900 123-45-67', false, 'Постоянный клиент'),
('Мария Соколова', '+7 911 234-56-78', false, NULL),
('Дмитрий Козлов', '+7 922 345-67-89', false, 'VIP, приводит группы'),
('Анна Петрова', '+7 933 456-78-90', false, NULL),
('Игорь Черных', '+7 944 000-11-22', true, 'Повредил технику, не оплатил');

-- Семплы бронирований (май 2026)
INSERT INTO bookings (quad_id, client_id, start_time, end_time, duration_hours, amount, deposit, status, payment_method) VALUES
(3, 1, '2026-05-04 10:00+03', '2026-05-04 13:00+03', 3, 6600, 5000, 'issued', 'card'),
(1, 2, '2026-05-04 11:00+03', '2026-05-04 13:00+03', 2, 3600, 3000, 'confirmed', 'cash'),
(4, 3, '2026-05-05 09:00+03', '2026-05-05 14:00+03', 5, 11000, 5000, 'confirmed', 'card'),
(7, 4, '2026-05-06 12:00+03', '2026-05-06 14:00+03', 2, 2800, 2000, 'pending', 'cash'),
(9, 1, '2026-05-03 10:00+03', '2026-05-03 14:00+03', 4, 8000, 5000, 'returned', 'card');

-- Семплы транзакций
INSERT INTO transactions (type, category, amount, description, booking_id, transaction_date) VALUES
('income', 'Аренда', 8000, 'Барс-1, Алексей Морозов', 5, '2026-05-03'),
('income', 'Аренда', 6600, 'Тигр-1, Алексей Морозов', 1, '2026-05-04'),
('expense', 'ТО и ремонт', 8500, 'Замена масла, фильтра Буйвол-2', NULL, '2026-05-01'),
('expense', 'Топливо', 6200, 'Заправка 6 единиц', NULL, '2026-05-02'),
('expense', 'Зарплата', 45000, 'Инструктор Кирилл', NULL, '2026-05-01'),
('income', 'Залог', 5000, 'Залог Тигр-1', 1, '2026-05-04'),
('expense', 'Аренда базы', 20000, 'База Горная 12, май', NULL, '2026-05-01');
