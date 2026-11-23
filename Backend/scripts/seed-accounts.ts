import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/_core/password";
import type { UserRole } from "../server/db";

const initialAccounts: Array<{ name: string; email: string; role: UserRole; passwordEnv: string }> = [
  { name: "Excel International Academy Admin", email: "admin@excel.ac.rw", role: "admin", passwordEnv: "INITIAL_ADMIN_PASSWORD" },
  { name: "Honore Tuyishime", email: "honore@excelinternationalacademy.ac.rw", role: "teacher", passwordEnv: "INITIAL_TEACHER_PASSWORD" },
  { name: "Angelique M.", email: "Angelique@excel.ac.rw", role: "student", passwordEnv: "INITIAL_STUDENT_PASSWORD" },
];

async function seedAccounts() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient();
  try {
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

    const academicYear = await db.academic_years.findFirst({
      where: { schoolId: school.id, label: "2026 / 27" },
      select: { id: true },
    });
    if (!academicYear) {
      await db.academic_years.create({
        data: { schoolId: school.id, label: "2026 / 27", status: "current" },
      });
    }

    const existingGrades = await db.grades.findMany({
      where: { schoolId: school.id },
      select: { level: true },
    });
    const existingLevels = new Set(existingGrades.map(grade => grade.level));
    const missingGrades = Array.from({ length: 13 }, (_, index) => index + 1)
      .filter(level => !existingLevels.has(level))
      .map(level => ({ schoolId: school.id, name: `Grade ${level}`, level }));
    if (missingGrades.length) await db.grades.createMany({ data: missingGrades });

    for (const account of initialAccounts) {
      const email = account.email.trim().toLowerCase();
      let user = await db.users.findUnique({ where: { email } });
      if (!user) {
        const password = process.env[account.passwordEnv];
        if (!password || password.length < 10) {
          throw new Error(`Set ${account.passwordEnv} to a password of at least 10 characters to create ${email}`);
        }
        const openId = `local_${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
        user = await db.$transaction(async tx => {
          const created = await tx.users.create({
            data: {
              openId,
              name: account.name,
              email,
              passwordHash: hashPassword(password),
              loginMethod: "local",
              role: account.role,
              accountStatus: "active",
              mustChangePassword: true,
            },
          });
          await tx.audit_logs.create({
            data: {
              schoolId: school.id,
              action: "account.seeded",
              entityType: "user",
              entityId: created.id,
              metadata: JSON.stringify({ role: account.role }),
            },
          });
          return created;
        });
      } else if (user.loginMethod !== "local" || user.role !== account.role || !user.passwordHash) {
        throw new Error(`Existing account ${email} is not a compatible local ${account.role} account; no changes were made to it`);
      }

      const membership = await db.school_memberships.findUnique({
        where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
        select: { id: true },
      });
      if (!membership) {
        await db.school_memberships.create({
          data: { schoolId: school.id, userId: user.id, role: account.role, status: "active" },
        });
      }
    }
    console.log("Initial development accounts are ready. Temporary passwords were not printed.");
  } finally {
    await db.$disconnect();
  }
}

seedAccounts().catch(error => {
  console.error("Account seeding failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
