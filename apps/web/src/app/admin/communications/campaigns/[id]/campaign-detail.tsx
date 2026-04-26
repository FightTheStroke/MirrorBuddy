"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/admin/responsive-table";
import { ExportDropdown } from "@/components/admin/export-dropdown";
import type { EmailCampaign } from "@/lib/email/campaign-service";
import { useTranslations } from "next-intl";

interface Recipient {
  id: string;
  email: string;
  status: string;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  resendMessageId: string | null;
}

interface CampaignDetailProps {
  campaign: EmailCampaign & {
    recipientStats?: {
      totalSent: number;
      totalFailed: number;
      totalDelivered: number;
      totalOpened: number;
    };
  };
  recipients: Recipient[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function CampaignDetail({ campaign, recipients }: CampaignDetailProps) {
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");

  const filteredRecipients = recipients.filter((r) =>
    r.email.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFilters = (filters: unknown) => {
    if (!filters || typeof filters !== "object") return "None";
    const filterObj = filters as Record<string, unknown>;
    const parts: string[] = [];

    if (
      filterObj.tiers &&
      Array.isArray(filterObj.tiers) &&
      filterObj.tiers.length > 0
    ) {
      parts.push(`Tiers: ${filterObj.tiers.join(", ")}`);
    }
    if (
      filterObj.roles &&
      Array.isArray(filterObj.roles) &&
      filterObj.roles.length > 0
    ) {
      parts.push(`Roles: ${filterObj.roles.join(", ")}`);
    }
    if (
      filterObj.languages &&
      Array.isArray(filterObj.languages) &&
      filterObj.languages.length > 0
    ) {
      parts.push(`Languages: ${filterObj.languages.join(", ")}`);
    }

    return parts.length > 0 ? parts.join(", ") : "None";
  };

  const stats = campaign.recipientStats;
  const openRate =
    stats && stats.totalDelivered > 0
      ? ((stats.totalOpened / stats.totalDelivered) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/communications/campaigns">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToCampaigns")}
          </Link>
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold mb-4">{campaign.name}</h1>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("status1")}
            </dt>
            <dd className="mt-1">
              <span
                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  campaign.status === "SENT"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : campaign.status === "FAILED"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : campaign.status === "SENDING"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {campaign.status.toLowerCase()}
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("template")}
            </dt>
            <dd className="mt-1 text-sm">
              {campaign.template?.name || campaign.templateId}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("created")}
            </dt>
            <dd className="mt-1 text-sm">{formatDate(campaign.createdAt)}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("sent1")}
            </dt>
            <dd className="mt-1 text-sm">{campaign.sentCount} {t("recipients2")}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("failed")}
            </dt>
            <dd className="mt-1 text-sm">{campaign.failedCount} {t("recipients1")}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("openRate")}
            </dt>
            <dd className="mt-1 text-sm">{openRate}%</dd>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("filters")}
            </dt>
            <dd className="mt-1 text-sm">{formatFilters(campaign.filters)}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t("recipients")}{recipients.length})
        </h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={t("searchByEmail")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label={t("searchRecipients")}
            />
          </div>
          <ExportDropdown
            data={filteredRecipients}
            columns={[
              { key: "email", label: "Email" },
              { key: "status", label: "Status" },
              { key: "sentAt", label: "Sent At" },
              { key: "deliveredAt", label: "Delivered At" },
              { key: "openedAt", label: "Opened At" },
            ]}
            filenamePrefix={`campaign-${campaign.id}-recipients`}
          />
        </div>

        <ResponsiveTable caption="Campaign recipients table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("email")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("status")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("sent")}</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("delivered")}
                </TableHead>
                <TableHead className="hidden xl:table-cell">{t("opened")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipients.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell className="font-medium">
                    {recipient.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[recipient.status] || STATUS_COLORS.PENDING
                      }`}
                    >
                      {recipient.status.toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(recipient.sentAt)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(recipient.deliveredAt)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {formatDate(recipient.openedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>

        {filteredRecipients.length === 0 && (
          <TableEmpty>
            {t("noRecipientsFound")} {search && "Try adjusting your search."}
          </TableEmpty>
        )}
      </div>
    </div>
  );
}
