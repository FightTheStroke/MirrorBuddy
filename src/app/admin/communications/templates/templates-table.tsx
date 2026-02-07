"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Edit, Trash2, Plus } from "lucide-react";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/admin/responsive-table";
import { ExportDropdown } from "@/components/admin/export-dropdown";
import type { EmailTemplate } from "@/lib/email/template-service";

type CategoryTab =
  | "all"
  | "onboarding"
  | "auth"
  | "notifications"
  | "marketing";

const CATEGORIES: CategoryTab[] = [
  "all",
  "onboarding",
  "auth",
  "notifications",
  "marketing",
];

export function TemplatesTable({ templates }: { templates: EmailTemplate[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryTab>("all");
  const [search, setSearch] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = category === "all" || t.category === category;
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await csrfFetch(
        `/api/admin/communications/templates/${templateToDelete}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete template");
      }
      toast.success(
        "Template deleted",
        "Template has been deleted successfully",
      );
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete template";
      setError(msg);
      toast.error("Delete failed", msg);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <Tabs
        value={category}
        onValueChange={(value) => setCategory(value as CategoryTab)}
      >
        <TabsList className="mb-4 overflow-x-auto snap-x md:overflow-visible">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search templates by name or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label="Search templates"
            />
          </div>
          <div className="flex gap-2">
            <ExportDropdown
              data={filteredTemplates}
              columns={[
                { key: "name", label: "Name" },
                { key: "subject", label: "Subject" },
                { key: "category", label: "Category" },
                { key: "isActive", label: "Active" },
                { key: "updatedAt", label: "Updated" },
              ]}
              filenamePrefix="email-templates"
            />
            <Button asChild size="sm">
              <Link href="/admin/communications/templates/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Link>
            </Button>
          </div>
        </div>

        <ResponsiveTable caption="Email templates table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {template.subject}
                  </TableCell>
                  <TableCell className="hidden md:table-cell capitalize">
                    {template.category}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span
                      className={
                        template.isActive
                          ? "inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(template.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        aria-label="Edit template"
                      >
                        <Link
                          href={`/admin/communications/templates/${template.id}/edit`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        aria-label="Delete template"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>

        {filteredTemplates.length === 0 && (
          <TableEmpty>
            No templates found. {search && "Try adjusting your search."}
          </TableEmpty>
        )}
      </Tabs>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this email template? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setTemplateToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
