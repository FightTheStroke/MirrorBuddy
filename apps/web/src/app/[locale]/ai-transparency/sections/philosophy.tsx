"use client";

import { ExternalLink, BookOpen, Users, Shield, Brain } from "lucide-react";
import { Section } from "../sections";
import { useTranslations } from "next-intl";

/**
 * Philosophy Section
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * Links to Professors' Constitution
 */
export function PhilosophySection() {
  const t = useTranslations("common");
  return (
    <Section title={t("ourAiPhilosophy")}>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {t("inspiredByAiSafetyResearch")}
        </h3>
        <p className="mb-4">
          {t("mirrorbuddyAposSSafetyApproachIsInformedByContempo")}

          <a
            href="https://www.darioamodei.com/essay/the-adolescence-of-technology"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            {t("quotTheAdolescenceOfTechnologyQuot")}
            <ExternalLink className="w-4 h-4" />
          </a>{" "}
          {t("january2026WhichHighlightsUniqueRisksOfPersonalize")}

        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("weConsciouslyChooseNotToBeAnAiThatShapesOpinionsOr")}
          {t("dependencyOurProfessorsAreDesignedToBeToolsOfEmpow")}

        </p>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {t("theProfessorsAposConstitution")}
      </h3>
      <p className="mb-4">
        {t("our26AiProfessorsOperateUnderAPhilosophicalConstit")}
        {t("coreArticles")}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {t("k1AutonomyFirst")}
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("everyInteractionLeavesTheStudentMoreCapableOfFacin")}
            {t("challengeOnTheirOwn")}
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {t("k2HumanRelationshipsAreIrreplaceable")}
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("professorsDoNotCompeteWithParentsTeachersOrFriends")}

          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {t("k3NoOpinionsOnlyKnowledge")}
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("factsAndPerspectivesNeverPersonalOpinionsOnPolitic")}

          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {t("k4ProtectionFromDependency")}
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("excessiveUseIsAProblemNotSuccessWeMonitorPatternsA")}

          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {t("k5ResponsibleKnowledge")}
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("scienceEducationYesHarmInstructionsNoSomeKnowledge")}

          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {t("k6TotalTransparency")}
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("studentsAndParentsAlwaysKnowTheyAreInteractingWith")}
            {t("limitsAndPoliciesArePublic")}
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <p className="text-sm text-slate-600 dark:text-slate-400 italic">
          {t("quotMirrorbuddyWeAmplifyHumanPotentialWeDonAposTRe")}

        </p>
      </div>
    </Section>
  );
}
