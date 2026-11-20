CREATE TABLE `question_lesson` (
	`question_id` text PRIMARY KEY NOT NULL,
	`lesson_json` text NOT NULL,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE no action
);
