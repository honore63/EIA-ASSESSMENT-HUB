CREATE TABLE `assessment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`studentUserId` int,
	`participantName` varchar(160),
	`status` enum('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
	`score` int,
	`totalMarks` int NOT NULL,
	`percentage` int,
	`timeTakenSeconds` int,
	`teacherFeedback` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessment_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessment_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`answer` json,
	`isCorrect` boolean,
	`earnedMarks` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessment_responses_id` PRIMARY KEY(`id`),
	CONSTRAINT `attempt_question_unique` UNIQUE(`attemptId`,`questionId`)
);
--> statement-breakpoint
ALTER TABLE `school_memberships` MODIFY COLUMN `role` enum('admin','super_admin','school_admin','academic_admin','teacher','student','guest') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','teacher','student') NOT NULL DEFAULT 'user';--> statement-breakpoint
UPDATE `school_memberships` SET `role` = CASE `role`
	WHEN 'super_admin' THEN 'admin'
	WHEN 'school_admin' THEN 'admin'
	WHEN 'academic_admin' THEN 'admin'
	WHEN 'guest' THEN 'student'
	ELSE `role`
END;--> statement-breakpoint
UPDATE `users` SET `role` = CASE `role` WHEN 'admin' THEN 'admin' ELSE 'teacher' END;--> statement-breakpoint
ALTER TABLE `school_memberships` MODIFY COLUMN `role` enum('admin','teacher','student') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','teacher','student') NOT NULL DEFAULT 'teacher';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','pending_verification','inactive','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_assessmentId_assessments_id_fk` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_responses` ADD CONSTRAINT `assessment_responses_attemptId_assessment_attempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `assessment_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_responses` ADD CONSTRAINT `assessment_responses_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attempt_student_history_idx` ON `assessment_attempts` (`studentUserId`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `attempt_assessment_status_idx` ON `assessment_attempts` (`assessmentId`,`status`);