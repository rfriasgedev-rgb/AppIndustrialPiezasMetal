-- ============================================================
-- MIGRACIÓN: CONVERSIÓN A UUID Y CAMPOS DE CONTACTO
-- Motor: MySQL 8.x / MariaDB 11.x
-- ============================================================

-- Desactivar chequeo de llaves foráneas para realizar cambios estructurales
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Actualizar tabla DEPARTMENTS
ALTER TABLE departments MODIFY id CHAR(36) NOT NULL;

-- 2. Actualizar tabla SHIFTS (Horarios)
ALTER TABLE shifts MODIFY id CHAR(36) NOT NULL;

-- 3. Actualizar tabla EMPLOYEE_ROLES
ALTER TABLE employee_roles MODIFY id CHAR(36) NOT NULL;

-- 4. Actualizar tabla EMPLOYEES
-- Añadir campos email y phone si no existen
ALTER TABLE employees 
ADD COLUMN email VARCHAR(150) NULL AFTER last_name,
ADD COLUMN phone VARCHAR(30) NULL AFTER email;

-- Cambiar tipos de llaves foráneas en EMPLOYEES
ALTER TABLE employees 
MODIFY department_id CHAR(36) NOT NULL,
MODIFY shift_id CHAR(36) NOT NULL,
MODIFY employee_role_id CHAR(36) NOT NULL;

-- 5. Actualizar tabla PRODUCTION_LINES
ALTER TABLE production_lines MODIFY id CHAR(36) NOT NULL;
-- leader_employee_id ya es CHAR(36) por el patch anterior, pero aseguramos
ALTER TABLE production_lines MODIFY leader_employee_id CHAR(36) NULL;

-- 6. Actualizar tabla pivote PRODUCTION_LINE_EMPLOYEES
ALTER TABLE production_line_employees MODIFY line_id CHAR(36) NOT NULL;

-- 7. Actualizar tabla USERS (tenía FKs a depts y shifts)
ALTER TABLE users 
MODIFY department_id CHAR(36) NULL,
MODIFY shift_id CHAR(36) NULL;

-- Reactivar chequeo de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Limpiar datos antiguos para evitar errores de integridad con los nuevos UUIDs
-- (Solo en tablas de configuración para forzar una nueva creación limpia)
TRUNCATE TABLE production_line_employees;
TRUNCATE TABLE employees;
TRUNCATE TABLE production_lines;
TRUNCATE TABLE employee_roles;
TRUNCATE TABLE shifts;
TRUNCATE TABLE departments;

-- Mensaje de confirmación
SELECT 'Migración a UUID completada. Las tablas están listas para nuevos registros.' AS message;
