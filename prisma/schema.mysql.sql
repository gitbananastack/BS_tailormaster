-- StitchFlow MySQL schema
-- Run this file with a MySQL account permitted to create databases.
-- For local development: mysql -u root -p < prisma/schema.mysql.sql

CREATE DATABASE IF NOT EXISTS `stitchflow`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `stitchflow`;

CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` ENUM(
    'ADMIN',
    'ORDER_MANAGER',
    'CUTTING_OPERATOR',
    'TAILOR',
    'QC_INSPECTOR',
    'PACKING_STAFF',
    'DELIVERY_COORDINATOR'
  ) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Customer` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `address` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Order` (
  `id` VARCHAR(191) NOT NULL,
  `orderNumber` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `garmentName` VARCHAR(191) NOT NULL,
  `specification` TEXT NULL,
  `dueDate` DATETIME(3) NULL,
  `status` ENUM('CREATED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Order_orderNumber_key` (`orderNumber`),
  KEY `Order_customerId_idx` (`customerId`),
  CONSTRAINT `Order_customerId_fkey`
    FOREIGN KEY (`customerId`) REFERENCES `Customer` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `BomItem` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `itemName` VARCHAR(191) NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `plannedQty` DECIMAL(12,2) NOT NULL,
  `unitCost` DECIMAL(12,2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `BomItem_orderId_idx` (`orderId`),
  CONSTRAINT `BomItem_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductionBatch` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `batchNumber` VARCHAR(191) NOT NULL,
  `qrToken` VARCHAR(191) NOT NULL,
  `quantity` INT NOT NULL,
  `status` ENUM('CREATED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
  `currentStage` ENUM('CUTTING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL DEFAULT 'CUTTING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ProductionBatch_batchNumber_key` (`batchNumber`),
  UNIQUE KEY `ProductionBatch_qrToken_key` (`qrToken`),
  KEY `ProductionBatch_orderId_idx` (`orderId`),
  CONSTRAINT `ProductionBatch_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductionBatch_quantity_check` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductionEvent` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `stage` ENUM('CUTTING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
  `type` ENUM('STARTED', 'COMPLETED', 'REWORKED', 'REJECTED', 'ON_HOLD', 'CORRECTED') NOT NULL,
  `quantity` INT NULL,
  `laborCost` DECIMAL(12,2) NULL,
  `materialCost` DECIMAL(12,2) NULL,
  `notes` TEXT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `workstation` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ProductionEvent_batchId_createdAt_idx` (`batchId`, `createdAt`),
  KEY `ProductionEvent_stage_createdAt_idx` (`stage`, `createdAt`),
  KEY `ProductionEvent_userId_idx` (`userId`),
  CONSTRAINT `ProductionEvent_batchId_fkey`
    FOREIGN KEY (`batchId`) REFERENCES `ProductionBatch` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductionEvent_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ProductionEvent_quantity_check` CHECK (`quantity` IS NULL OR `quantity` >= 0),
  CONSTRAINT `ProductionEvent_laborCost_check` CHECK (`laborCost` IS NULL OR `laborCost` >= 0),
  CONSTRAINT `ProductionEvent_materialCost_check` CHECK (`materialCost` IS NULL OR `materialCost` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a least-privilege MySQL user separately, replacing the password before execution.
-- CREATE USER 'stitchflow_app'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP
--   ON `stitchflow`.* TO 'stitchflow_app'@'localhost';
-- FLUSH PRIVILEGES;
