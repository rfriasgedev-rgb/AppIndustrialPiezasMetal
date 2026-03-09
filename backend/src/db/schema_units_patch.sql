CREATE TABLE IF NOT EXISTS measurement_units (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Ignore errors if column already exists or similar
SET @dbname = DATABASE();
SET @tablename = 'inventory_items';
SET @columnname = 'unit_of_measure_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE inventory_items ADD COLUMN unit_of_measure_id CHAR(36) NULL AFTER location;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ignore errors if foreign key already exists
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (constraint_name = 'fk_inv_unit')
  ) > 0,
  "SELECT 1",
  "ALTER TABLE inventory_items ADD CONSTRAINT fk_inv_unit FOREIGN KEY (unit_of_measure_id) REFERENCES measurement_units(id) ON DELETE SET NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

INSERT IGNORE INTO measurement_units (id, name, abbreviation) VALUES 
(UUID(), 'Kilogramos', 'kg'),
(UUID(), 'Litros', 'lt'),
(UUID(), 'Metros', 'm'),
(UUID(), 'Metros Cuadrados', 'm2'),
(UUID(), 'Unidades', 'u');
