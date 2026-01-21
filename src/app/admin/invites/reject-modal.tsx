import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RejectModalProps {
  isOpen: boolean;
  _inviteId: string;
  reason: string;
  isProcessing: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RejectModal({
  isOpen,
  _inviteId,
  reason,
  isProcessing,
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Rifiuta richiesta
        </h3>
        <label
          htmlFor="reject-reason"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Motivo del rifiuto
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Opzionale"
          className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
          rows={3}
        />
        <div className="flex gap-3 mt-4">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Annulla
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Conferma rifiuto"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
