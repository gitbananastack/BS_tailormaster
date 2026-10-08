-- Earlier installations already have screenAccess. Keep that data intact.
SET @has_screen_access = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'User' AND column_name = 'screenAccess');
SET @access_sql = IF(@has_screen_access = 0, 'ALTER TABLE `User` ADD COLUMN `screenAccess` JSON NULL', 'SELECT 1');
PREPARE access_stmt FROM @access_sql;
EXECUTE access_stmt;
DEALLOCATE PREPARE access_stmt;
