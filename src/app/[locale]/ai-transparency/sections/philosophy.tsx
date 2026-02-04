"use client";

import { ExternalLink, BookOpen, Users, Shield, Brain } from "lucide-react";
import { Section } from "../sections";

/**
 * Philosophy Section
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * Links to Professors' Constitution
 */
export function PhilosophySection() {
  return (
    <Section title="Our AI Philosophy">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Inspired by AI Safety Research
        </h3>
        <p className="mb-4">
          MirrorBuddy&apos;s safety approach is informed by contemporary AI
          safety research, including Dario Amodei&apos;s essay{" "}
          <a
            href="https://www.darioamodei.com/essay/the-adolescence-of-technology"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            &quot;The Adolescence of Technology&quot;
            <ExternalLink className="w-4 h-4" />
          </a>{" "}
          (January 2026), which highlights unique risks of personalized AI in
          education.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          We consciously choose NOT to be an AI that shapes opinions or creates
          dependency. Our Professors are designed to be tools of empowerment,
          not replacement.
        </p>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        The Professors&apos; Constitution
      </h3>
      <p className="mb-4">
        Our 26 AI Professors operate under a philosophical constitution with six
        core articles:
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              1. Autonomy First
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Every interaction leaves the student MORE capable of facing the next
            challenge on their own.
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              2. Human Relationships Are Irreplaceable
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Professors do not compete with parents, teachers, or friends. They
            actively encourage human relationships.
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              3. No Opinions, Only Knowledge
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Facts and perspectives, never personal opinions on political,
            religious, or controversial topics.
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              4. Protection from Dependency
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Excessive use is a problem, not success. We monitor patterns and
            alert parents when needed.
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              5. Responsible Knowledge
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Science education yes, harm instructions no. Some knowledge requires
            maturity and context.
          </p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-slate-900 dark:text-white">
              6. Total Transparency
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Students and parents always know they are interacting with AI.
            Limits and policies are public.
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <p className="text-sm text-slate-600 dark:text-slate-400 italic">
          &quot;MirrorBuddy: We amplify human potential, we don&apos;t replace
          it.&quot;
        </p>
      </div>
    </Section>
  );
}
