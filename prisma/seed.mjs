// Seed script using dynamic import with tsx
import { execSync } from "child_process";

// Run the actual seed via tsx which handles .ts imports
execSync('npx tsx prisma/seed-run.ts', { stdio: 'inherit', cwd: process.cwd() });
