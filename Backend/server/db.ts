import { createHash } from "node:crypto";
import { Prisma, PrismaClient, type users } from "@prisma/client";
import { ENV } from "./_core/env";
import { hashPassword, verifyPassword } from "./_core/password";

export type User = users;
export type UserRole = "admin" | "teacher" | "student";

type InsertUser = Pick<users, "openId"> &
  Partial<Pick<users, "name" | "email" | "loginMethod" | "lastSignedIn" | "role">>;
type UserLike = { id: number; role: UserRole };

let prisma: PrismaClient | null = null;
const DUMMY_PASSWORD_HASH = hashPassword("not-a-real-account-password");

export async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  prisma ??= new PrismaClient();
  return prisma;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const create: Prisma.usersCreateInput = { openId: user.openId };
  const update: Prisma.usersUpdateInput = {};
  if (user.name !== undefined) {
    create.name = user.name;
    update.name = user.name;
  }
  if (user.email !== undefined) {
    create.email = user.email;
    update.email = user.email;
  }
  if (user.loginMethod !== undefined) {
    create.loginMethod = user.loginMethod;
    update.loginMethod = user.loginMethod;
  }
  if (user.lastSignedIn !== undefined) {
    create.lastSignedIn = user.lastSignedIn;
    update.lastSignedIn = user.lastSignedIn;
  } else {
    create.lastSignedIn = new Date();
    update.lastSignedIn = new Date();
  }
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : undefined);
  if (role !== undefined) {
    create.role = role;
    update.role = role;
  }
  await db.users.upsert({ where: { openId: user.openId }, create, update });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.users.findUnique({ where: { openId } })) ?? undefined;
}

async function ensureSeedData(db: PrismaClient, user: UserLike) {
  let school = await db.schools.findFirst();
  if (!school) {
    school = await db.schools.create({
      data: {
        name: "Excel International Academy",
        slug: "excel-international-academy",
        tenantKey: "excel-ia-primary",
      },
    });
  }
  const membership = await db.school_memberships.findUnique({
    where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
  });
  if (!membership) {
    await db.school_memberships.create({
      data: { schoolId: school.id, userId: user.id, role: user.role, status: "active" },
    });
  }
  return school;
}

function assessmentScope(user: UserLike, schoolId: number): Prisma.assessmentsWhereInput {
  return user.role === "admin"
    ? { schoolId }
    : { schoolId, ownerId: user.id };
}

function assignmentScope(user: UserLike, schoolId: number): Prisma.assignmentsWhereInput {
  return user.role === "admin"
    ? { schoolId }
    : { schoolId, teacherId: user.id };
}

function serializeMetadata(metadata: unknown): string {
  return JSON.stringify(metadata);
}

