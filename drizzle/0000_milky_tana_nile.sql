CREATE TABLE `content_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `domain` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`weight` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flashcard` (
	`id` text PRIMARY KEY NOT NULL,
	`deck` text NOT NULL,
	`task_id` text,
	`domain_id` text,
	`trap_id` text,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`retired` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task_statement`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trap_id`) REFERENCES `trap`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flashcard_state` (
	`card_id` text PRIMARY KEY NOT NULL,
	`box` integer NOT NULL,
	`due_at` integer NOT NULL,
	`first_seen_at` integer,
	`last_rated_at` integer,
	FOREIGN KEY (`card_id`) REFERENCES `flashcard`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `question` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`domain_id` text NOT NULL,
	`primary_task_id` text NOT NULL,
	`pool` text DEFAULT 'practice' NOT NULL,
	`type` text NOT NULL,
	`select_count` integer NOT NULL,
	`difficulty` integer NOT NULL,
	`stem` text NOT NULL,
	`key_concept` text NOT NULL,
	`study_ref` text,
	`version` integer NOT NULL,
	`content_hash` text NOT NULL,
	`retired` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_task_id`) REFERENCES `task_statement`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `question_scenario_idx` ON `question` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `question_domain_idx` ON `question` (`domain_id`);--> statement-breakpoint
CREATE TABLE `question_flag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`resolved` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `question_option` (
	`question_id` text NOT NULL,
	`key` text NOT NULL,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	`is_correct` integer NOT NULL,
	`explanation` text NOT NULL,
	`trap_id` text,
	PRIMARY KEY(`question_id`, `key`),
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trap_id`) REFERENCES `trap`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `question_task` (
	`question_id` text NOT NULL,
	`task_id` text NOT NULL,
	`is_primary` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`question_id`, `task_id`),
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `task_statement`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_item` (
	`question_id` text PRIMARY KEY NOT NULL,
	`box` integer NOT NULL,
	`due_at` integer NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`retired_at` integer,
	`last_seen_at` integer,
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_item_due_idx` ON `review_item` (`due_at`);--> statement-breakpoint
CREATE TABLE `scenario` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`setup` text NOT NULL,
	`tools_json` text
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`mode` text NOT NULL,
	`filters_json` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`time_limit_s` integer,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`mock_id` text
);
--> statement-breakpoint
CREATE TABLE `session_item` (
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`question_id` text NOT NULL,
	`option_order_json` text NOT NULL,
	`selected_json` text,
	`is_correct` integer,
	`correct_selected` integer,
	`confidence` text,
	`time_ms` integer,
	`answered_at` integer,
	`marked` integer DEFAULT 0 NOT NULL,
	`review_effect` text,
	PRIMARY KEY(`session_id`, `position`),
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_item_question_idx` ON `session_item` (`question_id`);--> statement-breakpoint
CREATE INDEX `session_item_answered_idx` ON `session_item` (`answered_at`);--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_statement` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`title` text NOT NULL,
	`research_anchor` text,
	`lesson_url` text,
	`knowledge_json` text,
	`skills_json` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trap` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`principle` text NOT NULL,
	`examples_json` text
);
