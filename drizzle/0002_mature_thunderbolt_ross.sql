CREATE TABLE `confirmed_donations` (
	`store_transaction_id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`verified_at` text NOT NULL
);
