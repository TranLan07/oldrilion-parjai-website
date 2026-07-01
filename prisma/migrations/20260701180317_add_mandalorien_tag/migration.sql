-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "hubRole" TEXT NOT NULL DEFAULT 'member',
    "clanId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'membre',
    "gradeId" TEXT,
    "grade" TEXT NOT NULL DEFAULT 'Recrue',
    "specializationId" TEXT,
    "specialization" TEXT NOT NULL DEFAULT '',
    "publicSpecialization" TEXT NOT NULL DEFAULT '',
    "permissionLevel" INTEGER NOT NULL DEFAULT 1,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "mandalorien" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("anonymous", "clanId", "createdAt", "displayName", "grade", "gradeId", "hubRole", "id", "mustChangePassword", "passwordHash", "permissionLevel", "publicId", "publicSpecialization", "role", "specialization", "specializationId", "updatedAt", "username") SELECT "anonymous", "clanId", "createdAt", "displayName", "grade", "gradeId", "hubRole", "id", "mustChangePassword", "passwordHash", "permissionLevel", "publicId", "publicSpecialization", "role", "specialization", "specializationId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
