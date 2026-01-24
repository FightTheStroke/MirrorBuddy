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
    <div className="flex gap-3 mt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1"
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        className="flex-1"
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
