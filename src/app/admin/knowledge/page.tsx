// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/session-auth";
import { redirect } from "next/navigation";
import { getAllMaestri } from "@/data/maestri";
import { KnowledgeViewer } from "@/components/admin/knowledge/knowledge-viewer";
import { RagPanel } from "@/components/admin/knowledge/rag-panel";

export default async function AdminKnowledgePage() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const maestri = getAllMaestri().map((m) => ({
    id: m.id,
    displayName: m.displayName,
    subject: m.subject,
    toolsCount: m.tools.length,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <KnowledgeViewer maestri={maestri} />
        </div>
        <div>
          <RagPanel />
        </div>
      </div>
    </div>
  );
}
