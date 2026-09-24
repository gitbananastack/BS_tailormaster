ALTER TABLE `ClientInvoice`
  ADD COLUMN `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `gstPercent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `gstAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `lineItems` JSON NULL;

UPDATE `ClientInvoice`
SET `subtotal` = `amount`,
    `lineItems` = JSON_ARRAY(
      JSON_OBJECT(
        'description', COALESCE(NULLIF(`description`, ''), 'Garment production services'),
        'quantity', 1,
        'rate', `amount`,
        'amount', `amount`
      )
    )
WHERE `lineItems` IS NULL;

ALTER TABLE `ClientInvoice`
  MODIFY COLUMN `lineItems` JSON NOT NULL;
