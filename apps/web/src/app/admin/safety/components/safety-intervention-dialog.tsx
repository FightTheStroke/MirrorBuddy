"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";
import { csrfFetch } from "@/lib/auth";

export type ActionType = "disableCharacter" | "stopSession" | "blockUser";

export interface ActionDialogState {
  open: boolean;
  type: ActionType | null;
  targetId: string | null;
  eventId: string;
}

const INITIAL_STATE: ActionDialogState = {
  open: false,
  type: null,
  targetId: null,
  eventId: "",
};

const ENDPOINTS: Record<ActionType, string> = {
  disableCharacter: "/api/admin/safety/disable-character",
  stopSession: "/api/admin/safety/stop-session",
  blockUser: "/api/admin/safety/block-user",
};

const BODY_KEYS: Record<ActionType, string> = {
  disableCharacter: "characterId",
  stopSession: "sessionId",
  blockUser: "userId",
};

export function useSafetyIntervention() {
  const t = useTranslations("admin.safetyIntervention");
  const [loading, setLoading] = useState(false);
  const [dialogState, setDialogState] =
    useState<ActionDialogState>(INITIAL_STATE);

  const openDialog = (
    type: ActionType,
    targetId: string | undefined,
    eventId: string,
  ) => {
    if (!targetId) {
      toast.error(t("actionFailed"));
      return;
    }
    setDialogState({ open: true, type, targetId, eventId });
  };

  const handleAction = async () => {
    if (!dialogState.type || !dialogState.targetId) return;

    setLoading(true);
    try {
      const response = await csrfFetch(ENDPOINTS[dialogState.type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [BODY_KEYS[dialogState.type]]: dialogState.targetId,
          reason: `Safety intervention from event ${dialogState.eventId}`,
        }),
      });

      if (!response.ok) throw new Error(t("actionFailed"));

      const successKey = `${dialogState.type}Success` as const;
      toast.success(t(successKey));
      setDialogState(INITIAL_STATE);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => setDialogState(INITIAL_STATE);

  return { dialogState, loading, openDialog, handleAction, closeDialog };
}

interface SafetyInterventionDialogProps {
  state: ActionDialogState;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function SafetyInterventionDialog({
  state,
  loading,
  onConfirm,
  onClose,
}: SafetyInterventionDialogProps) {
  const t = useTranslations("admin.safetyIntervention");

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => !loading && !open && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.type && t(state.type)}</DialogTitle>
          <DialogDescription>
            {state.type === "disableCharacter" && t("confirmDisableCharacter")}
            {state.type === "stopSession" && t("confirmStopSession")}
            {state.type === "blockUser" && t("confirmBlockUser")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? t("processing") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
