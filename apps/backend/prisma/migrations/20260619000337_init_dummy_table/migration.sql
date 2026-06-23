-- CreateTable
CREATE TABLE "InitialCheck" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitialCheck_pkey" PRIMARY KEY ("id")
);