export async function getWorkspaceOverview(user: UserLike) {
  const db = await getDb();
  if (!db) return null;
  if (user.role === "student") throw new Error("Student accounts cannot access staff workspace data");
  const school = await ensureSeedData(db, user);
  const assessmentsWhere = assessmentScope(user, school.id);
  const assignmentsWhere = assignmentScope(user, school.id);

  const [
    assessmentRows,
    assignmentRows,
    gradeCount,
    subjectCount,
    classCount,
    publishedCount,
    draftCount,
    assignmentCount,
  ] = await Promise.all([
    db.assessments.findMany({
      where: assessmentsWhere,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    db.assignments.findMany({
      where: assignmentsWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.grades.count({ where: { schoolId: school.id } }),
    db.subjects.count({ where: { schoolId: school.id } }),
    db.classes.count({ where: { schoolId: school.id } }),
    db.assessments.count({ where: { ...assessmentsWhere, status: "published" } }),
    db.assessments.count({ where: { ...assessmentsWhere, status: "draft" } }),
    db.assignments.count({ where: assignmentsWhere }),
  ]);
  const accountRoleCounts = user.role === "admin"
    ? await db.school_memberships.groupBy({
        by: ["role"],
        where: { schoolId: school.id },
        _count: { _all: true },
      })
    : [];
  const accountCounts: Record<UserRole, number> = { admin: 0, teacher: 0, student: 0 };
  for (const row of accountRoleCounts) {
    accountCounts[row.role] = row._count._all;
  }

  return {
    school,
    metrics: {
      published: publishedCount,
      drafts: draftCount,
      assignments: assignmentCount,
      grades: gradeCount,
      subjects: subjectCount,
      classes: classCount,
      totalUsers: accountCounts.admin + accountCounts.teacher + accountCounts.student,
      admins: accountCounts.admin,
      teachers: accountCounts.teacher,
      students: accountCounts.student,
    },
    assessments: assessmentRows,
    assignments: assignmentRows,
  };
}

export async function listAssessments(user: UserLike) {
  const db = await getDb();
  if (!db) return [];
  if (user.role === "student") throw new Error("Student accounts cannot access staff assessment lists");
  const school = await ensureSeedData(db, user);
  return db.assessments.findMany({
    where: assessmentScope(user, school.id),
    orderBy: { updatedAt: "desc" },
  });
}

export async function listPublishedAssessments(user: UserLike) {
  if (user.role !== "student") throw new Error("Student account required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);
  return db.assessments.findMany({
    where: { schoolId: school.id, status: "published" },
    select: {
      id: true,
      title: true,
      description: true,
      subject: true,
      gradeLabel: true,
      topic: true,
      durationMinutes: true,
      totalMarks: true,
      questionCount: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPublishedAssessmentForStudent(user: UserLike, assessmentId: number) {
  if (user.role !== "student") throw new Error("Student account required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);
  const assessment = await db.assessments.findFirst({
    where: { id: assessmentId, schoolId: school.id, status: "published" },
    include: {
      assessment_questions: {
        orderBy: { orderIndex: "asc" },
        include: { questions: { include: { question_options: { orderBy: { id: "asc" } } } } },
      },
    },
  });
  if (!assessment) throw new Error("Published assessment was not found");
  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    subject: assessment.subject,
    gradeLabel: assessment.gradeLabel,
    durationMinutes: assessment.durationMinutes,
    totalMarks: assessment.totalMarks,
    questions: assessment.assessment_questions.map(({ questions, orderIndex }) => ({
      id: questions.id,
      orderIndex,
      type: questions.type,
      prompt: questions.prompt,
      marks: questions.marks,
      timeLimitSeconds: (() => {
        try {
          return JSON.parse(questions.settings ?? "{}").timeLimitSeconds ?? 30;
        } catch {
          return 30;
        }
      })(),
      options: questions.question_options.map(option => ({
        id: option.id,
        label: option.label,
        text: option.text,
      })),
    })),
  };
}

export async function startAssessmentAttempt(user: UserLike, assessmentId: number) {
  if (user.role !== "student") throw new Error("Student account required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);
  const assessment = await db.assessments.findFirst({
    where: { id: assessmentId, schoolId: school.id, status: "published" },
  });
  if (!assessment) throw new Error("Published assessment was not found");
  const inProgress = await db.assessment_attempts.findFirst({
    where: { schoolId: school.id, assessmentId, studentUserId: user.id, status: "in_progress" },
    orderBy: { startedAt: "desc" },
  });
  if (inProgress) return { attemptId: inProgress.id, startedAt: inProgress.startedAt };
  const attempt = await db.assessment_attempts.create({
    data: {
      schoolId: school.id,
      assessmentId,
      studentUserId: user.id,
      status: "in_progress",
      totalMarks: assessment.totalMarks,
    },
  });
  return { attemptId: attempt.id, startedAt: attempt.startedAt };
}

export async function saveAssessmentResponse(user: UserLike, attemptId: number, questionId: number, answer: unknown) {
  if (user.role !== "student") throw new Error("Student account required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const attempt = await db.assessment_attempts.findFirst({
    where: { id: attemptId, studentUserId: user.id, status: "in_progress" },
  });
  if (!attempt) throw new Error("Active attempt was not found");
  const belongs = await db.assessment_questions.findFirst({
    where: { assessmentId: attempt.assessmentId, questionId },
  });
  if (!belongs) throw new Error("Question was not found in this assessment");
  await db.assessment_responses.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, answer: JSON.stringify(answer) },
    update: { answer: JSON.stringify(answer), updatedAt: new Date() },
  });
  return { success: true };
}

export async function submitAssessmentAttempt(user: UserLike, attemptId: number) {
  if (user.role !== "student") throw new Error("Student account required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const attempt = await db.assessment_attempts.findFirst({
    where: { id: attemptId, studentUserId: user.id, status: "in_progress" },
    include: {
      assessment_responses: true,
      assessments: {
        include: {
          assessment_questions: {
            orderBy: { orderIndex: "asc" },
            include: { questions: { include: { question_options: true } } },
          },
        },
      },
    },
  });
  if (!attempt) throw new Error("Active attempt was not found");

  let earned = 0;
  for (const link of attempt.assessments.assessment_questions) {
    const question = link.questions;
    const response = attempt.assessment_responses.find(row => row.questionId === question.id);
    let isCorrect = false;
    if (response?.answer) {
      try {
        const parsed = JSON.parse(response.answer);
        if (question.type === "mcq" || question.type === "true_false") {
          isCorrect = question.question_options.some(option => option.id === parsed.optionId && option.isCorrect);
        } else if (question.type === "multi_select") {
          const selectedIds = Array.isArray(parsed.optionIds) ? parsed.optionIds : [];
          const correctIds = question.question_options.filter(option => option.isCorrect).map(option => option.id);
          isCorrect = correctIds.length === selectedIds.length && correctIds.every(id => selectedIds.includes(id));
        }
      } catch {
        isCorrect = false;
      }
    }
    const marks = isCorrect ? question.marks : 0;
    earned += marks;
    if (response) {
      await db.assessment_responses.update({
        where: { id: response.id },
        data: { isCorrect, earnedMarks: marks },
      });
    }
  }

  const submittedAt = new Date();
  const percentage = attempt.totalMarks > 0 ? Math.round(earned * 100 / attempt.totalMarks) : 0;
  await db.assessment_attempts.update({
    where: { id: attemptId },
    data: {
      status: "graded",
      score: earned,
      percentage,
      submittedAt,
      timeTakenSeconds: Math.max(0, Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
    },
  });
  return { attemptId, score: earned, totalMarks: attempt.totalMarks, percentage };
}

export async function createAssessment(
  user: UserLike,
  input: {
    title: string;
    subject: string;
    gradeLabel: string;
    questionType: "mcq" | "multi_select" | "true_false" | "short_answer" | "numeric" | "fill_blank";
    prompt: string;
    marks: number;
    durationMinutes: number;
  },
) {
  if (user.role === "student") throw new Error("Student accounts cannot create assessments");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);
  return db.$transaction(async tx => {
    const assessment = await tx.assessments.create({
      data: {
        schoolId: school.id,
        ownerId: user.id,
        title: input.title,
        subject: input.subject,
        gradeLabel: input.gradeLabel,
        status: "draft",
        questionCount: 1,
        totalMarks: input.marks,
        durationMinutes: input.durationMinutes,
        topic: "New assessment",
      },
    });
    const question = await tx.questions.create({
      data: {
        schoolId: school.id,
        type: input.questionType,
        prompt: input.prompt,
        marks: input.marks,
        answerKey: "{}",
      },
    });
    await tx.assessment_questions.create({
      data: { assessmentId: assessment.id, questionId: question.id, orderIndex: 1 },
    });
    return assessment;
  });
}

export async function updateAssessmentStatus(
  user: UserLike,
  assessmentId: number,
  status: "draft" | "published" | "archived",
) {
  if (user.role === "student") throw new Error("Student accounts cannot manage assessments");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);
  const where: Prisma.assessmentsWhereInput = {
    id: assessmentId,
    ...assessmentScope(user, school.id),
  };
  const updated = await db.assessments.updateMany({
    where,
    data: { status, updatedAt: new Date() },
  });
  if (updated.count === 0) return undefined;
  return db.assessments.findFirst({ where });
}

/**
 * Save a complete assessment with all of its questions in one transaction.
 * Used by the assessment editor to save all questions atomically.
 */
export async function saveFullAssessment(
  user: UserLike,
  input: {
    title: string;
    description?: string;
    subject?: string;
    gradeLabel?: string;
    status?: "draft" | "published" | "archived";
    durationMinutes?: number;
    questions: {
      type: "mcq" | "multi_select" | "true_false" | "short_answer" | "numeric" | "fill_blank";
      prompt: string;
      marks?: number;
      timeLimitSeconds?: number;
      options?: { text: string; isCorrect: boolean }[];
    }[];
  }
) {
  if (user.role === "student") throw new Error("Student accounts cannot create assessments");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);

  const totalMarks = input.questions.reduce((sum, q) => sum + (q.marks ?? 1), 0);
  const durationMinutes = input.durationMinutes ?? Math.max(1, Math.ceil(
    input.questions.reduce((sum, q) => sum + (q.timeLimitSeconds ?? 20), 0) / 60
  ));

  return db.$transaction(async tx => {
    const assessment = await tx.assessments.create({
      data: {
        schoolId: school.id,
        ownerId: user.id,
        title: input.title,
        description: input.description,
        subject: input.subject ?? "General",
        gradeLabel: input.gradeLabel ?? "General",
        status: input.status ?? "draft",
        questionCount: input.questions.length,
        totalMarks,
        durationMinutes,
        topic: "Quiz",
        settings: JSON.stringify({ source: "quiz-editor" }),
      },
    });

    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i];
      const question = await tx.questions.create({
        data: {
          schoolId: school.id,
          type: q.type,
          prompt: q.prompt,
          marks: q.marks ?? 1,
          settings: JSON.stringify({ timeLimitSeconds: q.timeLimitSeconds ?? 20 }),
        },
      });
      await tx.assessment_questions.create({
        data: { assessmentId: assessment.id, questionId: question.id, orderIndex: i },
      });
      if (q.options && q.options.length > 0) {
        for (let oi = 0; oi < q.options.length; oi++) {
          const opt = q.options[oi];
          await tx.question_options.create({
            data: {
              questionId: question.id,
              label: String.fromCharCode(65 + oi),
              text: opt.text,
              isCorrect: opt.isCorrect,
            },
          });
        }
      }
    }

    await tx.audit_logs.create({
      data: {
        schoolId: school.id,
        actorId: user.id,
        action: "assessment.created",
        entityType: "assessment",
        entityId: assessment.id,
        metadata: serializeMetadata({ questionCount: input.questions.length, source: "quiz-editor" }),
      },
    });

    return { id: assessment.id, title: assessment.title, questionCount: input.questions.length };
  });
}

export async function getAnalyticsOverview(user: UserLike) {
  const db = await getDb();
  if (!db) return null;
  if (user.role === "student") throw new Error("Student accounts cannot access school analytics");
  const school = await ensureSeedData(db, user);
  const rows = await db.assessments.groupBy({
    by: ["subject"],
    where: { ...assessmentScope(user, school.id), status: "published" },
    _avg: { averageScore: true, completionRate: true },
    orderBy: { _avg: { averageScore: "desc" } },
  });
  return {
    school,
    bySubject: rows.map(row => ({
      subject: row.subject,
      average: Math.round(Number(row._avg.averageScore ?? 0)),
      completion: Math.round(Number(row._avg.completionRate ?? 0)),
    })),
  };
}

export async function getLocalUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const normalizedEmail = email.trim().toLowerCase();
  return (await db.users.findUnique({ where: { email: normalizedEmail } })) ?? undefined;
}

