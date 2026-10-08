ALTER TABLE `ClientInvoice`
  ADD COLUMN `clientName` VARCHAR(191) NULL,
  ADD COLUMN `clientPhone` VARCHAR(191) NULL,
  ADD COLUMN `clientAddress` TEXT NULL,
  ADD COLUMN `clientGstin` VARCHAR(191) NULL;

UPDATE `ClientInvoice` invoice
JOIN `Order` job ON job.`id` = invoice.`orderId`
JOIN `Customer` customer ON customer.`id` = job.`customerId`
SET invoice.`clientName` = customer.`name`,
    invoice.`clientPhone` = customer.`phone`,
    invoice.`clientAddress` = customer.`address`
WHERE invoice.`clientName` IS NULL;
