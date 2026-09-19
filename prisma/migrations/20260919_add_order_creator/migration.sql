ALTER TABLE `Order`
  ADD COLUMN `createdById` VARCHAR(191) NULL;

CREATE INDEX `Order_createdById_idx` ON `Order`(`createdById`);

ALTER TABLE `Order`
  ADD CONSTRAINT `Order_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `Order` AS `o`
SET `o`.`createdById` = (
  SELECT MIN(`u`.`id`)
  FROM `User` AS `u`
  WHERE `u`.`name` = `o`.`productionManager`
    AND `u`.`role` IN ('ADMIN', 'ORDER_MANAGER')
)
WHERE `o`.`createdById` IS NULL
  AND `o`.`productionManager` IS NOT NULL;

-- Older orders may predate the creator link and contain a free-text manager
-- name that does not match a user. Use the newest management account that
-- already existed when that order was received as the safest legacy fallback.
UPDATE `Order` AS `o`
SET `o`.`createdById` = (
  SELECT `u`.`id`
  FROM `User` AS `u`
  WHERE `u`.`role` IN ('ADMIN', 'ORDER_MANAGER')
    AND `u`.`createdAt` <= `o`.`createdAt`
  ORDER BY `u`.`createdAt` DESC
  LIMIT 1
)
WHERE `o`.`createdById` IS NULL;
