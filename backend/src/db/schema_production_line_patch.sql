-- Ignore errors if column already exists or similar
SET @dbname = DATABASE();
SET @tablename = 'production_order_details';
SET @columnname = 'production_line_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE production_order_details ADD COLUMN production_line_id CHAR(36) NULL;"
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
      AND (constraint_name = 'fk_podets_pline')
  ) > 0,
  "SELECT 1",
  "ALTER TABLE production_order_details ADD CONSTRAINT fk_podets_pline FOREIGN KEY (production_line_id) REFERENCES production_lines(id) ON DELETE SET NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
