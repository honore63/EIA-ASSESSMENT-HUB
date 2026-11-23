CREATE TABLE `academic_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`label` varchar(40) NOT NULL,
	`status` enum('current','upcoming','closed') NOT NULL DEFAULT 'current',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academic_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_year_school_label_unique` UNIQUE(`schoolId`,`label`)
);
--> statement-breakpoint
CREATE TABLE `assessment_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` int NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	CONSTRAINT `assessment_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessment_question_unique` UNIQUE(`assessmentId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`subject` varchar(100) NOT NULL,
	`gradeLabel` varchar(80) NOT NULL,
	`topic` varchar(140),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`questionCount` int NOT NULL DEFAULT 0,
	`totalMarks` int NOT NULL DEFAULT 0,
	`completionRate` int NOT NULL DEFAULT 0,
	`averageScore` int NOT NULL DEFAULT 0,
	`durationMinutes` int NOT NULL DEFAULT 30,
	`settings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`teacherId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`classLabel` varchar(120) NOT NULL,
	`status` enum('draft','scheduled','available','in_progress','submitted','completed','overdue','closed') NOT NULL DEFAULT 'draft',
	`dueAt` datetime,
	`submissions` int NOT NULL DEFAULT 0,
	`totalLearners` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int,
	`actorId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`gradeId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`section` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_school_name_unique` UNIQUE(`schoolId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`level` int NOT NULL,
	`curriculum` varchar(120) NOT NULL DEFAULT 'Cambridge',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grades_id` PRIMARY KEY(`id`),
	CONSTRAINT `grade_school_level_unique` UNIQUE(`schoolId`,`level`)
);
--> statement-breakpoint
CREATE TABLE `question_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`label` varchar(10) NOT NULL,
	`text` text NOT NULL,
	`isCorrect` boolean NOT NULL DEFAULT false,
	CONSTRAINT `question_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`type` enum('mcq','multi_select','true_false','short_answer','numeric','fill_blank') NOT NULL,
	`prompt` text NOT NULL,
	`marks` int NOT NULL DEFAULT 1,
	`explanation` text,
	`answerKey` json,
	`settings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('super_admin','school_admin','academic_admin','teacher','student','guest') NOT NULL,
	`status` enum('active','pending','suspended','deactivated') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `school_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_membership_school_user_unique` UNIQUE(`schoolId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`tenantKey` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`),
	CONSTRAINT `schools_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `schools_tenantKey_unique` UNIQUE(`tenantKey`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`department` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subject_school_code_unique` UNIQUE(`schoolId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `teacher_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int,
	`fullName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`subjectsSummary` varchar(240),
	`gradesSummary` varchar(120),
	`status` enum('pending_email','pending_approval','approved','rejected','suspended','deactivated') NOT NULL DEFAULT 'pending_approval',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`academicYearId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`startsOn` varchar(20),
	`endsOn` varchar(20),
	CONSTRAINT `terms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `academic_years` ADD CONSTRAINT `academic_years_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_questions` ADD CONSTRAINT `assessment_questions_assessmentId_assessments_id_fk` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_questions` ADD CONSTRAINT `assessment_questions_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_assessmentId_assessments_id_fk` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classes` ADD CONSTRAINT `classes_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classes` ADD CONSTRAINT `classes_gradeId_grades_id_fk` FOREIGN KEY (`gradeId`) REFERENCES `grades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grades` ADD CONSTRAINT `grades_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_memberships` ADD CONSTRAINT `school_memberships_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_memberships` ADD CONSTRAINT `school_memberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_profiles` ADD CONSTRAINT `teacher_profiles_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_profiles` ADD CONSTRAINT `teacher_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terms` ADD CONSTRAINT `terms_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terms` ADD CONSTRAINT `terms_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assessment_question_order_idx` ON `assessment_questions` (`assessmentId`,`orderIndex`);--> statement-breakpoint
CREATE INDEX `assessment_school_status_idx` ON `assessments` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `assessment_owner_idx` ON `assessments` (`ownerId`);--> statement-breakpoint
CREATE INDEX `assignment_school_status_idx` ON `assignments` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `question_school_type_idx` ON `questions` (`schoolId`,`type`);--> statement-breakpoint
CREATE INDEX `school_membership_user_idx` ON `school_memberships` (`userId`);--> statement-breakpoint
CREATE INDEX `teacher_profile_school_status_idx` ON `teacher_profiles` (`schoolId`,`status`);