-- CreateTable
CREATE TABLE `live_quiz_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessmentId` INTEGER NOT NULL,
    `teacherId` INTEGER NOT NULL,
    `schoolId` INTEGER NOT NULL,
    `sessionCode` VARCHAR(10) NOT NULL,
    `status` ENUM('live_quiz', 'assignment', 'practice') NOT NULL DEFAULT 'live_quiz',
    `startedAt` TIMESTAMP(0) NULL,
    `endedAt` TIMESTAMP(0) NULL,
    `timeLimitMinutes` INTEGER NOT NULL DEFAULT 30,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `live_quiz_sessions_sessionCode_key`(`sessionCode`),
    INDEX `live_quiz_sessions_assessmentId_idx`(`assessmentId`),
    INDEX `live_quiz_sessions_teacherId_idx`(`teacherId`),
    INDEX `live_quiz_sessions_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `studentUserId` INTEGER NULL,
    `joinedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `leftAt` DATETIME(3) NULL,
    `score` INTEGER NULL,
    `correctAnswers` INTEGER NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `session_participants_sessionId_idx`(`sessionId`),
    INDEX `session_participants_userId_idx`(`userId`),
    INDEX `session_participants_studentUserId_users_id_fk`(`studentUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `live_quiz_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `participantId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,
    `selectedOption` INTEGER NULL,
    `answerText` VARCHAR(191) NULL,
    `isCorrect` BOOLEAN NOT NULL DEFAULT false,
    `earnedMarks` INTEGER NOT NULL DEFAULT 0,
    `respondedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `live_quiz_responses_sessionId_idx`(`sessionId`),
    INDEX `live_quiz_responses_participantId_idx`(`participantId`),
    INDEX `live_quiz_responses_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `live_quiz_sessions` ADD CONSTRAINT `live_quiz_sessions_assessmentId_assessments_id_fk` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `live_quiz_sessions` ADD CONSTRAINT `live_quiz_sessions_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `live_quiz_sessions` ADD CONSTRAINT `live_quiz_sessions_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_sessionId_live_quiz_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `live_quiz_sessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `live_quiz_responses` ADD CONSTRAINT `live_quiz_responses_sessionId_live_quiz_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `live_quiz_sessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `live_quiz_responses` ADD CONSTRAINT `live_quiz_responses_participantId_session_participants_id_fk` FOREIGN KEY (`participantId`) REFERENCES `session_participants`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `live_quiz_responses` ADD CONSTRAINT `live_quiz_responses_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
