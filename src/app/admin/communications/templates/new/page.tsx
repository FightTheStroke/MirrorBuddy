// Mark as dynamic to avoid static generation issues with admin auth
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import { getTranslations } from "next-intl/server";

export default async function NewTemplatePage() {
  const t = await getTranslations("admin");
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("createEmailTemplate")}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t("createANewEmailTemplateWithHtmlAndTextContent")}
        </p>
      </div>
      <EmailTemplateEditor mode="create" />
    </div>
  );
}
