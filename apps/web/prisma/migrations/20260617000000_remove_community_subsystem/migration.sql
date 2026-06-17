-- DropForeignKey: ContributionVote depends on CommunityContribution and User
ALTER TABLE "ContributionVote" DROP CONSTRAINT IF EXISTS "ContributionVote_contributionId_fkey";
ALTER TABLE "ContributionVote" DROP CONSTRAINT IF EXISTS "ContributionVote_userId_fkey";

-- DropForeignKey: CommunityContribution depends on User
ALTER TABLE "CommunityContribution" DROP CONSTRAINT IF EXISTS "CommunityContribution_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "ContributionVote";
DROP TABLE IF EXISTS "CommunityContribution";

-- DropEnum
DROP TYPE IF EXISTS "CommunityContributionType";
DROP TYPE IF EXISTS "CommunityContributionStatus";
