import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModalActionsProps {
  loading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function ModalActions({
  loading,
  onCancel,
  onSubmit,
}: ModalActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row mt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1 min-h-11 min-w-11"
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        className="flex-1 min-h-11 min-w-11"
        disabled={loading}
        onClick={onSubmit}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Overrides"
        )}
      </Button>
    </div>
  );
}
