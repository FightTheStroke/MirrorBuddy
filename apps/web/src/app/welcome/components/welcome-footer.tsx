"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Bot, Lock, AlertTriangle, Github, Brain } from "lucide-react";
import { InlineConsent } from "@/components/consent/inline-consent";
import { useTranslations } from "next-intl";

const GITHUB_REPO_URL = "https://github.com/robdll/mirrorbuddy";

interface ComplianceBadge {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const COMPLIANCE_BADGES: ComplianceBadge[] = [
  {
    icon: <Shield className="w-4 h-4" />,
    label: "GDPR",
    description: "Conforme al regolamento europeo",
  },
  {
    icon: <Brain className="w-4 h-4" />,
    label: "AI Act",
    description: "EU 2024/1689",
  },
  {
    icon: <Lock className="w-4 h-4" />,
    label: "COPPA",
    description: "Protezione minori",
  },
  {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "L.132/2025",
    description: "Legge italiana sull'IA",
  },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Termini di Servizio" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/ai-transparency", label: "Trasparenza AI" },
  { href: "/ai-policy", label: "Politica AI" },
  { href: "/compliance", label: "Compliance" },
];

/**
 * Welcome Footer - Comprehensive footer with compliance elements
 *
 * Includes:
 * - Inline cookie consent
 * - Legal links (privacy, terms, cookies)
 * - AI disclaimer badge
 * - Compliance badges (GDPR, COPPA, anti-hijacking)
 * - Copyright notice
 */
export function WelcomeFooter() {
  const t = useTranslations("welcome");
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ y: 20 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full mt-12 border-t border-gray-200 dark:border-gray-800"
      role="contentinfo"
      aria-label={t("ariaLabelFooterConInformazioniLegaliEConsensoCooki")}
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* AI Disclaimer */}
        <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700">
          <Bot className="w-4 h-4 text-blue-600 dark:text-blue-300" />
          <span className="text-sm text-blue-900 dark:text-blue-100">
            {t("creatoConAiLeRispostePossonoContenereErrori")}
          </span>
        </div>

        {/* Cookie Consent - centered below AI disclaimer */}
        <div className="mb-6 flex justify-center">
          <InlineConsent />
        </div>

        {/* Compliance Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          {COMPLIANCE_BADGES.map((badge, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"
              title={badge.description}
            >
              <span className="text-green-600 dark:text-green-400">
                {badge.icon}
              </span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-50">
                {badge.label}
              </span>
            </div>
          ))}
        </div>

        {/* Legal Links */}
        <nav
          className="flex flex-wrap items-center justify-center gap-4 mb-6"
          aria-label={t("linkLegali")}
        >
          {LEGAL_LINKS.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline-offset-2 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Open Source Badge */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            aria-label={t("vediIlCodiceSorgenteSuGithub")}
          >
            <Github className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">{t("openSource")}</span>
          </a>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-500">
          © {currentYear} {t("mirrorbuddyProgettoOpenSourceSuGithub")}
        </p>

        {/* Made in Europe - intentionally not localized */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
          {t("madeWith")} <span className="text-red-500">♥</span> {t("inEurope")}
        </p>
      </div>
    </motion.footer>
  );
}

export default WelcomeFooter;
