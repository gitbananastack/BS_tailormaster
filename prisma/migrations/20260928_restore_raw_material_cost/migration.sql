-- Preserve material costs already present in earlier installations.
SET @has_material_cost = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'RawMaterialReceipt'
    AND column_name = 'cost'
);
SET @material_cost_sql = IF(
  @has_material_cost = 0,
  'ALTER TABLE `RawMaterialReceipt` ADD COLUMN `cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00',
  'SELECT 1'
);
PREPARE material_cost_stmt FROM @material_cost_sql;
EXECUTE material_cost_stmt;
DEALLOCATE PREPARE material_cost_stmt;
