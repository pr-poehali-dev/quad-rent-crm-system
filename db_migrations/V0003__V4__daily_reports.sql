CREATE TABLE t_p21303888_quad_rent_crm_system.daily_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  point VARCHAR(200) NOT NULL,
  total_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  remainder NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p21303888_quad_rent_crm_system.report_tours (
  id SERIAL PRIMARY KEY,
  report_id INT NOT NULL REFERENCES t_p21303888_quad_rent_crm_system.daily_reports(id),
  title VARCHAR(200) NOT NULL,
  quads_info VARCHAR(200),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE t_p21303888_quad_rent_crm_system.report_expenses (
  id SERIAL PRIMARY KEY,
  report_id INT NOT NULL REFERENCES t_p21303888_quad_rent_crm_system.daily_reports(id),
  title VARCHAR(200) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);
