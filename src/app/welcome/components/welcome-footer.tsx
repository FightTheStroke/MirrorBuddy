"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Bot, Lock, AlertTriangle, Github } from "lucide-react";
import { InlineConsent } from "@/components/consent/inline-consent";

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
    icon: <Lock className="w-4 h-4" />,
    label: "COPPA",
    description: "Protezione minori",
  },
  {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Anti-hijacking",
    description: "Controlli di sicurezza AI",
  },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Termini di Servizio" },
  { href: "/cookies", label: "Cookie Policy" },
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
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="w-full mt-12 border-t border-gray-200 dark:border-gray-800"
      role="contentinfo"
      aria-label="Footer con informazioni legali e consenso cookie"
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Cookie Consent */}
        <div className="mb-8">
          <InlineConsent />
        </div>

        {/* AI Disclaimer */}
        <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700">
          <Bot className="w-4 h-4 text-blue-600 dark:text-blue-300" />
          <span className="text-sm text-blue-900 dark:text-blue-100">
            Creato con AI - le risposte possono contenere errori
          </span>
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
              <span className="text-xs font-medium text-gray-800 dark:text-gray-100">
                {badge.label}
              </span>
            </div>
          ))}
        </div>

        {/* Legal Links */}
        <nav
          className="flex flex-wrap items-center justify-center gap-4 mb-6"
          aria-label="Link legali"
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
            aria-label="Vedi il codice sorgente su GitHub"
          >
            <Github className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">Open Source</span>
          </a>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-500">
          © {currentYear} MirrorBuddy. Progetto open source su GitHub.
        </p>
      </div>
    </motion.footer>
  );
}

export default WelcomeFooter;
