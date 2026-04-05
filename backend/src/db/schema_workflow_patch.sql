-- -----------------------------------------------------
-- PATCH: Módulo de Flujo de Trabajo (Workflows) 
-- Departamentos, Turnos y Nuevas Etapas de Producción
-- -----------------------------------------------------

-- 1. Tabla de Departamentos (Centros de Trabajo)
CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla de Turnos (Shifts)
CREATE TABLE IF NOT EXISTS shifts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Añadir departamento y turno a los usuarios
-- (Evitamos el error si la columna ya existe usando un bloque de manejo en aplicaciones puras,
--  pero en MariaDB/MySQL >= 10.3 / 8.0 se puede hacer un IF NOT EXISTS solo en procedures. 
--  Para simplificar, dejemos los comandos DROP/ADD o simplemente ignoramos el error)
-- NOTA: Si este script se corre por segunda vez, fallará en ADD COLUMN.
-- Como es un patch de 1 vez, está bien.
ALTER TABLE users 
ADD COLUMN department_id INT UNSIGNED NULL,
ADD COLUMN shift_id INT UNSIGNED NULL,
ADD CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_users_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;

-- 4. Expandir ENUM de etapas (stages) para incluir DESIGN, WELDING, etc.
ALTER TABLE production_order_details
MODIFY COLUMN stage ENUM(
    'DESIGN',
    'PENDING_MATERIAL',
    'CUTTING',
    'BENDING',
    'ASSEMBLY',
    'WELDING',
    'CLEANING',
    'PAINTING',
    'QUALITY_CHECK',
    'READY',
    'CANCELLED'
) NOT NULL DEFAULT 'DESIGN';

-- 5. Insertar datos iniciales
INSERT IGNORE INTO departments (id, name, description) VALUES
(1, 'Diseño', 'Departamento de Diseño y modelado (Nuevas Piezas)'),
(2, 'Corte', 'Departamento de Corte de material y requisición'),
(3, 'Doblado', 'Departamento de conformado y doblado'),
(4, 'Ensamble', 'Departamento de ensamblaje modular'),
(5, 'Soldadura', 'Departamento de Soldadura'),
(6, 'Pintura y Limpieza - Línea 1', 'Línea 1 de preparación y empaque'),
(7, 'Pintura y Limpieza - Línea 2', 'Línea 2 de preparación y empaque');

INSERT IGNORE INTO shifts (id, name, start_time, end_time) VALUES
(1, 'Mañana', '06:00:00', '14:00:00'),
(2, 'Tarde', '14:00:00', '22:00:00');
