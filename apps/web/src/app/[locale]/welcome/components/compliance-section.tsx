"use client";

import { motion } from "framer-motion";
import { Shield, Scale, Baby, Eye, Github, FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface ComplianceItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href?: string;
  color: string;
}

/**
 * Compliance & Transparency Section
 *
 * Highlights MirrorBuddy's commitment to:
 * - GDPR data protection
 * - EU AI Act compliance
 * - COPPA children's privacy
 * - AI transparency policy
 * - Open source (GitHub + Apache 2.0)
 */
export function ComplianceSection() {
  const t = useTranslations("welcome.compliance");
  const complianceItems: ComplianceItem[] = [
    {
      icon: Shield,
      label: t("items.gdpr.label"),
      description: t("items.gdpr.description"),
      href: "/privacy",
      color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
    },
    {
      icon: Scale,
      label: t("items.aiAct.label"),
      description: t("items.aiAct.description"),
      href: "/ai-transparency",
      color:
        "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30",
    },
    {
      icon: Baby,
      label: t("items.coppa.label"),
      description: t("items.coppa.description"),
      href: "/privacy#coppa",
      color:
        "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
    },
    {
      icon: Eye,
      label: t("items.aiTransparency.label"),
      description: t("items.aiTransparency.description"),
      href: "/ai-policy",
      color: "text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30",
    },
    {
      icon: Github,
      label: t("items.openSource.label"),
      description: t("items.openSource.description"),
      href: "https://github.com/FightTheStroke/MirrorBuddy",
      color: "text-gray-800 bg-gray-100 dark:text-gray-300 dark:bg-gray-800",
    },
    {
      icon: FileText,
      label: t("items.apache.label"),
      description: t("items.apache.description"),
      href: "https://github.com/FightTheStroke/MirrorBuddy/blob/main/LICENSE",
      color:
        "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      className="w-full max-w-4xl mx-auto px-4 mb-12"
      aria-labelledby="compliance-heading"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="text-center mb-8"
      >
        <h2
          id="compliance-heading"
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {t("heading")}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {t("headingHighlight")}
          </span>
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </motion.div>

      {/* Compliance Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {complianceItems.map((item, i) => {
          const Icon = item.icon;
          const isExternal = item.href?.startsWith("http");

          const content = (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4 + i * 0.05 }}
              className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {item.label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </motion.div>
          );

          if (item.href) {
            return isExternal ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {content}
              </a>
            ) : (
              <Link key={item.label} href={item.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={item.label}>{content}</div>;
        })}
      </div>

      {/* Summary text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7 }}
        className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 max-w-2xl mx-auto"
      >
        {t.rich("footer", {
          link: (chunks) => (
            <a
              href="https://fightthestroke.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600"
            >
              {chunks}
            </a>
          ),
        })}
      </motion.p>
    </motion.section>
  );
}
