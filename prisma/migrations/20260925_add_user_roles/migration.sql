ALTER TABLE `User` ADD COLUMN `roles` JSON NULL;
UPDATE `User` SET `roles` = JSON_ARRAY(`role`) WHERE `roles` IS NULL;
