-- CreateTable
CREATE TABLE `__drizzle_migrations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `hash` TEXT NOT NULL,
    `created_at` BIGINT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `label` VARCHAR(40) NOT NULL,
    `status` ENUM('current', 'upcoming', 'closed') NOT NULL DEFAULT 'current',
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `academic_year_school_label_unique`(`schoolId`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `assessmentId` INTEGER NOT NULL,
    `studentUserId` INTEGER NULL,
    `participantName` VARCHAR(160) NULL,
    `status` ENUM('in_progress', 'submitted', 'graded') NOT NULL DEFAULT 'in_progress',
    `score` INTEGER NULL,
    `totalMarks` INTEGER NOT NULL,
    `percentage` INTEGER NULL,
    `timeTakenSeconds` INTEGER NULL,
    `teacherFeedback` TEXT NULL,
    `startedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `submittedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assessment_attempts_schoolId_schools_id_fk`(`schoolId`),
    INDEX `attempt_assessment_status_idx`(`assessmentId`, `status`),
    INDEX `attempt_student_history_idx`(`studentUserId`, `submittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessmentId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,
    `orderIndex` INTEGER NOT NULL DEFAULT 0,

    INDEX `assessment_question_order_idx`(`assessmentId`, `orderIndex`),
    INDEX `assessment_questions_questionId_questions_id_fk`(`questionId`),
    UNIQUE INDEX `assessment_question_unique`(`assessmentId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attemptId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,
    `answer` LONGTEXT NULL,
    `isCorrect` BOOLEAN NULL,
    `earnedMarks` INTEGER NOT NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assessment_responses_questionId_questions_id_fk`(`questionId`),
    UNIQUE INDEX `attempt_question_unique`(`attemptId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `subject` VARCHAR(100) NOT NULL,
    `gradeLabel` VARCHAR(80) NOT NULL,
    `topic` VARCHAR(140) NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `questionCount` INTEGER NOT NULL DEFAULT 0,
    `totalMarks` INTEGER NOT NULL DEFAULT 0,
    `completionRate` INTEGER NOT NULL DEFAULT 0,
    `averageScore` INTEGER NOT NULL DEFAULT 0,
    `durationMinutes` INTEGER NOT NULL DEFAULT 30,
    `settings` LONGTEXT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assessment_owner_idx`(`ownerId`),
    INDEX `assessment_school_status_idx`(`schoolId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `assessmentId` INTEGER NOT NULL,
    `teacherId` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `classLabel` VARCHAR(120) NOT NULL,
    `status` ENUM('draft', 'scheduled', 'available', 'in_progress', 'submitted', 'completed', 'overdue', 'closed') NOT NULL DEFAULT 'draft',
    `dueAt` DATETIME(0) NULL,
    `submissions` INTEGER NOT NULL DEFAULT 0,
    `totalLearners` INTEGER NOT NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assignment_school_status_idx`(`schoolId`, `status`),
    INDEX `assignments_assessmentId_assessments_id_fk`(`assessmentId`),
    INDEX `assignments_teacherId_users_id_fk`(`teacherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NULL,
    `actorId` INTEGER NULL,
    `action` VARCHAR(120) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` INTEGER NULL,
    `metadata` LONGTEXT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `audit_logs_actorId_users_id_fk`(`actorId`),
    INDEX `audit_logs_schoolId_schools_id_fk`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `gradeId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `section` VARCHAR(20) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `classes_gradeId_grades_id_fk`(`gradeId`),
    UNIQUE INDEX `class_school_name_unique`(`schoolId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `level` INTEGER NOT NULL,
    `curriculum` VARCHAR(120) NOT NULL DEFAULT 'Cambridge',
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `grade_school_level_unique`(`schoolId`, `level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `questionId` INTEGER NOT NULL,
    `label` VARCHAR(10) NOT NULL,
    `text` TEXT NOT NULL,
    `isCorrect` BOOLEAN NOT NULL DEFAULT false,

    INDEX `question_options_questionId_questions_id_fk`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `type` ENUM('mcq', 'multi_select', 'true_false', 'short_answer', 'numeric', 'fill_blank') NOT NULL,
    `prompt` TEXT NOT NULL,
    `marks` INTEGER NOT NULL DEFAULT 1,
    `explanation` TEXT NULL,
    `answerKey` LONGTEXT NULL,
    `settings` LONGTEXT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `question_school_type_idx`(`schoolId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `school_memberships` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `role` ENUM('admin', 'teacher', 'student') NOT NULL,
    `status` ENUM('active', 'pending', 'suspended', 'deactivated') NOT NULL DEFAULT 'active',
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `school_membership_user_idx`(`userId`),
    UNIQUE INDEX `school_membership_school_user_unique`(`schoolId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schools` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(180) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `tenantKey` VARCHAR(100) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `schools_slug_unique`(`slug`),
    UNIQUE INDEX `schools_tenantKey_unique`(`tenantKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `department` VARCHAR(100) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `subject_school_code_unique`(`schoolId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `subjectsSummary` VARCHAR(240) NULL,
    `gradesSummary` VARCHAR(120) NULL,
    `status` ENUM('pending_email', 'pending_approval', 'approved', 'rejected', 'suspended', 'deactivated') NOT NULL DEFAULT 'pending_approval',
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `teacher_profile_school_status_idx`(`schoolId`, `status`),
    INDEX `teacher_profiles_userId_users_id_fk`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolId` INTEGER NOT NULL,
    `academicYearId` INTEGER NOT NULL,
    `label` VARCHAR(80) NOT NULL,
    `startsOn` VARCHAR(20) NULL,
    `endsOn` VARCHAR(20) NULL,

    INDEX `terms_academicYearId_academic_years_id_fk`(`academicYearId`),
    INDEX `terms_schoolId_schools_id_fk`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `openId` VARCHAR(64) NOT NULL,
    `name` TEXT NULL,
    `email` VARCHAR(320) NULL,
    `loginMethod` VARCHAR(64) NULL,
    `role` ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'teacher',
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `lastSignedIn` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `passwordHash` VARCHAR(255) NULL,
    `accountStatus` ENUM('active', 'pending_verification', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `users_openId_unique`(`openId`),
    UNIQUE INDEX `users_email_unique`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `academic_years` ADD CONSTRAINT `academic_years_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_assessmentId_assessments_id_fk` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessment_questions` ADD CONSTRAINT `assessment_questions_assessmentId_assessments_id_fk` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessment_questions` ADD CONSTRAINT `assessment_questions_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessment_responses` ADD CONSTRAINT `assessment_responses_attemptId_assessment_attempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `assessment_attempts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessment_responses` ADD CONSTRAINT `assessment_responses_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_assessmentId_assessments_id_fk` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_gradeId_grades_id_fk` FOREIGN KEY (`gradeId`) REFERENCES `grades`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `grades` ADD CONSTRAINT `grades_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `school_memberships` ADD CONSTRAINT `school_memberships_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `school_memberships` ADD CONSTRAINT `school_memberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `teacher_profiles` ADD CONSTRAINT `teacher_profiles_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `teacher_profiles` ADD CONSTRAINT `teacher_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `terms` ADD CONSTRAINT `terms_academicYearId_academic_years_id_fk` FOREIGN KEY (`academicYearId`) REFERENCES `academic_years`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `terms` ADD CONSTRAINT `terms_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
