"use client";

/**
 * RobotPairingExplainer — the "what is the robot" block of the pairing card.
 *
 * Presentational only: explains the Reachy Mini embodiment, lists what it can
 * do, and links out to buy one — so the settings section makes sense even to
 * parents who don't own the robot yet. Split out of RobotPairingCard to keep
 * each file under the 250-line limit.
 */

import { useTranslations } from "next-intl";
import { Eye, Mic, Camera, Activity, Hand, ShoppingCart, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const BUY_URL = "https://www.reachy-mini.org/buy.html";

const FEATURES = [
  { icon: Eye, key: "featureEyes" },
  { icon: Mic, key: "featureVoice" },
  { icon: Camera, key: "featureCamera" },
  { icon: Activity, key: "featureMovement" },
  { icon: Hand, key: "featureStop" },
] as const;

export function RobotPairingExplainer() {
  const t = useTranslations("settings.robotPairing");
  return (
    <section className="space-y-3" aria-labelledby="robot-whatis">
      <h4 id="robot-whatis" className="text-sm font-semibold">
        {t("whatIsTitle")}
      </h4>
      <p className="text-sm text-muted-foreground">{t("whatIsBody")}</p>
      <ul className="space-y-2" aria-label={t("featuresTitle")}>
        {FEATURES.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-start gap-2 text-sm">
            <Icon
              className="w-4 h-4 mt-0.5 shrink-0 text-accent-themed"
              aria-hidden="true"
            />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <p className="text-sm font-medium">{t("noRobotYet")}</p>
        <p className="text-xs text-muted-foreground">{t("buyNote")}</p>
        <a
          href={BUY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ShoppingCart className="w-4 h-4 mr-2" aria-hidden="true" />
          {t("buyCta")}
          <ExternalLink className="w-3 h-3 ml-2" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
