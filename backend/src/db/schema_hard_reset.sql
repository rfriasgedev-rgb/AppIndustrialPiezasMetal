-- ============================================================
-- RESCATE MAESTRO: HARD RESET DE RRHH
-- Forzado de compatibilidad UUID (CHAR 36)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Eliminar llaves foráneas en tabla users (si existen)
-- Ignoraremos errores si no existen
ALTER TABLE users DROP FOREIGN KEY fk_users_dept;
ALTER TABLE users DROP FOREIGN KEY fk_users_shift;
ALTER TABLE users DROP FOREIGN KEY fk_dept;
ALTER TABLE users DROP FOREIGN KEY fk_shift;

-- 2. Limpieza total de tablas de personal y líneas
DROP TABLE IF EXISTS production_line_employees;
DROP TABLE IF EXISTS production_lines;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS employee_roles;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS departments;

-- 3. RECREACIÓN: DEPARTAMENTOS
CREATE TABLE departments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. RECREACIÓN: HORARIOS/TURNOS
CREATE TABLE shifts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. RECREACIÓN: ROLES DE PERSONAL
CREATE TABLE employee_roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. RECREACIÓN: PLANTILLA EMPLEADOS
CREATE TABLE employees (
  id CHAR(36) NOT NULL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  department_id CHAR(36) NOT NULL,
  shift_id CHAR(36) NOT NULL,
  employee_role_id CHAR(36) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_emp_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_emp_role FOREIGN KEY (employee_role_id) REFERENCES employee_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. RECREACIÓN: LÍNEAS DE PRODUCCIÓN
CREATE TABLE production_lines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  leader_employee_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pline_leader FOREIGN KEY (leader_employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. RECREACIÓN: PIVOTE LÍNEAS-EMPLEADOS
CREATE TABLE production_line_employees (
  line_id CHAR(36) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (line_id, employee_id),
  CONSTRAINT fk_ple_line FOREIGN KEY (line_id) REFERENCES production_lines(id) ON DELETE CASCADE,
  CONSTRAINT fk_ple_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. UNIFICACIÓN DE TABLA USERS
ALTER TABLE users MODIFY department_id CHAR(36) NULL;
ALTER TABLE users MODIFY shift_id CHAR(36) NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;

-- 10. SEMILLAS (Datos iniciales)
INSERT INTO departments (id, name, description) VALUES ('d1607593-0101-11f1-be06-a2aa1dddc615', 'Producción', 'Planta principal');
INSERT INTO shifts (id, name, start_time, end_time) VALUES ('s26ae605-0101-11f1-be06-a2aa1dddc615', 'Mañana', '06:00:00', '14:00:00');
INSERT INTO employee_roles (id, name, description) VALUES ('r36bf707-0101-11f1-be06-a2aa1dddc615', 'Operario', 'Personal de planta');

SET FOREIGN_KEY_CHECKS = 1;
