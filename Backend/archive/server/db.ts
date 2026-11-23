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

// ===== WORKSPACE OVERVIEW =====

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

export async function listAssessmentsBySchool(
  schoolId: number,
  status?: string,
  ownerId?: number
) {
  const db = await getDb();
  if (!db) return [];
  const where: Prisma.assessmentsWhereInput = { schoolId };
  if (status) where.status = status as any;
  if (ownerId && ownerId !== 0) where.ownerId = ownerId;
  return db.assessments.findMany({ where, orderBy: { updatedAt: "desc" } });
}

// ===== ASSESSMENT CREATION & MANAGEMENT =====

export async function createAssessment(
  user: UserLike,
  input: {
    title: string;
    subject: string;
    gradeLabel: string;
    topic?: string;
    questionType: "mcq" | "multi_select" | "true_false" | "short_answer" | "numeric" | "fill_blank" | "matching" | "image_based";
    prompt: string;
    marks: number;
    durationMinutes: number;
    classId?: number;
  }
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
        topic: input.topic,
        status: "draft",
        questionCount: 0,
        totalMarks: input.marks,
        durationMinutes: input.durationMinutes,
        settings: JSON.stringify({}),
      },
    });
    const question = await tx.questions.create({
      data: {
        schoolId: school.id,
        type: input.questionType,
        prompt: input.prompt,
        marks: input.marks,
        answerKey: "{}",
        settings: JSON.stringify({}),
      },
    });
    await tx.assessment_questions.create({
      data: { assessmentId: assessment.id, questionId: question.id, orderIndex: 1 },
    });
    return assessment;
  });
}

