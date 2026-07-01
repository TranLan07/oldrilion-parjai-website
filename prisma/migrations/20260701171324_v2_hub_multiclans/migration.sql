/*
  Warnings:

  - Added the required column `clanId` to the `PagePermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clanId` to the `Recruitment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Clan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "colorBg" TEXT NOT NULL DEFAULT '#000000',
    "colorPrimary" TEXT NOT NULL DEFAULT '#c9a84c',
    "colorAccent" TEXT NOT NULL DEFAULT '#c0392b',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonRevealLevel" INTEGER NOT NULL DEFAULT 5
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ClanTag" (
    "clanId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("clanId", "tagId"),
    CONSTRAINT "ClanTag_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClanTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HubConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ClanWhitelist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ClanWhitelist_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClanWhitelist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPermission" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Grade_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Specialization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "defaultPermission" INTEGER NOT NULL DEFAULT 1,
    "secret" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Specialization_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoreSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "LoreSection_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuleSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "RuleSection_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChannelFollower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmToken" TEXT NOT NULL,
    "lastNotifAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChannelFollower_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'a_venir',
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "specializationId" TEXT,
    "maxParticipants" INTEGER,
    "startAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "EventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contact_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "clanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DictionaryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "french" TEXT NOT NULL,
    "mandoa" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifDelayMin" INTEGER NOT NULL DEFAULT 120,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessGrades" TEXT NOT NULL DEFAULT '[]',
    "accessSpecs" TEXT NOT NULL DEFAULT '[]',
    "accessUsers" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Channel_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Channel" ("createdAt", "description", "id", "isPrivate", "name") SELECT "createdAt", "description", "id", "isPrivate", "name" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE TABLE "new_ChannelMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChannelMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChannelMember" ("channelId", "id", "userId") SELECT "channelId", "id", "userId" FROM "ChannelMember";
DROP TABLE "ChannelMember";
ALTER TABLE "new_ChannelMember" RENAME TO "ChannelMember";
CREATE UNIQUE INDEX "ChannelMember_userId_channelId_key" ON "ChannelMember"("userId", "channelId");
CREATE TABLE "new_Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'en_cours',
    "confidentiality" TEXT NOT NULL DEFAULT 'standard',
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "maxParticipants" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mission_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Mission" ("confidentiality", "createdAt", "description", "id", "status", "title", "updatedAt") SELECT "confidentiality", "createdAt", "description", "id", "status", "title", "updatedAt" FROM "Mission";
DROP TABLE "Mission";
ALTER TABLE "new_Mission" RENAME TO "Mission";
CREATE TABLE "new_PagePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minPermission" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "PagePermission_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PagePermission" ("id", "label", "minPermission", "path") SELECT "id", "label", "minPermission", "path" FROM "PagePermission";
DROP TABLE "PagePermission";
ALTER TABLE "new_PagePermission" RENAME TO "PagePermission";
CREATE UNIQUE INDEX "PagePermission_clanId_path_key" ON "PagePermission"("clanId", "path");
CREATE TABLE "new_Recruitment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "rpName" TEXT NOT NULL,
    "discord" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "specialization" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tempPassword" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recruitment_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recruitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Recruitment" ("createdAt", "discord", "experience", "id", "motivation", "rpName", "specialization", "status", "tempPassword", "updatedAt", "userId") SELECT "createdAt", "discord", "experience", "id", "motivation", "rpName", "specialization", "status", "tempPassword", "updatedAt", "userId" FROM "Recruitment";
DROP TABLE "Recruitment";
ALTER TABLE "new_Recruitment" RENAME TO "Recruitment";
CREATE UNIQUE INDEX "Recruitment_userId_key" ON "Recruitment"("userId");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "displayName", "grade", "id", "mustChangePassword", "passwordHash", "permissionLevel", "role", "specialization", "updatedAt", "username") SELECT "createdAt", "displayName", "grade", "id", "mustChangePassword", "passwordHash", "permissionLevel", "role", "specialization", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Clan_slug_key" ON "Clan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Clan_name_key" ON "Clan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HubConfig_key_key" ON "HubConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ClanWhitelist_clanId_userId_key" ON "ClanWhitelist"("clanId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_clanId_name_key" ON "Grade"("clanId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Specialization_clanId_name_key" ON "Specialization"("clanId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelFollower_confirmToken_key" ON "ChannelFollower"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelFollower_userId_channelId_key" ON "ChannelFollower"("userId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_userId_eventId_key" ON "EventMember"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_ownerId_targetId_key" ON "Contact"("ownerId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "DictionaryEntry_french_key" ON "DictionaryEntry"("french");
