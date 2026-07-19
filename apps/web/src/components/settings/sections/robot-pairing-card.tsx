"use client";

/**
 * RobotPairingCard — Settings › Integrations
 *
 * Lets a parent pair a Reachy Mini robot with the logged-in child's account:
 * generate a 6-digit code to type on the robot, see paired robots, unpair.
 * The robot never sees credentials — only a scoped device token it earns by
 * redeeming the code. Serves the "MirrorBuddy with a body" flow.
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Bot, Loader2, Trash2, KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { clientLogger as logger } from "@/lib/logger/client";

interface DeviceSummary {
  id: string;
  label: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

interface PairCode {
  code: string;
  expiresAt: string;
}

export function RobotPairingCard() {
  const t = useTranslations("settings.robotPairing");
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [code, setCode] = useState<PairCode | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/devices", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices ?? []);
      }
    } catch (error) {
      logger.error("Failed to load robots", { error: String(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setCode(null);
    try {
      const res = await csrfFetch("/api/devices/pair-code", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.ok) setCode(await res.json());
    } catch (error) {
      logger.error("Failed to generate pairing code", { error: String(error) });
    } finally {
      setGenerating(false);
    }
  }, []);

  const revoke = useCallback(
    async (id: string) => {
      try {
        const res = await csrfFetch(`/api/devices/${id}`, { method: "DELETE" });
        if (res.ok) setDevices((d) => d.filter((x) => x.id !== id));
      } catch (error) {
        logger.error("Failed to revoke robot", { error: String(error) });
      }
    },
    [],
  );

  const copyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code is shown on screen anyway */
    }
  }, [code]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={generate} disabled={generating}>
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4 mr-2" />
          )}
          {t("generateCode")}
        </Button>

        {code && (
          <div className="rounded-lg border border-accent-themed/40 bg-accent-themed/5 p-4 space-y-2">
            <p className="text-sm text-muted-foreground">{t("codeHint")}</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-[0.3em]">
                {code.code}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                aria-label={t("copy")}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("codeExpires")}</p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t("pairedRobots")}</h4>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t("loading")}</span>
            </div>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRobots")}</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {d.label || t("unnamedRobot")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.pairedAt
                        ? t("pairedOn", {
                            date: new Date(d.pairedAt).toLocaleDateString(),
                          })
                        : t("pendingPairing")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(d.id)}
                    aria-label={t("unpair")}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>
      </CardContent>
    </Card>
  );
}
