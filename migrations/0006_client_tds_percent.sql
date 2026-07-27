-- Client-level TDS rate (%) deducted by the client on payment.
ALTER TABLE clients ADD COLUMN tds_percent REAL NOT NULL DEFAULT 0;
