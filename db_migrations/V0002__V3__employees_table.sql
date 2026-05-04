
CREATE TABLE t_p21303888_quad_rent_crm_system.employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(100),
  phone VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','day-off','fired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