export async function batchCreateQuestions(
  assessmentId: number,
  questions: {
    type: "mcq" | "multi_select" | "true_false" | "short_answer" | "numeric" | "fill_blank" | "matching" | "image_based";
    prompt: string;
    marks?: number;
    explanation?: string;
    answerKey?: string;
    options?: { label: string; text: string; isCorrect: boolean }[];
    settings?: unknown;
  }[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.$transaction(async tx => {
    const createdQuestions: number[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const question = await tx.questions.create({
        data: {
          schoolId: schoolId,
          type: q.type,
          prompt: q.prompt,
          marks: q.marks ?? 1,
          explanation: q.explanation,
          answerKey: q.answerKey,
          settings: q.settings !== undefined ? JSON.stringify(q.settings) : JSON.stringify({}),
        },
      });
      await tx.assessment_questions.create({
        data: { assessmentId, questionId: question.id, orderIndex: i },
      });
      // Create options for MCQ, multi_select, true_false
      if (q.options && q.options.length > 0) {
        for (const opt of q.options) {
          await tx.question_options.create({
            data: { questionId: question.id, label: opt.label, text: opt.text, isCorrect: opt.isCorrect },
          });
        }
      }
      createdQuestions.push(question.id);
    }
    // Update assessment question count
    await tx.assessments.update({
      where: { id: assessmentId },
      data: { questionCount: createdQuestions.length },
    });
    return { assessmentId, createdQuestions };
  });
}

export async function updateAssessmentStatus(
  user: UserLike,
  assessmentId: number,
  status: "draft" | "published" | "archived"
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

// ===== ASSIGNMENTS =====

export async function createAssignment(
  user: UserLike,
  input: {
    assessmentId: number;
    classId: number;
    title?: string;
    dueAt?: Date;
    timeLimitMinutes?: number;
    attemptsAllowed?: number;
    mode: "live_quiz" | "assignment" | "practice";
    studentIds?: number[];
  }
) {
  if (user.role === "student") throw new Error("Student accounts cannot create assignments");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);

  const assessment = await db.assessments.findFirst({
    where: { id: input.assessmentId, schoolId: school.id },
  });
  if (!assessment) throw new Error("Assessment not found");

  const classRoom = await db.classes.findFirst({
    where: { id: input.classId, schoolId: school.id },
  });
  if (!classRoom) throw new Error("Class not found");

  const titlePrefix = assessment.title;
  const defaultTitle = `${titlePrefix} - ${classRoom.name}`;

  return db.$transaction(async tx => {
    const assignment = await tx.assignments.create({
      data: {
        schoolId: school.id,
        assessmentId: input.assessmentId,
        teacherId: user.id,
        title: input.title || defaultTitle,
        classLabel: classRoom.name,
        status: input.mode === "live_quiz" ? "available" : "draft",
        dueAt: input.dueAt,
        timeLimitMinutes: input.timeLimitMinutes ?? 0,
        attemptsAllowed: input.attemptsAllowed ?? 1,
        submissions: 0,
        totalLearners: 0,
      },
    });

    // Create assignment submissions for each student
    if (input.studentIds && input.studentIds.length > 0) {
      const submissions = await Promise.all(
        input.studentIds.map(studentId =>
          tx.assignment_submissions.create({
            data: {
              assignmentId: assignment.id,
              studentUserId: studentId,
              status: input.mode === "practice" ? "in_progress" : "available",
            },
          })
        )
      );
      await tx.classes.update({
        where: { id: input.classId },
        data: { totalLearners: input.studentIds.length },
      });
      return { assignment, submissions };
    }

    // If no specific students, get all students in the class
    const allStudents = await db.users.findMany({
      where: {
        school_memberships: {
          some: { schoolId: school.id, role: "student", status: "active" },
        },
      },
      select: { id: true },
    });

    const submissions = await Promise.all(
      allStudents.map(student =>
        tx.assignment_submissions.create({
          data: {
            assignmentId: assignment.id,
            studentUserId: student.id,
            status: input.mode === "practice" ? "in_progress" : "available",
          },
        })
      )
    );

    await tx.classes.update({
      where: { id: input.classId },
      data: { totalLearners: allStudents.length },
    });

    return { assignment, submissions };
  });
}

export async function getAssignment(
  assessmentId: number,
  classId: number
) {
  const db = await getDb();
  if (!db) return null;
  return db.assignments.findFirst({
    where: { assessmentId, schoolId: classId }, // simplified - will need class mapping
    include: {
      assessment: true,
      assignment_submissions: {
        include: { user: true },
      },
    },
  });
}

export async function getAssignmentSubmissions(
  assignmentId: number,
  user: UserLike
) {
  const db = await getDb();
  if (!db) return [];
  const school = await ensureSeedData(db, user);
  return db.assignment_submissions.findMany({
    where: { assignmentId },
    include: { user: true },
    orderBy: { submittedAt: "desc" },
  });
}

// ===== LIVE QUIZ SESSIONS =====

export async function createLiveQuizSession(
  user: UserLike,
  input: {
    assessmentId: number;
    timeLimitMinutes: number;
    maxParticipants?: number;
  }
) {
  if (user.role === "student") throw new Error("Student accounts cannot host live quizzes");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);

  const assessment = await db.assessments.findFirst({
    where: { id: input.assessmentId, schoolId: school.id },
  });
  if (!assessment) throw new Error("Assessment not found");

  const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  return db.$transaction(async tx => {
    const session = await tx.live_quiz_sessions.create({
      data: {
        assessmentId: input.assessmentId,
        teacherId: user.id,
        schoolId: school.id,
        sessionCode,
        status: "available",
        timeLimitMinutes: input.timeLimitMinutes,
        maxParticipants: input.maxParticipants,
      },
    });

    // Get all students in the school for participation
    const students = await db.users.findMany({
      where: {
        school_memberships: {
          some: { schoolId: school.id, role: "student", status: "active" },
        },
      },
      select: { id: true },
    });

    await tx.session_participants.createMany({
      data: students.map(s => ({
        sessionId: session.id,
        userId: s.id,
        studentUserId: s.id,
        joinedAt: new Date(),
      })),
    });

    return session;
  });
}

export async function getLiveQuizSession(
  sessionId: number
) {
  const db = await getDb();
  if (!db) return null;
  return db.live_quiz_sessions.findFirst({
    where: { id: sessionId },
    include: {
      assessment: true,
      session_participants: {
        include: { user: true },
      },
    },
  });
}

export async function updateLiveQuizSession(
  sessionId: number,
  input: { status: "available" | "in_progress" | " ended"; teacherAnswers?: Record<string, any> }
) {
  const db = await getDb();
  if (!db) return null;
  return db.live_quiz_sessions.update({
    where: { id: sessionId },
    data: {
      status: input.status,
      ...(input.teacherAnswers && { settings: JSON.stringify(input.teacherAnswers) }),
    },
  });
}

