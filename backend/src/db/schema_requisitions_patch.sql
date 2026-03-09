-- -----------------------------------------------------
-- PATCH: Módulo de Requisición de Materiales (BOM -> ALMACÉN)
-- -----------------------------------------------------

-- 1. Tabla Cabecera: Solicitud de Requisición
CREATE TABLE IF NOT EXISTS material_requisitions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  requisition_number VARCHAR(30) NOT NULL UNIQUE,
  production_order_id CHAR(36) NOT NULL,
  status ENUM('PENDING', 'PARTIAL', 'DISPATCHED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  requested_by CHAR(36) NOT NULL,
  dispatched_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_order FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_req_reqby FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_req_dispby FOREIGN KEY (dispatched_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 2. Tabla Detalle: Líneas Consolidadas de Materiales
CREATE TABLE IF NOT EXISTS requisition_details (
  id CHAR(36) NOT NULL PRIMARY KEY,
  requisition_id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  quantity_requested DECIMAL(15,3) NOT NULL,
  quantity_dispatched DECIMAL(15,3) NOT NULL DEFAULT 0,
  CONSTRAINT fk_reqdet_req FOREIGN KEY (requisition_id) REFERENCES material_requisitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_reqdet_item FOREIGN KEY (item_id) REFERENCES inventory_items(id)
) ENGINE=InnoDB;
