import { SchoolRegistrationForm } from "./school-registration-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MirrorBuddy for Schools - Inclusive AI Education",
  description:
    "Bring AI-powered inclusive education to your school. SSO integration, admin dashboard, usage analytics, and support for students with learning differences.",
};

export default function SchoolsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          MirrorBuddy for Schools
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          Bring inclusive AI education to your institution. SSO, admin tools,
          and dedicated support included.
        </p>
      </div>
      <div className="mt-12">
        <SchoolRegistrationForm />
      </div>
    </div>
  );
}
