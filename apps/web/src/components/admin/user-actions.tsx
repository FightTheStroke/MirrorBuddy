"use client";

import { useState } from "react";
import { csrfFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Mail, CheckCircle, Ban, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface UserActionsProps {
  userId: string;
  userType: "visitor" | "user";
  email: string | null;
  currentStage: string;
  inviteStatus: string | null;
  onActionComplete: () => void;
}

export function UserActions({
  userId,
  userType,
  email,
  currentStage,
  inviteStatus,
  onActionComplete,
}: UserActionsProps) {
  const t = useTranslations("admin");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "invite" | "approve" | "block") => {
    setLoading(action);
    setError(null);

    try {
      let endpoint: string;
      const method = "POST";
      const body: Record<string, unknown> = {};

      switch (action) {
        case "invite":
          endpoint = "/api/admin/invite/send";
          body.email = email;
          if (userType === "visitor") {
            body.visitorId = userId;
          }
          break;
        case "approve":
          endpoint = "/api/admin/invite/approve";
          body.email = email;
          break;
        case "block":
          endpoint = "/api/admin/users/block";
          body.userId = userId;
          body.reason = "Blocked via funnel dashboard";
          break;
      }

      const res = await csrfFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }

      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  };

  const canInvite = userType === "visitor" && email && !inviteStatus;
  const canApprove = inviteStatus === "pending";
  const canBlock = currentStage !== "CHURNED";

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Send Invite */}
        {canInvite && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading !== null}>
                {loading === "invite" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Mail className="h-4 w-4 mr-1" />
                )}
                {t("sendInvite")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("sendBetaInvite")}</DialogTitle>
                <DialogDescription>
                  {t("sendABetaInviteTo")} {email}{t("theyWillReceiveEmail")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("cancel2")}</Button>
                </DialogClose>
                <Button onClick={() => handleAction("invite")}>{t("send")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Approve */}
        {canApprove && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" disabled={loading !== null}>
                {loading === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                {t("approve1")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("approveBetaRequest")}</DialogTitle>
                <DialogDescription>
                  {t("approveBetaAccessFor")} {email}{t("theyWillCreateAccount")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("cancel1")}</Button>
                </DialogClose>
                <Button onClick={() => handleAction("approve")}>{t("approve")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Block */}
        {canBlock && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={loading !== null}
              >
                {loading === "block" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Ban className="h-4 w-4 mr-1" />
                )}
                {t("block1")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("blockUser")}</DialogTitle>
                <DialogDescription>
                  {t("blockThisUserTheyWillNotBeAbleToAccessMirrorbuddy")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("cancel")}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => handleAction("block")}
                >
                  {t("block")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