export async function recordLiveQuizResponse(
  sessionId: number,
  questionId: number,
  userId: number,
  selectedOption: number,
  answerText: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  // Get the question to check correctness
  const question = await db.questions.findFirst({ where: { id: questionId, schoolId: 1 } }); // simplified

  // Find the assessment to get marks
  const assessment = await db.assessments.findFirst({
    where: { id: input.assessmentId, schoolId: 1 },
  });

  // Determine if correct (simplified logic)
  const isCorrect = false; // Would need answer key comparison

  return db.$transaction(async tx => {
    const response = await tx.live_quiz_responses.create({
      data: {
        sessionId,
        participantId: userId,
        questionId,
        selectedOption,
        answerText,
        isCorrect,
        earnedMarks: isCorrect ? (question?.marks ?? 1) : 0,
        respondedAt: new Date(),
      },
    });

    // Update participant score
    await tx.session_participants.update({
      where: { id: userId }, // This needs refinement - should use composite key
      data: {
        score: { increment: isCorrect ? (question?.marks ?? 1) : 0 },
        correctAnswers: { increment: isCorrect ? 1 : 0 },
      },
    });

    return response;
  });
}

// ===== ASSIGNMENT SUBMISSIONS =====

export async function submitAssignment(
  assignmentId: number,
  studentUserId: number,
  answers: any,
  timeTakenSeconds: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const assignment = await db.assignments.findFirst({
    where: { id: assignmentId },
    include: { assessment: true },
  });
  if (!assignment) throw new Error("Assignment not found");

  // Check if student already submitted
  const existing = await db.assignment_submissions.findFirst({
    where: { assignmentId, studentUserId },
  });
  if (existing && existing.status === "submitted") {
    throw new Error("Already submitted");
  }

  // Grade the submission
  const { isCorrect, earnedMarks } = gradeAnswers(answers, assignment.assessment);

  const percentage = assignment.assessment.totalMarks > 0
    ? Math.round(earnedMarks * 100 / assignment.assessment.totalMarks)
    : 0;

  return db.$transaction(async tx => {
    const submission = await tx.assignment_submissions.update({
      where: { id: existing?.id || 0 },
      data: {
        status: "submitted",
        score: earnedMarks,
        percentage,
        timeTakenSeconds,
        answeredAt: new Date(),
        answers: JSON.stringify(answers),
      },
    });

    // Update assignment submissions count
    await tx.assignments.update({
      where: { id: assignmentId },
      data: { submissions: { increment: 1 } },
    });

    return submission;
  });
}

function gradeAnswers(answers: any, assessment: any) {
  let earnedMarks = 0;
  let totalMarks = 0;

  // Simple grading - in production would compare against answer keys
  const questions = assessment.assessment_questions?.map((aq: any) => {
    const q = await db.questions.findFirst({ where: { id: aq.questionId } });
    return q;
  }) || [];

  for (const q of questions) {
    totalMarks += q.marks;
    const userAnswer = answers[q.id];
    if (userAnswer === q.answerKey) {
      earnedMarks += q.marks;
    }
  }

  return { isCorrect: earnedMarks > 0, earnedMarks };
}

// ===== REPORTS & EXPORTS =====

