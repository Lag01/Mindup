-- AlterTable
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "maxDecksPerUser" INTEGER NOT NULL DEFAULT 10,
    "maxTotalUsers" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- Insert default settings
INSERT INTO "AppSettings" ("id", "maxDecksPerUser", "maxTotalUsers", "updatedAt")
VALUES ('default', 10, 5, CURRENT_TIMESTAMP);
