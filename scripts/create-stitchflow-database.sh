#!/usr/bin/env bash
# Fresh StitchFlow database setup for an already-installed MySQL 8.4 server.
# Socket-authenticated administrator: sudo bash create-stitchflow-database.sh
# Password-authenticated administrator: bash create-stitchflow-database.sh -u root -p
# mysql client options are forwarded unchanged. No existing database is modified.
set -Eeuo pipefail
umask 077
command -v mysql >/dev/null || { echo "Install the MySQL client first." >&2; exit 1; }
command -v openssl >/dev/null || { echo "Install openssl first." >&2; exit 1; }
MYSQL=(mysql "$@")
DB_NAME=stitchflow
DB_USER=stitchflow_app
CREDENTIALS="$(pwd)/stitchflow-database.env"
[[ ! -e "$CREDENTIALS" ]] || { echo "Credentials file already exists: $CREDENTIALS. Stopping." >&2; exit 1; }
echo "Checking MySQL access. With -p, MySQL will prompt again for the setup connection."
existing="$("${MYSQL[@]}" --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='stitchflow';")"
[[ "$existing" == "0" ]] || { echo "Database stitchflow already exists. Stopping without changes." >&2; exit 1; }
DB_PASSWORD="$(openssl rand -hex 24)"
SQL_FILE="$(mktemp)"
trap 'rm -f "$SQL_FILE"' EXIT
# CREATE USER deliberately fails if that account already exists; no password resets.
cat > "$SQL_FILE" <<SQL
CREATE USER 'stitchflow_app'@'localhost' IDENTIFIED WITH caching_sha2_password BY '${DB_PASSWORD}';
CREATE DATABASE stitchflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stitchflow;
SQL
cat >> "$SQL_FILE" <<'STITCHFLOW_SCHEMA'
-- CreateTable
CREATE TABLE `AppSetting` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `screenAccess` JSON NULL,
    `roles` JSON NULL,
    `role` ENUM('ADMIN', 'ORDER_MANAGER', 'CUTTING_OPERATOR', 'FUSING_OPERATOR', 'TAILOR', 'QC_INSPECTOR', 'PACKING_STAFF', 'DELIVERY_COORDINATOR') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `garmentName` VARCHAR(191) NOT NULL,
    `specification` TEXT NULL,
    `issueNumber` VARCHAR(191) NULL,
    `processName` VARCHAR(191) NULL,
    `salesOrderNumber` VARCHAR(191) NULL,
    `productionManager` VARCHAR(191) NULL,
    `receivedDate` DATETIME(3) NULL,
    `inwardValue` DECIMAL(12, 2) NULL,
    `qrToken` VARCHAR(191) NULL,
    `estimatedCompletion` DATETIME(3) NULL,
    `currentStage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL DEFAULT 'CUTTING',
    `dueDate` DATETIME(3) NULL,
    `status` ENUM('CREATED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'NOT_REQUIRED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    UNIQUE INDEX `Order_qrToken_key`(`qrToken`),
    INDEX `Order_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `shareToken` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gstPercent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `gstAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `clientName` VARCHAR(191) NULL,
    `clientPhone` VARCHAR(191) NULL,
    `clientAddress` TEXT NULL,
    `clientGstin` VARCHAR(191) NULL,
    `lineItems` JSON NOT NULL,
    `description` TEXT NULL,
    `notes` TEXT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'ISSUED',
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientInvoice_invoiceNumber_key`(`invoiceNumber`),
    UNIQUE INDEX `ClientInvoice_shareToken_key`(`shareToken`),
    INDEX `ClientInvoice_orderId_idx`(`orderId`),
    INDEX `ClientInvoice_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QcInspection` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `inspectorId` VARCHAR(191) NOT NULL,
    `result` ENUM('PENDING', 'PASSED', 'REWORK_REQUIRED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `stitchingPassed` BOOLEAN NOT NULL DEFAULT false,
    `measurementPassed` BOOLEAN NOT NULL DEFAULT false,
    `finishingPassed` BOOLEAN NOT NULL DEFAULT false,
    `defectPhotoPath` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `reworkStage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NULL,
    `reworkTailorIds` JSON NULL,
    `reworkDesignCodes` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QcInspection_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaborCostEntry` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `stage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `note` TEXT NULL,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `isAccepted` BOOLEAN NOT NULL DEFAULT false,
    `responseNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LaborCostEntry_orderId_stage_idx`(`orderId`, `stage`),
    INDEX `LaborCostEntry_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderManagerNote` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `stage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
    `message` TEXT NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderManagerNote_orderId_stage_createdAt_idx`(`orderId`, `stage`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderStatusUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `status` ENUM('CREATED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'NOT_REQUIRED', 'CANCELLED') NOT NULL,
    `stage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
    `comment` TEXT NULL,
    `eta` DATETIME(3) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderStatusUpdate_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `OrderStatusUpdate_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `stage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderAssignment_orderId_stage_idx`(`orderId`, `stage`),
    INDEX `OrderAssignment_userId_idx`(`userId`),
    UNIQUE INDEX `OrderAssignment_orderId_stage_userId_key`(`orderId`, `stage`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `designCode` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `clientOrderReference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderSizeQuantity` (
    `id` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,

    INDEX `OrderSizeQuantity_size_idx`(`size`),
    UNIQUE INDEX `OrderSizeQuantity_orderItemId_size_key`(`orderItemId`, `size`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawMaterialReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `itemCode` VARCHAR(191) NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `panna` DECIMAL(12, 2) NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'm',
    `cost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RawMaterialReceipt_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BomItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `plannedQty` DECIMAL(12, 2) NOT NULL,
    `unitCost` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionBatch` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NOT NULL,
    `qrToken` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('CREATED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'NOT_REQUIRED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    `currentStage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL DEFAULT 'CUTTING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionBatch_batchNumber_key`(`batchNumber`),
    UNIQUE INDEX `ProductionBatch_qrToken_key`(`qrToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `stage` ENUM('CUTTING', 'FUSING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
    `type` ENUM('STARTED', 'COMPLETED', 'REWORKED', 'REJECTED', 'ON_HOLD', 'CORRECTED') NOT NULL,
    `quantity` INTEGER NULL,
    `laborCost` DECIMAL(12, 2) NULL,
    `materialCost` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `workstation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductionEvent_batchId_createdAt_idx`(`batchId`, `createdAt`),
    INDEX `ProductionEvent_stage_createdAt_idx`(`stage`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientInvoice` ADD CONSTRAINT `ClientInvoice_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientInvoice` ADD CONSTRAINT `ClientInvoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QcInspection` ADD CONSTRAINT `QcInspection_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QcInspection` ADD CONSTRAINT `QcInspection_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaborCostEntry` ADD CONSTRAINT `LaborCostEntry_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaborCostEntry` ADD CONSTRAINT `LaborCostEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderManagerNote` ADD CONSTRAINT `OrderManagerNote_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderManagerNote` ADD CONSTRAINT `OrderManagerNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderStatusUpdate` ADD CONSTRAINT `OrderStatusUpdate_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderStatusUpdate` ADD CONSTRAINT `OrderStatusUpdate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderAssignment` ADD CONSTRAINT `OrderAssignment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderAssignment` ADD CONSTRAINT `OrderAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderSizeQuantity` ADD CONSTRAINT `OrderSizeQuantity_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawMaterialReceipt` ADD CONSTRAINT `RawMaterialReceipt_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BomItem` ADD CONSTRAINT `BomItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionBatch` ADD CONSTRAINT `ProductionBatch_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionEvent` ADD CONSTRAINT `ProductionEvent_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductionBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionEvent` ADD CONSTRAINT `ProductionEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

STITCHFLOW_SCHEMA
cat >> "$SQL_FILE" <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON stitchflow.* TO 'stitchflow_app'@'localhost';
SQL
# Save credentials before executing DDL so they survive a partial setup failure.
(set -o noclobber; printf 'DATABASE_URL="mysql://stitchflow_app:%s@localhost:3306/stitchflow"\n' "$DB_PASSWORD" > "$CREDENTIALS")
if ! "${MYSQL[@]}" < "$SQL_FILE"; then
  echo "Setup failed. DDL may be partially applied; inspect MySQL before retrying." >&2
  echo "Generated credentials are saved in $CREDENTIALS." >&2
  exit 1
fi
unset DB_PASSWORD
echo "Created stitchflow database, 16 application tables, and stitchflow_app@localhost."
echo "DATABASE_URL is saved in $CREDENTIALS (mode 600). Keep this file private."
echo "Copy that DATABASE_URL into the application's .env file."
echo "This script does not install the app, create an application admin, or baseline Prisma migrations."
echo "Do not run the fresh install-ubuntu.sh installer against this database."
