import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  associateHistoricalAttempt,
  authenticateLocalUser,
  changeLocalPasswordWithCurrent,
  createAssessment,
  createLocalAccount,
  getPublishedAssessmentForStudent,
  getAnalyticsOverview,
  getLiveQuizSessionByCode,
  getStudentAssessmentHistory,
  getWorkspaceOverview,
  joinLiveQuizSession,
  listAssessments,
  listPublishedAssessments,
  listManagedAccounts,
  recordHistoricalAttempt,
  resetManagedAccountPassword,
  saveFullAssessment,
  saveAssessmentResponse,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  updateAssessmentStatus,
  updateManagedAccount,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, completeAccountProcedure, publicProcedure, router } from "./_core/trpc";

const loginWindows = new Map<string, { failures: number; expiresAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function assertLoginRateLimit(key: string, limit: number) {
  const now = Date.now();
  const current = loginWindows.get(key);
  if (current && current.expiresAt > now && current.failures >= limit) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Try again later." });
  }
}

function recordLoginFailure(key: string) {
  const now = Date.now();
  if (loginWindows.size > 10_000) {
    for (const [storedKey, value] of loginWindows) {
      if (value.expiresAt <= now) loginWindows.delete(storedKey);
    }
  }
  const current = loginWindows.get(key);
  loginWindows.set(key, {
    failures: current && current.expiresAt > now ? current.failures + 1 : 1,
    expiresAt: current && current.expiresAt > now ? current.expiresAt : now + LOGIN_WINDOW_MS,
  });
}

const assessmentInput = z.object({
  title: z.string().min(3).max(200),
  subject: z.string().min(2).max(100),
  gradeLabel: z.string().min(2).max(80),
  questionType: z.enum(["mcq", "multi_select", "true_false", "short_answer", "numeric", "fill_blank"]),
  prompt: z.string().min(5).max(4000),
  marks: z.number().int().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(240),
});

const fullAssessmentInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().max(4000).optional(),
  subject: z.string().trim().min(2).max(100),
  gradeLabel: z.string().trim().min(2).max(80),
  status: z.enum(["draft", "published", "archived"]).optional(),
  durationMinutes: z.number().int().min(1).max(240).optional(),
  questions: z.array(z.object({
    type: z.enum(["mcq", "multi_select", "true_false", "short_answer", "fill_blank", "numeric"]),
    prompt: z.string().trim().min(5).max(4000),
    marks: z.number().int().min(1).max(100),
    timeLimitSeconds: z.number().int().min(5).max(300),
    options: z.array(z.object({
      text: z.string().trim().min(1).max(500),
      isCorrect: z.boolean(),
    })).max(6).optional(),
  })).min(1).max(100),
}).superRefine((assessment, ctx) => {
  assessment.questions.forEach((question, index) => {
    if (!["mcq", "multi_select", "true_false"].includes(question.type)) return;
    if (!question.options || question.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions", index, "options"],
        message: "Choice questions need at least two answer options",
      });
    } else if (!question.options.some(option => option.isCorrect)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions", index, "options"],
        message: "Choice questions need at least one correct answer",
      });
    }
  });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      const user = ctx.user;
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        mustChangePassword: user.mustChangePassword,
        lastSignedIn: user.lastSignedIn,
      };
    }),
    login: publicProcedure.input(z.object({
      email: z.string().email().max(320),
      password: z.string().min(1).max(256),
    })).mutation(async ({ ctx, input }) => {
      const emailKey = `email:${input.email.trim().toLowerCase()}`;
      const ipKey = `ip:${ctx.req.ip ?? "unknown"}`;
      assertLoginRateLimit(emailKey, 10);
      assertLoginRateLimit(ipKey, 50);
      const user = await authenticateLocalUser(input.email, input.password);
      if (!user) {
        recordLoginFailure(emailKey);
        recordLoginFailure(ipKey);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      loginWindows.delete(emailKey);
      const sessionToken = await sdk.createLocalSessionToken(user.openId, user.name ?? "", { expiresInMs: 12 * 60 * 60 * 1000 });
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 12 * 60 * 60 * 1000,
      });
      return { success: true, mustChangePassword: user.mustChangePassword };
    }),
    changePassword: publicProcedure.input(z.object({
      currentPassword: z.string().min(1).max(256),
      newPassword: z.string().min(12).max(256),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        return await changeLocalPasswordWithCurrent(ctx.user.id, input.currentPassword, input.newPassword);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unable to update password",
        });
      }
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    overview: publicProcedure.query(({ ctx }) => {
      if (!ctx.user || ctx.user.role === "student" || ctx.user.mustChangePassword) return null;
      return getWorkspaceOverview(ctx.user);
    }),
    preview: publicProcedure.query(() => ({
      school: { name: "Excel International Academy", tenantKey: "excel-ia-primary" },
      metrics: { published: 18, drafts: 6, assignments: 12, grades: 13, subjects: 8, classes: 26, totalUsers: 340, admins: 4, teachers: 32, students: 304 },
      assessments: [
        { id: 1, title: "Algebraic Thinking · Checkpoint 02", subject: "Mathematics", gradeLabel: "Grade 9", status: "published", questionCount: 12, totalMarks: 24, completionRate: 82, averageScore: 76, durationMinutes: 25 },
        { id: 2, title: "Forces & Motion · Exit Ticket", subject: "Integrated Science", gradeLabel: "Grade 8", status: "published", questionCount: 6, totalMarks: 10, completionRate: 64, averageScore: 71, durationMinutes: 12 },
        { id: 3, title: "Digital Citizenship Starter", subject: "Digital Literacy", gradeLabel: "Grade 6", status: "draft", questionCount: 8, totalMarks: 16, completionRate: 0, averageScore: 0, durationMinutes: 18 },
      ],
      assignments: [
        { id: 1, title: "Algebraic Thinking · Checkpoint 02", classLabel: "Grade 9 · Horizon", status: "in_progress", submissions: 21, totalLearners: 28 },
        { id: 2, title: "Fractions & Equivalence · Practice", classLabel: "Grade 5 · Cedar", status: "available", submissions: 16, totalLearners: 24 },
      ],
    })),
  }),
  assessments: router({
    list: completeAccountProcedure.query(({ ctx }) => listAssessments(ctx.user)),
    available: completeAccountProcedure.query(({ ctx }) => listPublishedAssessments(ctx.user)),
    take: completeAccountProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) =>
      getPublishedAssessmentForStudent(ctx.user, input.id)
    ),
    create: completeAccountProcedure.input(assessmentInput).mutation(({ ctx, input }) => createAssessment(ctx.user, input)),
    saveFull: completeAccountProcedure.input(fullAssessmentInput).mutation(({ ctx, input }) => saveFullAssessment(ctx.user, input)),
    updateStatus: completeAccountProcedure.input(z.object({ id: z.number().int(), status: z.enum(["draft", "published", "archived"]) })).mutation(({ ctx, input }) => updateAssessmentStatus(ctx.user, input.id, input.status)),
  }),
  admin: router({
    users: router({
      list: adminProcedure.query(({ ctx }) => listManagedAccounts(ctx.user)),
      create: adminProcedure.input(z.object({
        name: z.string().trim().min(2).max(160),
        email: z.string().email().max(320),
        role: z.enum(["admin", "teacher", "student"]),
        password: z.string().min(10).max(256),
      })).mutation(({ ctx, input }) => createLocalAccount(ctx.user, input)),
      update: adminProcedure.input(z.object({
        id: z.number().int().positive(),
        role: z.enum(["admin", "teacher", "student"]),
        status: z.enum(["active", "inactive", "suspended"]),
      })).mutation(({ ctx, input }) => updateManagedAccount(ctx.user, input.id, input.role, input.status)),
      resetPassword: adminProcedure.input(z.object({
        id: z.number().int().positive(),
        password: z.string().min(10).max(256),
      })).mutation(({ ctx, input }) => resetManagedAccountPassword(ctx.user, input.id, input.password)),
    }),
  }),
  students: router({
    history: completeAccountProcedure.query(({ ctx }) => getStudentAssessmentHistory(ctx.user)),
  }),
  attempts: router({
    start: completeAccountProcedure.input(z.object({ assessmentId: z.number().int().positive() })).mutation(({ ctx, input }) =>
      startAssessmentAttempt(ctx.user, input.assessmentId)
    ),
    saveResponse: completeAccountProcedure.input(z.object({
      attemptId: z.number().int().positive(),
      questionId: z.number().int().positive(),
      answer: z.unknown(),
    })).mutation(({ ctx, input }) =>
      saveAssessmentResponse(ctx.user, input.attemptId, input.questionId, input.answer)
    ),
    submit: completeAccountProcedure.input(z.object({ attemptId: z.number().int().positive() })).mutation(({ ctx, input }) =>
      submitAssessmentAttempt(ctx.user, input.attemptId)
    ),
    recordHistorical: completeAccountProcedure.input(z.object({
      assessmentId: z.number().int().positive(),
      studentUserId: z.number().int().positive().optional(),
      participantName: z.string().trim().min(1).max(160).optional(),
      score: z.number().int().min(0),
      timeTakenSeconds: z.number().int().min(0).optional(),
      teacherFeedback: z.string().max(4000).optional(),
      submittedAt: z.date(),
    })).mutation(({ ctx, input }) => recordHistoricalAttempt(ctx.user, input)),
    associateHistorical: completeAccountProcedure.input(z.object({
      attemptId: z.number().int().positive(),
      studentUserId: z.number().int().positive(),
    })).mutation(({ ctx, input }) => associateHistoricalAttempt(ctx.user, input.attemptId, input.studentUserId)),
  }),
  analytics: router({
    overview: publicProcedure.query(({ ctx }) => ctx.user && ctx.user.role !== "student" && !ctx.user.mustChangePassword ? getAnalyticsOverview(ctx.user) : null),
  }),
  // Kahoot-style live quiz join (public - students join by PIN without auth)
  liveQuiz: router({
    getByCode: publicProcedure.input(z.string().min(4).max(6)).query(({ input }) => getLiveQuizSessionByCode(input)),
    joinWithCode: publicProcedure.input(z.object({
      sessionCode: z.string().min(4).max(6),
      participantName: z.string().trim().min(1).max(30).optional(),
    })).mutation(({ ctx, input }) =>
      joinLiveQuizSession({
        sessionCode: input.sessionCode,
        participantName: input.participantName,
        userId: ctx.user?.role === "student" ? ctx.user.id : undefined,
      })
    ),
  }),
});

export type AppRouter = typeof appRouter;