export async function authenticateLocalUser(email: string, password: string) {
  const user = await getLocalUserByEmail(email);
  if (!user?.passwordHash) {
    verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }
  if (!verifyPassword(password, user.passwordHash) || user.accountStatus !== "active") return null;

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const signedInAt = new Date();
  await db.users.update({ where: { id: user.id }, data: { lastSignedIn: signedInAt } });
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function createLocalAccount(
  actor: UserLike,
  input: { name: string; email: string; role: UserRole; password: string },
) {
  if (actor.role !== "admin") throw new Error("Only Admin users can create accounts");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const email = input.email.trim().toLowerCase();
  if (await db.users.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error("An account with this email already exists");
  }
  const school = await ensureSeedData(db, actor);
  const openId = `local_${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
  return db.$transaction(async tx => {
    const created = await tx.users.create({
      data: {
        openId,
        name: input.name.trim(),
        email,
        passwordHash: hashPassword(input.password),
        loginMethod: "local",
        role: input.role,
        accountStatus: "active",
        mustChangePassword: true,
      },
    });
    await tx.school_memberships.create({
      data: { schoolId: school.id, userId: created.id, role: input.role, status: "active" },
    });
    await tx.audit_logs.create({
      data: {
        schoolId: school.id,
        actorId: actor.id,
        action: "account.created",
        entityType: "user",
        entityId: created.id,
        metadata: serializeMetadata({ role: input.role }),
      },
    });
    return {
      id: created.id,
      name: input.name.trim(),
      email,
      role: input.role,
      accountStatus: "active" as const,
    };
  });
}

export async function listManagedAccounts(actor: UserLike) {
  if (actor.role !== "admin") throw new Error("Only Admin users can manage accounts");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, actor);
  return db.users.findMany({
    where: { school_memberships: { some: { schoolId: school.id } } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountStatus: true,
      createdAt: true,
      lastSignedIn: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateManagedAccount(
  actor: UserLike,
  targetUserId: number,
  role: UserRole,
  status: "active" | "inactive" | "suspended",
) {
  if (actor.role !== "admin") throw new Error("Only Admin users can manage accounts");
  if (actor.id === targetUserId && (role !== "admin" || status !== "active")) {
    throw new Error("You cannot remove your own Admin access or deactivate your own account");
  }
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, actor);
  const target = await db.school_memberships.findUnique({
    where: { schoolId_userId: { schoolId: school.id, userId: targetUserId } },
    select: { id: true },
  });
  if (!target) throw new Error("Account was not found");
  await db.$transaction(async tx => {
    await tx.users.update({ where: { id: targetUserId }, data: { role, accountStatus: status } });
    await tx.school_memberships.update({
      where: { schoolId_userId: { schoolId: school.id, userId: targetUserId } },
      data: {
        role,
        status: status === "active" ? "active" : status === "suspended" ? "suspended" : "deactivated",
      },
    });
    await tx.audit_logs.create({
      data: {
        schoolId: school.id,
        actorId: actor.id,
        action: "account.updated",
        entityType: "user",
        entityId: targetUserId,
        metadata: serializeMetadata({ role, status }),
      },
    });
  });
  return { success: true };
}

export async function resetManagedAccountPassword(actor: UserLike, targetUserId: number, password: string) {
  if (actor.role !== "admin") throw new Error("Only Admin users can reset passwords");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, actor);
  const target = await db.school_memberships.findUnique({
    where: { schoolId_userId: { schoolId: school.id, userId: targetUserId } },
    select: { id: true },
  });
  if (!target) throw new Error("Account was not found");
  await db.$transaction(async tx => {
    await tx.users.update({
      where: { id: targetUserId },
      data: { passwordHash: hashPassword(password), mustChangePassword: true },
    });
    await tx.audit_logs.create({
      data: {
        schoolId: school.id,
        actorId: actor.id,
        action: "account.password_reset",
        entityType: "user",
        entityId: targetUserId,
      },
    });
  });
  return { success: true };
}

export async function changeLocalPasswordWithCurrent(userId: number, currentPassword: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const user = await db.users.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect");
  }
  const membership = await db.school_memberships.findFirst({
    where: { userId },
    select: { schoolId: true },
  });
  await db.$transaction(async tx => {
    await tx.users.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
    });
    await tx.audit_logs.create({
      data: {
        schoolId: membership?.schoolId ?? null,
        actorId: userId,
        action: "account.password_changed",
        entityType: "user",
        entityId: userId,
      },
    });
  });
  return { success: true };
}

export async function getStudentAssessmentHistory(user: UserLike) {
  if (user.role !== "student") throw new Error("Student account required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);
  const attempts = await db.assessment_attempts.findMany({
    where: { schoolId: school.id, studentUserId: user.id, submittedAt: { not: null } },
    select: {
      id: true,
      assessmentId: true,
      status: true,
      score: true,
      totalMarks: true,
      percentage: true,
      timeTakenSeconds: true,
      teacherFeedback: true,
      submittedAt: true,
      assessments: { select: { title: true, subject: true, topic: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
  return attempts.map(({ assessments, ...attempt }) => ({
    attemptId: attempt.id,
    assessmentId: attempt.assessmentId,
    title: assessments.title,
    subject: assessments.subject,
    topic: assessments.topic,
    status: attempt.status,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    timeTakenSeconds: attempt.timeTakenSeconds,
    teacherFeedback: attempt.teacherFeedback,
    completedAt: attempt.submittedAt,
  }));
}

export async function associateHistoricalAttempt(actor: UserLike, attemptId: number, studentUserId: number) {
  if (actor.role !== "admin" && actor.role !== "teacher") throw new Error("Admin or Teacher access required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, actor);
  const targetStudent = await db.school_memberships.findFirst({
    where: {
      schoolId: school.id,
      userId: studentUserId,
      role: "student",
      users: { is: { role: "student", accountStatus: "active" } },
    },
    select: { id: true },
  });
  if (!targetStudent) throw new Error("Active student account was not found");

  const attempt = await db.assessment_attempts.findFirst({
    where: { id: attemptId, schoolId: school.id },
    select: { id: true, assessments: { select: { ownerId: true } } },
  });
  if (!attempt) throw new Error("Assessment attempt was not found");
  if (actor.role === "teacher" && attempt.assessments.ownerId !== actor.id) {
    throw new Error("Teachers can only associate attempts for their own assessments");
  }
  await db.$transaction(async tx => {
    await tx.assessment_attempts.update({ where: { id: attemptId }, data: { studentUserId } });
    await tx.audit_logs.create({
      data: {
        schoolId: school.id,
        actorId: actor.id,
        action: "assessment_attempt.associated",
        entityType: "assessment_attempt",
        entityId: attemptId,
        metadata: serializeMetadata({ studentUserId }),
      },
    });
  });
  return { success: true };
}

export async function recordHistoricalAttempt(
  actor: UserLike,
  input: {
    assessmentId: number;
    studentUserId?: number;
    participantName?: string;
    score: number;
    timeTakenSeconds?: number;
    teacherFeedback?: string;
    submittedAt: Date;
  },
) {
  if (actor.role !== "admin" && actor.role !== "teacher") throw new Error("Admin or Teacher access required");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, actor);
  const assessment = await db.assessments.findFirst({
    where: { id: input.assessmentId, schoolId: school.id },
  });
  if (!assessment) throw new Error("Assessment was not found");
  if (actor.role === "teacher" && assessment.ownerId !== actor.id) {
    throw new Error("Teachers can only add history for their own assessments");
  }
  if (assessment.totalMarks < 1 || input.score > assessment.totalMarks) {
    throw new Error("Score must be within the assessment mark range");
  }
  if (!input.studentUserId && !input.participantName?.trim()) {
    throw new Error("Provide a student account or participant name");
  }
  if (input.studentUserId) {
    const target = await db.school_memberships.findFirst({
      where: {
        schoolId: school.id,
        userId: input.studentUserId,
        role: "student",
        users: { is: { role: "student", accountStatus: "active" } },
      },
      select: { id: true },
    });
    if (!target) throw new Error("Active student account was not found");
  }

  const percentage = Math.round(input.score * 100 / assessment.totalMarks);
  return db.$transaction(async tx => {
    const created = await tx.assessment_attempts.create({
      data: {
        schoolId: school.id,
        assessmentId: assessment.id,
        studentUserId: input.studentUserId ?? null,
        participantName: input.participantName?.trim() || null,
        status: "graded",
        score: input.score,
        totalMarks: assessment.totalMarks,
        percentage,
        timeTakenSeconds: input.timeTakenSeconds ?? null,
        teacherFeedback: input.teacherFeedback?.trim() || null,
        startedAt: input.submittedAt,
        submittedAt: input.submittedAt,
      },
    });
    await tx.audit_logs.create({
      data: {
        schoolId: school.id,
        actorId: actor.id,
        action: "assessment_attempt.recorded",
        entityType: "assessment_attempt",
        entityId: created.id,
        metadata: serializeMetadata({
          assessmentId: assessment.id,
          studentUserId: input.studentUserId ?? null,
        }),
      },
    });
    return { id: created.id, percentage };
  });
}

// ===== LIVE QUIZ SESSION JOIN (Kahoot-style PIN entry) =====

/** Look up a live quiz session by its public game PIN (used by the join page). */
export async function getLiveQuizSessionByCode(sessionCode: string) {
  const db = await getDb();
  if (!db) return null;
  const session = await db.live_quiz_sessions.findFirst({
    where: { sessionCode: sessionCode.trim().toUpperCase() },
    include: {
      assessment: { select: { id: true, title: true, subject: true, durationMinutes: true } },
    },
  });
  if (!session) return null;
  return {
    sessionId: session.id,
    code: session.sessionCode,
    title: session.assessment.title,
    subject: session.assessment.subject,
    durationMinutes: session.assessment.durationMinutes,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

/** Join a live quiz session as an authenticated student or by nickname. */
export async function joinLiveQuizSession(input: {
  sessionCode: string;
  participantName?: string;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const session = await db.live_quiz_sessions.findFirst({
    where: { sessionCode: input.sessionCode.trim().toUpperCase() },
  });
  if (!session) throw new Error("Quiz session not found");
  if (session.endedAt) throw new Error("This quiz session has ended");

  // Prevent duplicate joins for an authenticated user
  if (input.userId) {
    const existing = await db.session_participants.findFirst({
      where: { sessionId: session.id, userId: input.userId },
    });
    if (existing) return { participantId: existing.id, sessionId: session.id, rejoined: true };
  }

  const participant = await db.session_participants.create({
    data: {
      sessionId: session.id,
      userId: input.userId ?? 0,
      studentUserId: input.userId ?? null,
      joinedAt: new Date(),
    },
  });
  return { participantId: participant.id, sessionId: session.id, rejoined: false };
}
