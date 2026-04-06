-- ============================================================
-- UNIFICACIÓN TOTAL: ESTÁNDAR UUID (CHAR 36)
-- Resolución definitiva de incompatibilidad de columnas
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Limpiar rastro de tablas conflictivas
DROP TABLE IF EXISTS production_line_employees;
DROP TABLE IF EXISTS production_lines;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS employee_roles;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS departments;

-- 2. DEPARTAMENTOS (UUID)
CREATE TABLE departments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. HORARIOS/TURNOS (UUID)
CREATE TABLE shifts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. ROLES DE PERSONAL (UUID)
CREATE TABLE employee_roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. PLANTILLA EMPLEADOS (UUID + CONTACTOS)
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
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_emp_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_emp_role FOREIGN KEY (employee_role_id) REFERENCES employee_roles(id)
) ENGINE=InnoDB;

-- 6. LÍNEAS DE PRODUCCIÓN (UUID)
CREATE TABLE production_lines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  leader_employee_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pline_leader FOREIGN KEY (leader_employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. TABLA PIVOTE LÍNEAS-EMPLEADOS (UUID)
CREATE TABLE production_line_employees (
  line_id CHAR(36) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (line_id, employee_id),
  CONSTRAINT fk_ple_line FOREIGN KEY (line_id) REFERENCES production_lines(id) ON DELETE CASCADE,
  CONSTRAINT fk_ple_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. ACTUALIZAR REFERENCIAS EN TABLA USUARIOS (UUID)
ALTER TABLE users MODIFY department_id CHAR(36) NULL;
ALTER TABLE users MODIFY shift_id CHAR(36) NULL;

-- 9. DATOS DE INICIO (Semillas)
INSERT INTO departments (id, name, description) VALUES (UUID(), 'Administración', 'Oficina central');
INSERT INTO shifts (id, name, start_time, end_time) VALUES (UUID(), 'Mañana', '06:00:00', '14:00:00');
INSERT INTO employee_roles (id, name, description) VALUES (UUID(), 'Operador', 'Planta');

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'UNIFICACIÓN COMPLETADA: Todos los módulos ahora usan UUID nativo.' AS result;
