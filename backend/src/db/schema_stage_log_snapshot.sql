-- Add operator text fields to existing staging log
SET @dbname = DATABASE();
SET @tablename = 'production_stage_log';
SET @columnname = 'operator_name';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE production_stage_log ADD COLUMN operator_name VARCHAR(150) NULL, ADD COLUMN operator_role VARCHAR(100) NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Table for team member snapshots when finishing a production line package
CREATE TABLE IF NOT EXISTS production_stage_log_team (
  id CHAR(36) NOT NULL PRIMARY KEY,
  production_stage_log_id CHAR(36) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_role VARCHAR(100),
  CONSTRAINT fk_log_team FOREIGN KEY (production_stage_log_id) REFERENCES production_stage_log(id) ON DELETE CASCADE
) ENGINE=InnoDB;
