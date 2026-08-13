/*
  Warnings:

  - A unique constraint covering the columns `[membershipId,url]` on the table `LinkedInPost` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LinkedInPost_membershipId_url_key" ON "LinkedInPost"("membershipId", "url");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
