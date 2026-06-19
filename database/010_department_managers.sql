-- Tabela de gestores de departamento
CREATE TABLE IF NOT EXISTS department_managers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  department       TEXT        NOT NULL,
  manager_user_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department, manager_user_id)
);

ALTER TABLE department_managers ENABLE ROW LEVEL SECURITY;

-- Admin pode fazer tudo
CREATE POLICY "admin_all_dept_managers" ON department_managers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Gestor vê as próprias linhas
CREATE POLICY "manager_read_own" ON department_managers
  FOR SELECT USING (manager_user_id = auth.uid());
