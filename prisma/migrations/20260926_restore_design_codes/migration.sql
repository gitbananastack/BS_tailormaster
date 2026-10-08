-- Preserve design codes already present in earlier installations.
SET @has_design_code = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'OrderItem' AND column_name = 'designCode');
SET @design_sql = IF(@has_design_code = 0, 'ALTER TABLE `OrderItem` ADD COLUMN `designCode` VARCHAR(191) NULL', 'SELECT 1');
PREPARE design_stmt FROM @design_sql;
EXECUTE design_stmt;
DEALLOCATE PREPARE design_stmt;
