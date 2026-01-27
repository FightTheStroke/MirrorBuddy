import { AdminLayoutClient } from "@/components/admin/admin-layout-client";

// Force dynamic rendering for all admin pages to avoid i18n static generation issues
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
