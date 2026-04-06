-- ============================================================
-- REPARACIÓN FORZADA: RECONSTRUCCIÓN DE TABLAS HR Y PROD
-- Motor: MySQL 8.x / MariaDB 11.x
-- ============================================================

-- Desactivar chequeo de llaves foráneas para permitir DROP TABLE
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Eliminar tablas conflictivas en orden
DROP TABLE IF EXISTS production_line_employees;
DROP TABLE IF EXISTS production_lines;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS employee_roles;

-- 2. Recrear ROLES DE PERSONAL con UUID
CREATE TABLE employee_roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Recrear PLANTILLA EMPLEADOS con UUID y CAMPOS DE CONTACTO
CREATE TABLE employees (
  id CHAR(36) NOT NULL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
  department_id CHAR(36) NOT NULL,
  shift_id CHAR(36) NOT NULL,
  employee_role_id CHAR(36) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_emp_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_emp_role FOREIGN KEY (employee_role_id) REFERENCES employee_roles(id)
) ENGINE=InnoDB;

-- 4. Recrear LÍNEAS DE PRODUCCIÓN con UUID
CREATE TABLE production_lines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  leader_employee_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pline_leader FOREIGN KEY (leader_employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Recrear TABLA PIVOTE LÍNEAS-EMPLEADOS con UUID
CREATE TABLE production_line_employees (
  line_id CHAR(36) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (line_id, employee_id),
  CONSTRAINT fk_ple_line FOREIGN KEY (line_id) REFERENCES production_lines(id) ON DELETE CASCADE,
  CONSTRAINT fk_ple_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Reactivar chequeo de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Insertar algunos roles por defecto para que el usuario no empiece de cero
INSERT INTO employee_roles (id, name, description) VALUES
(UUID(), 'Operador', 'Personal de planta y ensamble'),
(UUID(), 'Supervisor', 'Encargado de línea o etapa'),
(UUID(), 'Mantenimiento', 'Técnicos de maquinaria');

SELECT 'REPARACIÓN COMPLETADA: Tablas HR y Prod reconstruidas con UUID.' AS summary;
