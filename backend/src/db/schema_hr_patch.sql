-- -----------------------------------------------------
-- PATCH: Módulo de Recursos Humanos y Líneas 
-- Roles de empleado, Empleados, Líneas de Producción
-- -----------------------------------------------------

-- 1. Tabla de Roles de Empleados
CREATE TABLE IF NOT EXISTS employee_roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO employee_roles (name, description) VALUES
('Diseñador', 'Encargado del diseño de la pieza'),
('Cortador', 'Encargado de cortar los materiales'),
('Doblador', 'Encargado de doblar láminas y tubos'),
('Ensamblador', 'Encargado de unir partes y soldar'),
('Empaque', 'Encargado de limpieza y empaque');

-- 2. Tabla de Empleados
CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) NOT NULL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  shift_id INT UNSIGNED NOT NULL,
  employee_role_id INT UNSIGNED NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_emp_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_emp_role FOREIGN KEY (employee_role_id) REFERENCES employee_roles(id)
) ENGINE=InnoDB;

-- 3. Tabla de Líneas de Producción
CREATE TABLE IF NOT EXISTS production_lines (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  leader_employee_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pline_leader FOREIGN KEY (leader_employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO production_lines (name, description) VALUES
('Linea 1', 'Línea de producción 1'),
('Linea 2', 'Línea de producción 2'),
('Linea 3', 'Línea de producción 3');

-- 4. Tabla Pivote: Líneas y Empleados
CREATE TABLE IF NOT EXISTS production_line_employees (
  line_id INT UNSIGNED NOT NULL,
  employee_id CHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (line_id, employee_id),
  CONSTRAINT fk_ple_line FOREIGN KEY (line_id) REFERENCES production_lines(id) ON DELETE CASCADE,
  CONSTRAINT fk_ple_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;