export async function generateReportExport(
  user: UserLike,
  input: {
    exportType: "individual" | "class" | "assessment" | "school";
    format: "pdf" | "excel";
    assessmentId?: number;
    classId?: number;
    studentId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const school = await ensureSeedData(db, user);

  let exportData: any;

  switch (input.exportType) {
    case "individual":
      if (input.studentId) {
        exportData = await db.assessment_attempts.findMany({
          where: { schoolId: school.id, studentUserId: input.studentId },
          include: { assessments: true },
          orderBy: { submittedAt: "desc" },
        });
      }
      break;

    case "class":
      if (input.classId) {
        exportData = await db.studentsInClass(input.classId); // would need helper
      }
      break;

    case "assessment":
      if (input.assessmentId) {
        exportData = await db.assessment_attempts.findMany({
          where: { schoolId: school.id, assessmentId: input.assessmentId },
          include: { user: true, assessments: true },
          orderBy: { submittedAt: "desc" },
        });
      }
      break;

    case "school":
      exportData = await db.assessment_attempts.findMany({
        where: { schoolId: school.id },
        include: { user: true, assessments: true },
        orderBy: { submittedAt: "desc" },
      });
      break;
  }

  return {
    exportType: input.exportType,
    format: input.format,
    generatedAt: new Date(),
    generatedBy: user.id,
    schoolId: school.id,
    data: exportData,
  };
}

export async function getQuestionAnalytics(
  assessmentId: number,
  user: UserLike
) {
  const db = await getDb();
  if (!db) return [];
  const school = await ensureSeedData(db, user);

  return db.question_analytics.findMany({
    where: { assessmentId },
    orderBy: { questionOrder: "asc" },
  });
}

export async function updateQuestionAnalytics(
  assessmentId: number,
  questionId: number,
  totalAttempts: number,
  correctAnswers: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const existing = await db.question_analytics.findFirst({
    where: { assessmentId, questionId },
  });

  if (existing) {
    return db.question_analytics.update({
      where: { id: existing.id },
      data: {
        totalAttempts: existing.totalAttempts + totalAttempts,
        correctAnswers: existing.correctAnswers + correctAnswers,
        incorrectAnswers: (existing.totalAttempts + totalAttempts) - (existing.correctAnswers + correctAnswers),
        updatedAt: new Date(),
      },
    });
  } else {
    return db.question_analytics.create({
      data: {
        assessmentId,
        questionId,
        questionOrder: 0, // would need to query for order
        totalAttempts,
        correctAnswers,
        incorrectAnswers: totalAttempts - correctAnswers,
      },
    });
  }
}

// ===== STUDENT PERFORMANCE =====

export async function recordStudentPerformance(
  assessmentId: number,
  studentUserId: number,
  classId: number | null,
  score: number,
  totalMarks: number,
  timeTakenSeconds: number | null,
  answeredQuestions: number,
  correctAnswers: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const percentage = totalMarks > 0 ? Math.round(score * 100 / totalMarks) : 0;

  return db.$transaction(async tx => {
    const performance = await tx.student_performance.create({
      data: {
        assessmentId,
        studentUserId,
        classId,
        score,
        totalMarks,
        percentage,
        timeTakenSeconds,
        answeredQuestions,
        correctAnswers,
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });

    // Update assessment analytics
    await tx.question_analytics.updateMany({
      where: { assessmentId },
      data: {
        totalAttempts: { increment: 1 },
        correctAnswers: { increment: correctAnswers },
        incorrectAnswers: { increment: answeredQuestions - correctAnswers },
      },
    });

    return performance;
  });
}

export async function getStudentPerformanceSummary(
  studentUserId: number,
  user: UserLike
) {
  const db = await getDb();
  if (!db) return {};
  const school = await ensureSeedData(db, user);

  return db.student_performance.findMany({
    where: { studentUserId },
    include: { assessments: true },
    orderBy: { submittedAt: "desc" },
  });
}

// ===== TEACHER PROFILES =====

export async function updateTeacherProfile(
  userId: number,
  input: {
    fullName?: string;
    email?: string;
    subjectsSummary?: string;
    gradesSummary?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.teacher_profiles.upsert({
    where: { userId },
    create: {
      userId,
      schoolId: 1, // would need to get from context
      fullName: input.fullName,
      email: input.email,
      subjectsSummary: input.subjectsSummary,
      gradesSummary: input.gradesSummary,
    },
    update: {
      fullName: input.fullName,
      email: input.email,
      subjectsSummary: input.subjectsSummary,
      gradesSummary: input.gradesSummary,
    },
  });
}

export async function getTeacherProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db.teacher_profiles.findFirst({ where: { userId } });
}

// ===== HELPER: ensureSeedData =====

export async function ensureSeedData(db: PrismaClient, user: UserLike) {
  let school = await db.schools.findFirst();
  if (!school) {
    school = await db.schools.create({
      data: {
        name: "Excel International Academy",
        slug: "excel-ia-primary",
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