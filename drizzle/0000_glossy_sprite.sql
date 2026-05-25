CREATE TABLE `chords` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`musical_title` text,
	`svg_horizontal` text,
	`svg_vertical` text,
	`start_fret` integer,
	`has_barre` integer DEFAULT false NOT NULL,
	`order_in_note` integer
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`video_url` text,
	`duration` integer,
	`course_uuid` text,
	`updated_at` text NOT NULL,
	`synced_at` text,
	`local_video_path` text,
	`video_download_status` text DEFAULT 'idle' NOT NULL,
	FOREIGN KEY (`course_uuid`) REFERENCES `courses`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lessons_course_uuid_idx` ON `lessons` (`course_uuid`);--> statement-breakpoint
CREATE TABLE `schemes` (
	`id` integer PRIMARY KEY NOT NULL,
	`song_uuid` text NOT NULL,
	`url` text NOT NULL,
	`local_image_path` text,
	FOREIGN KEY (`song_uuid`) REFERENCES `songs`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `schemes_song_uuid_idx` ON `schemes` (`song_uuid`);--> statement-breakpoint
CREATE TABLE `song_chords` (
	`song_uuid` text NOT NULL,
	`chord_id` integer NOT NULL,
	PRIMARY KEY(`song_uuid`, `chord_id`),
	FOREIGN KEY (`song_uuid`) REFERENCES `songs`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chord_id`) REFERENCES `chords`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `song_chords_chord_id_idx` ON `song_chords` (`chord_id`);--> statement-breakpoint
CREATE TABLE `songs` (
	`uuid` text PRIMARY KEY NOT NULL,
	`lesson_uuid` text NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`metronome` integer,
	FOREIGN KEY (`lesson_uuid`) REFERENCES `lessons`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `songs_lesson_uuid_idx` ON `songs` (`lesson_uuid`);