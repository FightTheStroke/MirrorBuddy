"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type StatusTab = "all" | "DRAFT" | "SENDING" | "SENT" | "FAILED";

const STATUSES: StatusTab[] = ["all", "DRAFT", "SENDING", "SENT", "FAILED"];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SENDING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  SENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function CampaignsTable({ campaigns }: { campaigns: EmailCampaign[] }) {
  const [status, setStatus] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesStatus = status === "all" || c.status === status;
    const matchesSearch =
      !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTotalRecipients = (campaign: EmailCampaign) => {
    return campaign.sentCount + campaign.failedCount;
  };

  const formatOpenRate = (campaign: EmailCampaign & { openRate?: number }) => {
    if (campaign.openRate !== undefined) {
      return `${campaign.openRate.toFixed(1)}%`;
    }
    // Fallback if openRate not provided
    if (campaign.sentCount === 0) return "0%";
    return "-";
  };

  return (
    <div>
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as StatusTab)}
      >
        <TabsList className="mb-4 overflow-x-auto snap-x md:overflow-visible">
          {STATUSES.map((stat) => (
            <TabsTrigger key={stat} value={stat} className="capitalize">
              {stat === "all" ? "All" : stat.toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search campaigns by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label="Search campaigns"
            />
          </div>
          <div className="flex gap-2">
            <ExportDropdown
              data={filteredCampaigns}
              columns={[
                { key: "name", label: "Name" },
                { key: "status", label: "Status" },
                { key: "sentCount", label: "Sent" },
                { key: "failedCount", label: "Failed" },
                { key: "createdAt", label: "Created" },
              ]}
              filenamePrefix="email-campaigns"
            />
            <Button asChild size="sm">
              <Link href="/admin/communications/campaigns/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Link>
            </Button>
          </div>
        </div>

        <ResponsiveTable caption="Email campaigns table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Sent / Total
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Open Rate
                </TableHead>
                <TableHead className="hidden xl:table-cell">Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/communications/campaigns/${campaign.id}`}
                      className="hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[campaign.status] || STATUS_COLORS.DRAFT
                      }`}
                    >
                      {campaign.status.toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {campaign.sentCount} / {getTotalRecipients(campaign)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatOpenRate(campaign)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {formatDate(campaign.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      aria-label="View campaign details"
                    >
                      <Link
                        href={`/admin/communications/campaigns/${campaign.id}`}
                      >
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>

        {filteredCampaigns.length === 0 && (
          <TableEmpty>
            No campaigns found. {search && "Try adjusting your search."}
          </TableEmpty>
        )}
      </Tabs>
    </div>
  );
}
