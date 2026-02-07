// Mark as dynamic to avoid static generation issues with admin auth
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/session-auth";
import { redirect, notFound } from "next/navigation";
import { getTemplate } from "@/lib/email/template-service";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const { id } = await params;
  const template = await getTemplate(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Edit Email Template
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update the email template content and settings.
        </p>
      </div>
      <EmailTemplateEditor mode="edit" template={template} />
    </div>
  );
}
