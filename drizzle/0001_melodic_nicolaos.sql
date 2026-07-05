CREATE TABLE `activity_daily` (
	`date` text PRIMARY KEY NOT NULL,
	`total_seconds` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`type` text NOT NULL,
	`entity_id` text,
	`title` text,
	`lesson_title` text,
	`value` integer,
	`duration_seconds` integer,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL
);
