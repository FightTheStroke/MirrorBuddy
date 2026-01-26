"use client";

/**
 * Supporti Page Client - Shows ZainoView directly
 * Route: /supporti
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ZainoView } from "@/app/supporti/components/zaino-view";

function SupportiContent() {
  const searchParams = useSearchParams();

  const type = searchParams.get("type") || undefined;
  const subject = searchParams.get("subject") || undefined;

  return <ZainoView initialType={type} initialSubject={subject} />;
}

export function SupportiPageClient() {
  return (
    <main className="h-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        }
      >
        <SupportiContent />
      </Suspense>
    </main>
  );
}
