CREATE TABLE `chords` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`musical_title` text NOT NULL,
	`svg_horizontal` text,
	`svg_vertical` text,
	`start_fret` integer,
	`has_barre` integer DEFAULT false NOT NULL,
	`order_in_note` integer
);
--> statement-breakpoint
CREATE TABLE `course_lessons` (
	`course_uuid` text NOT NULL,
	`lesson_uuid` text NOT NULL,
	`order` integer NOT NULL,
	PRIMARY KEY(`course_uuid`, `lesson_uuid`),
	FOREIGN KEY (`course_uuid`) REFERENCES `courses`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_uuid`) REFERENCES `lessons`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `course_lessons_lesson_uuid_idx` ON `course_lessons` (`lesson_uuid`);--> statement-breakpoint
CREATE TABLE `courses` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lesson_addition_lessons` (
	`lesson_uuid` text NOT NULL,
	`addition_lesson_uuid` text NOT NULL,
	PRIMARY KEY(`lesson_uuid`, `addition_lesson_uuid`),
	FOREIGN KEY (`lesson_uuid`) REFERENCES `lessons`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`addition_lesson_uuid`) REFERENCES `lessons`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lesson_addition_lessons_addition_lesson_uuid_idx` ON `lesson_addition_lessons` (`addition_lesson_uuid`);--> statement-breakpoint
CREATE TABLE `lesson_songs` (
	`lesson_uuid` text NOT NULL,
	`song_uuid` text NOT NULL,
	PRIMARY KEY(`lesson_uuid`, `song_uuid`),
	FOREIGN KEY (`lesson_uuid`) REFERENCES `lessons`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`song_uuid`) REFERENCES `songs`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lesson_songs_song_uuid_idx` ON `lesson_songs` (`song_uuid`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`video_url` text NOT NULL,
	`duration` integer,
	`updated_at` text NOT NULL,
	`synced_at` text,
	`local_video_path` text,
	`video_download_status` text DEFAULT 'idle' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schemes` (
	`id` integer PRIMARY KEY NOT NULL,
	`image` text NOT NULL,
	`inscription` text,
	`height` integer,
	`width` integer,
	`local_image_path` text
);
--> statement-breakpoint
CREATE TABLE `song_chords` (
	`song_uuid` text NOT NULL,
	`chord_id` integer NOT NULL,
	PRIMARY KEY(`song_uuid`, `chord_id`),
	FOREIGN KEY (`song_uuid`) REFERENCES `songs`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chord_id`) REFERENCES `chords`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `song_chords_chord_id_idx` ON `song_chords` (`chord_id`);--> statement-breakpoint
CREATE TABLE `song_schemes` (
	`song_uuid` text NOT NULL,
	`scheme_id` integer NOT NULL,
	PRIMARY KEY(`song_uuid`, `scheme_id`),
	FOREIGN KEY (`song_uuid`) REFERENCES `songs`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scheme_id`) REFERENCES `schemes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `song_schemes_scheme_id_idx` ON `song_schemes` (`scheme_id`);--> statement-breakpoint
CREATE TABLE `songs` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`metronome` integer DEFAULT 0 NOT NULL
);
