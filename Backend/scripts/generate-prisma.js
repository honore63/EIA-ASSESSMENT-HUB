import { execFileSync } from "node:child_process";
import path from "node:path";

const backendRoot = path.resolve(import.meta.dirname, "..");
const prismaCli = path.resolve(backendRoot, "node_modules", "prisma", "build", "index.js");

try {
  execFileSync(process.execPath, [prismaCli, "generate", "--schema", "../Database/prisma/schema.prisma"], {
    cwd: backendRoot,
    stdio: 'inherit',
  });
  console.log('Prisma generated successfully');
} catch (error) {
  console.error('Prisma generation failed:', error.message);
  process.exit(1);
}