-- Migración: Agregar columnas de asignación a production_order_details
-- Ejecutar UNA sola vez en producción (Railway o donde esté la BD)
-- Seguro de re-ejecutar gracias a IF NOT EXISTS

ALTER TABLE production_order_details
  ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36) NULL DEFAULT NULL COMMENT 'UUID del usuario que tomó esta orden',
  ADD COLUMN IF NOT EXISTS assigned_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora en que fue tomada la orden';

-- Verificar
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'production_order_details'
  AND COLUMN_NAME IN ('assigned_to', 'assigned_at');
