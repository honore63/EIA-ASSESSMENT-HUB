import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "teacher", "student"]).default("teacher").notNull(),
  accountStatus: mysqlEnum("accountStatus", ["active", "pending_verification", "inactive", "suspended"]).default("active").notNull(),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  tenantKey: varchar("tenantKey", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const schoolMemberships = mysqlTable(
  "school_memberships",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    userId: int("userId").notNull().references(() => users.id),
    role: mysqlEnum("role", ["admin", "teacher", "student"]).notNull(),
    status: mysqlEnum("status", ["active", "pending", "suspended", "deactivated"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    schoolUserUnique: uniqueIndex("school_membership_school_user_unique").on(table.schoolId, table.userId),
    userIndex: index("school_membership_user_idx").on(table.userId),
  }),
);

export const academicYears = mysqlTable(
  "academic_years",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    label: varchar("label", { length: 40 }).notNull(),
    status: mysqlEnum("status", ["current", "upcoming", "closed"]).default("current").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    schoolYearUnique: uniqueIndex("academic_year_school_label_unique").on(table.schoolId, table.label),
  }),
);

export const terms = mysqlTable("terms", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  academicYearId: int("academicYearId").notNull().references(() => academicYears.id),
  label: varchar("label", { length: 80 }).notNull(),
  startsOn: varchar("startsOn", { length: 20 }),
  endsOn: varchar("endsOn", { length: 20 }),
});

export const grades = mysqlTable(
  "grades",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    name: varchar("name", { length: 80 }).notNull(),
    level: int("level").notNull(),
    curriculum: varchar("curriculum", { length: 120 }).default("Cambridge").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    schoolLevelUnique: uniqueIndex("grade_school_level_unique").on(table.schoolId, table.level),
  }),
);

export const classes = mysqlTable(
  "classes",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    gradeId: int("gradeId").notNull().references(() => grades.id),
    name: varchar("name", { length: 100 }).notNull(),
    section: varchar("section", { length: 20 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    schoolClassUnique: uniqueIndex("class_school_name_unique").on(table.schoolId, table.name),
  }),
);

export const subjects = mysqlTable(
  "subjects",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    department: varchar("department", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    subjectSchoolCodeUnique: uniqueIndex("subject_school_code_unique").on(table.schoolId, table.code),
  }),
);

export const teacherProfiles = mysqlTable(
  "teacher_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    userId: int("userId").references(() => users.id),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    subjectsSummary: varchar("subjectsSummary", { length: 240 }),
    gradesSummary: varchar("gradesSummary", { length: 120 }),
    status: mysqlEnum("status", ["pending_email", "pending_approval", "approved", "rejected", "suspended", "deactivated"]).default("pending_approval").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    schoolStatusIndex: index("teacher_profile_school_status_idx").on(table.schoolId, table.status),
  }),
);

export const assessments = mysqlTable(
  "assessments",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    ownerId: int("ownerId").notNull().references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    subject: varchar("subject", { length: 100 }).notNull(),
    gradeLabel: varchar("gradeLabel", { length: 80 }).notNull(),
    topic: varchar("topic", { length: 140 }),
    status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
    questionCount: int("questionCount").default(0).notNull(),
    totalMarks: int("totalMarks").default(0).notNull(),
    completionRate: int("completionRate").default(0).notNull(),
    averageScore: int("averageScore").default(0).notNull(),
    durationMinutes: int("durationMinutes").default(30).notNull(),
    settings: json("settings"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    schoolStatusIndex: index("assessment_school_status_idx").on(table.schoolId, table.status),
    ownerIndex: index("assessment_owner_idx").on(table.ownerId),
  }),
);

export const questions = mysqlTable(
  "questions",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    type: mysqlEnum("type", ["mcq", "multi_select", "true_false", "short_answer", "numeric", "fill_blank"]).notNull(),
    prompt: text("prompt").notNull(),
    marks: int("marks").default(1).notNull(),
    explanation: text("explanation"),
    answerKey: json("answerKey"),
    settings: json("settings"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    questionSchoolTypeIndex: index("question_school_type_idx").on(table.schoolId, table.type),
  }),
);

export const questionOptions = mysqlTable("question_options", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull().references(() => questions.id),
  label: varchar("label", { length: 10 }).notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("isCorrect").default(false).notNull(),
});

export const assessmentQuestions = mysqlTable(
  "assessment_questions",
  {
    id: int("id").autoincrement().primaryKey(),
    assessmentId: int("assessmentId").notNull().references(() => assessments.id),
    questionId: int("questionId").notNull().references(() => questions.id),
    orderIndex: int("orderIndex").default(0).notNull(),
  },
  table => ({
    assessmentQuestionUnique: uniqueIndex("assessment_question_unique").on(table.assessmentId, table.questionId),
    assessmentOrderIndex: index("assessment_question_order_idx").on(table.assessmentId, table.orderIndex),
  }),
);

export const assessmentAttempts = mysqlTable(
  "assessment_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    assessmentId: int("assessmentId").notNull().references(() => assessments.id),
    studentUserId: int("studentUserId").references(() => users.id, { onDelete: "set null" }),
    participantName: varchar("participantName", { length: 160 }),
    status: mysqlEnum("status", ["in_progress", "submitted", "graded"]).default("in_progress").notNull(),
    score: int("score"),
    totalMarks: int("totalMarks").notNull(),
    percentage: int("percentage"),
    timeTakenSeconds: int("timeTakenSeconds"),
    teacherFeedback: text("teacherFeedback"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    submittedAt: timestamp("submittedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    studentHistoryIndex: index("attempt_student_history_idx").on(table.studentUserId, table.submittedAt),
    assessmentStatusIndex: index("attempt_assessment_status_idx").on(table.assessmentId, table.status),
  }),
);

export const assessmentResponses = mysqlTable(
  "assessment_responses",
  {
    id: int("id").autoincrement().primaryKey(),
    attemptId: int("attemptId").notNull().references(() => assessmentAttempts.id, { onDelete: "cascade" }),
    questionId: int("questionId").notNull().references(() => questions.id),
    answer: json("answer"),
    isCorrect: boolean("isCorrect"),
    earnedMarks: int("earnedMarks").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    attemptQuestionUnique: uniqueIndex("attempt_question_unique").on(table.attemptId, table.questionId),
  }),
);

export const assignments = mysqlTable(
  "assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull().references(() => schools.id),
    assessmentId: int("assessmentId").notNull().references(() => assessments.id),
    teacherId: int("teacherId").notNull().references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    classLabel: varchar("classLabel", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["draft", "scheduled", "available", "in_progress", "submitted", "completed", "overdue", "closed"]).default("draft").notNull(),
    dueAt: datetime("dueAt"),
    submissions: int("submissions").default(0).notNull(),
    totalLearners: int("totalLearners").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    assignmentSchoolStatusIndex: index("assignment_school_status_idx").on(table.schoolId, table.status),
  }),
);

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").references(() => schools.id),
  actorId: int("actorId").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserRole = "admin" | "teacher" | "student";
export type School = typeof schools.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type TeacherProfile = typeof teacherProfiles.$inferSelect;
