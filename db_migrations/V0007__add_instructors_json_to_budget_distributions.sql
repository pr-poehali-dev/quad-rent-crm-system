ALTER TABLE t_p21303888_quad_rent_crm_system.budget_distributions
  ADD COLUMN IF NOT EXISTS instructors_json TEXT DEFAULT '[]';