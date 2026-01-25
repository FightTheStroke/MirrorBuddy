import { Button } from "@/components/ui/button";

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AuditPaginationProps {
  pagination: PaginationData;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function AuditPagination({
  pagination,
  currentPage,
  onPageChange,
}: AuditPaginationProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const startEntry = (currentPage - 1) * pagination.pageSize + 1;
  const endEntry = Math.min(
    currentPage * pagination.pageSize,
    pagination.total,
  );

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {startEntry} to {endEntry} of {pagination.total} entries
      </p>
      <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="min-h-11 min-w-11"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pagination.totalPages}
          className="min-h-11 min-w-11"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
