-- ============================================================
-- SCRIPT DE MIGRACIÓN - Metal Parts ERP
-- Motor: MySQL 8.x / MariaDB 11.x
-- Encoding: UTF8MB4
-- ============================================================

-- ============================================================
-- TABLA: roles (RBAC)
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id CHAR(36) NOT NULL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(120),
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(30),
  address TEXT,
  tax_id VARCHAR(50) UNIQUE,
  credit_limit DECIMAL(15,2) DEFAULT 0.00,
  outstanding_balance DECIMAL(15,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clients_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: material_categories (Metales)
-- ============================================================
CREATE TABLE IF NOT EXISTS material_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,  -- Magnesio, Cromo, Zinc, etc.
  description TEXT,
  unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'kg',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: inventory_items (Materia Prima)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(80) UNIQUE,
  description TEXT,
  quantity_available DECIMAL(15,3) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(15,3) NOT NULL DEFAULT 0,
  reorder_point DECIMAL(15,3) DEFAULT 0,
  unit_cost DECIMAL(15,4) DEFAULT 0,
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_category FOREIGN KEY (category_id) REFERENCES material_categories(id),
  CONSTRAINT chk_quantity CHECK (quantity_available >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: inventory_movements (Trazabilidad de Stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  item_id CHAR(36) NOT NULL,
  movement_type ENUM('IN','OUT','RESERVE','RELEASE','ADJUST') NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  reference_type VARCHAR(50),  -- 'purchase', 'production_order', 'adjustment'
  reference_id CHAR(36),
  notes TEXT,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mvt_item FOREIGN KEY (item_id) REFERENCES inventory_items(id),
  CONSTRAINT fk_mvt_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: purchases (Órdenes de Compra de Materia Prima)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  idempotency_key VARCHAR(100) UNIQUE,  -- Previene duplicados
  supplier_name VARCHAR(200) NOT NULL,
  item_id CHAR(36) NOT NULL,
  quantity_ordered DECIMAL(15,3) NOT NULL,
  quantity_received DECIMAL(15,3) DEFAULT 0,
  unit_price DECIMAL(15,4) NOT NULL,
  total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  status ENUM('PENDING','ORDERED','PARTIAL','RECEIVED','CANCELLED') DEFAULT 'PENDING',
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pur_item FOREIGN KEY (item_id) REFERENCES inventory_items(id),
  CONSTRAINT fk_pur_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: product_catalog (Catálogo de Piezas)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_catalog (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  part_number VARCHAR(80) UNIQUE,
  description TEXT,
  requires_assembly BOOLEAN DEFAULT FALSE,
  standard_hours DECIMAL(8,2),  -- Tiempo estándar de fabricación
  sale_price DECIMAL(15,2) DEFAULT 0,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: product_materials (Lista de Materiales - BOM)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_materials (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  quantity_required DECIMAL(15,3) NOT NULL,
  CONSTRAINT fk_bom_product FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE,
  CONSTRAINT fk_bom_item FOREIGN KEY (item_id) REFERENCES inventory_items(id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: production_orders (Órdenes de Producción - Core)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  client_id CHAR(36) NOT NULL,
  status ENUM(
    'DRAFT',
    'PENDING_MATERIAL',
    'IN_PROGRESS',
    'READY_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT',
  priority ENUM('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  estimated_delivery DATE,
  actual_delivery DATE,
  notes TEXT,
  created_by CHAR(36) NOT NULL,
  assigned_to CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_prod_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: production_order_details (Items Multi-Producto)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_order_details (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  stage ENUM(
    'PENDING_MATERIAL',
    'CUTTING',
    'BENDING',
    'ASSEMBLY',
    'CLEANING',
    'PAINTING',
    'QUALITY_CHECK',
    'READY',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING_MATERIAL',
  requires_assembly BOOLEAN DEFAULT FALSE,
  notes TEXT,
  assigned_to CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_podets_order FOREIGN KEY (order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_podets_product FOREIGN KEY (product_id) REFERENCES product_catalog(id),
  CONSTRAINT fk_podets_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: production_stage_log (Trazabilidad del Flujo)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_stage_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_detail_id CHAR(36) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  notes TEXT,
  stage_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  stage_completed_at TIMESTAMP NULL,
  performed_by CHAR(36) NOT NULL,
  CONSTRAINT fk_stlog_orderdet FOREIGN KEY (order_detail_id) REFERENCES production_order_details(id) ON DELETE CASCADE,
  CONSTRAINT fk_stlog_user FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: audit_log (Registro de Auditoría Global - Inmutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  table_name VARCHAR(80) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  action ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  old_values JSON,
  new_values JSON,
  performed_by CHAR(36),
  ip_address VARCHAR(45),
  user_agent TEXT,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- DATOS INICIALES: Roles del Sistema
-- ============================================================
INSERT IGNORE INTO roles (id, name, description) VALUES
  (1, 'ADMIN',        'Acceso total al sistema: usuarios, clientes, reportes e inventario.'),
  (2, 'SUPERVISOR',   'Supervisa órdenes de producción y aprueba etapas.'),
  (3, 'OPERADOR',     'Ejecuta las etapas de producción asignadas.'),
  (4, 'ALMACENISTA',  'Gestiona inventario, entradas y salidas de material.'),
  (5, 'VENTAS',       'Gestiona clientes y crea órdenes de producción.');

-- ============================================================
-- DATOS INICIALES: Categorías de Materiales
-- ============================================================
INSERT IGNORE INTO material_categories (id, name, unit_of_measure, description) VALUES
  (1, 'Magnesio', 'kg', 'Aleaciones de magnesio para estructuras livianas'),
  (2, 'Cromo',    'kg', 'Cromo para recubrimientos y aceros inoxidables'),
  (3, 'Zinc',     'kg', 'Zinc para galvanizado y aleaciones'),
  (4, 'Acero',    'kg', 'Acero laminado y perfilería'),
  (5, 'Aluminio', 'kg', 'Láminas y perfiles de aluminio'),
  (6, 'Pintura',  'lt', 'Pinturas industriales y recubrimientos');
