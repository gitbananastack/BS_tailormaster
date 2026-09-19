ALTER TABLE `LaborCostEntry` ADD COLUMN `isAccepted` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `LaborCostEntry` ADD COLUMN `responseNote` TEXT NULL;
