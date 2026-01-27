// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useTranslations } from "next-intl";
import { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  FileText,
  Brain,
  Scale,
  AlertTriangle,
  Users,
  Lock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Compliance & Trasparenza | MirrorBuddy",
  description:
    "Documentazione compliance AI Act, L.132/2025, GDPR e COPPA per MirrorBuddy",
};

interface ComplianceDocument {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  isExternal?: boolean;
}

interface ComplianceBadge {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const COMPLIANCE_BADGES: ComplianceBadge[] = [
  {
    name: "GDPR",
    description: "Regolamento UE 2016/679",
    icon: <Shield className="w-6 h-6" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    name: "AI Act",
    description: "Regolamento UE 2024/1689",
    icon: <Brain className="w-6 h-6" />,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  {
    name: "L.132/2025",
    description: "Legge italiana sull'IA",
    icon: <Scale className="w-6 h-6" />,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  {
    name: "COPPA",
    description: "Protezione minori online",
    icon: <Users className="w-6 h-6" />,
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  {
    name: "WCAG 2.1",
    description: "Accessibilità AA",
    icon: <CheckCircle2 className="w-6 h-6" />,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
];

const PUBLIC_DOCUMENTS: ComplianceDocument[] = [
  {
    title: "Trasparenza AI",
    description:
      "Come funziona l'intelligenza artificiale in MirrorBuddy e quali dati utilizza",
    href: "/ai-transparency",
    icon: <Brain className="w-5 h-5" />,
  },
  {
    title: "Politica AI",
    description:
      "I nostri principi etici e le garanzie per l'uso responsabile dell'IA",
    href: "/ai-policy",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    title: "Privacy Policy",
    description:
      "Come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali",
    href: "/privacy",
    icon: <Lock className="w-5 h-5" />,
  },
  {
    title: "Termini di Servizio",
    description: "Le condizioni d'uso della piattaforma MirrorBuddy",
    href: "/terms",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    title: "Cookie Policy",
    description: "Quali cookie utilizziamo e come gestirli",
    href: "/cookies",
    icon: <Shield className="w-5 h-5" />,
  },
];

const TECHNICAL_DOCUMENTS: ComplianceDocument[] = [
  {
    title: "DPIA",
    description:
      "Valutazione d'impatto sulla protezione dei dati (GDPR Art. 35)",
    href: "https://github.com/FightTheStroke/MirrorBuddy/blob/main/docs/compliance/DPIA.md",
    icon: <Shield className="w-5 h-5" />,
    isExternal: true,
  },
  {
    title: "Model Card",
    description:
      "Specifiche tecniche del sistema AI, performance e limitazioni",
    href: "https://github.com/FightTheStroke/MirrorBuddy/blob/main/docs/compliance/MODEL-CARD.md",
    icon: <FileText className="w-5 h-5" />,
    isExternal: true,
  },
  {
    title: "AI Literacy",
    description:
      "Guida educativa su come funziona l'IA e come usarla criticamente",
    href: "https://github.com/FightTheStroke/MirrorBuddy/blob/main/docs/compliance/AI-LITERACY.md",
    icon: <Brain className="w-5 h-5" />,
    isExternal: true,
  },
  {
    title: "Bias Audit Report",
    description: "Analisi di fairness e non discriminazione del sistema AI",
    href: "https://github.com/FightTheStroke/MirrorBuddy/blob/main/docs/compliance/BIAS-AUDIT-REPORT.md",
    icon: <AlertTriangle className="w-5 h-5" />,
    isExternal: true,
  },
  {
    title: "Risk Management",
    description: "Framework di gestione rischi e registro dei rischi AI",
    href: "https://github.com/FightTheStroke/MirrorBuddy/blob/main/docs/compliance/AI-RISK-MANAGEMENT.md",
    icon: <Shield className="w-5 h-5" />,
    isExternal: true,
  },
];

function DocumentCard({ doc }: { doc: ComplianceDocument }) {
  const LinkComponent = doc.isExternal ? "a" : Link;
  const linkProps = doc.isExternal
    ? { href: doc.href, target: "_blank", rel: "noopener noreferrer" }
    : { href: doc.href };

  return (
    <LinkComponent
      {...linkProps}
      className="group block p-4 rounded-lg border border-gray-200 dark:border-gray-700
                 hover:border-indigo-300 dark:hover:border-indigo-600
                 hover:shadow-md transition-all duration-200
                 bg-white dark:bg-gray-800"
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30
                      text-indigo-600 dark:text-indigo-400"
        >
          {doc.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-medium text-gray-900 dark:text-white
                       group-hover:text-indigo-600 dark:group-hover:text-indigo-400
                       flex items-center gap-2"
          >
            {doc.title}
            {doc.isExternal && <ExternalLink className="w-4 h-4 opacity-50" />}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {doc.description}
          </p>
        </div>
      </div>
    </LinkComponent>
  );
}

export default function CompliancePage() {
  const t = useTranslations("compliance");

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t("page.title")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t("page.subtitle")}
          </p>
        </div>

        {/* Compliance Badges */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("badges.conformity")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {COMPLIANCE_BADGES.map((badge) => (
              <div
                key={badge.name}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${badge.color}`}
              >
                {badge.icon}
                <div>
                  <span className="font-medium">{badge.name}</span>
                  <span className="hidden sm:inline text-sm opacity-75 ml-1">
                    · {badge.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Public Documents */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("sections.publicDocs")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {PUBLIC_DOCUMENTS.map((doc) => (
              <DocumentCard key={doc.href} doc={doc} />
            ))}
          </div>
        </div>

        {/* Technical Documents */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("sections.technicalDocs")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t("sections.documentation")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {TECHNICAL_DOCUMENTS.map((doc) => (
              <DocumentCard key={doc.href} doc={doc} />
            ))}
          </div>
        </div>

        {/* Contact */}
        <div
          className="p-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/20
                      border border-indigo-100 dark:border-indigo-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("contact.title")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t("contact.text")}
          </p>
          <a
            href="mailto:info@fightthestroke.org"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400
                       hover:underline font-medium"
          >
            info@fightthestroke.org
          </a>
        </div>
      </div>
    </main>
  );
}
