"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Mic,
  Brain,
  FileText,
  Clock,
  User,
  Mail,
  Calendar,
  Shield,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

interface InitialUser {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  disabled: boolean;
  createdAt: Date;
  subscription: {
    tier: { code: string; name: string } | null;
    status: string;
  } | null;
}

interface UserStats {
  user: {
    id: string;
    username: string | null;
    email: string | null;
    role: string;
    disabled: boolean;
    createdAt: string;
    updatedAt: string;
    lastActivity: string;
    subscription: {
      tier: { code: string; name: string } | null;
      status: string;
    } | null;
  };
  stats: {
    conversations: { total: number; last30Days: number };
    messages: number;
    flashcards: { total: number; reviewed: number };
    materials: number;
    voiceMinutes: number;
    topMaestri: { maestroId: string; sessions: number }[];
  };
  settings: {
    language: string;
    theme: string;
    accessibilityProfile?: string;
  };
}

interface UserDetailClientProps {
  userId: string;
  initialUser: InitialUser;
}

export function UserDetailClient({
  userId,
  initialUser,
}: UserDetailClientProps) {
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/stats`);
        if (!response.ok) throw new Error("Failed to load user stats");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const user = data?.user || {
    ...initialUser,
    createdAt: initialUser.createdAt.toString(),
    updatedAt: "",
    lastActivity: "",
  };
  const stats = data?.stats;
  const settings = data?.settings;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {user.username || user.email || "User"}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant={user.disabled ? "disabled" : "active"}>
            {user.disabled ? "Disabled" : "Active"}
          </StatusBadge>
          <StatusBadge variant={user.role === "ADMIN" ? "warning" : "neutral"}>
            {user.role}
          </StatusBadge>
          {user.subscription?.tier && (
            <StatusBadge
              variant={
                user.subscription.tier.code === "PRO" ? "success" : "neutral"
              }
            >
              {user.subscription.tier.name}
            </StatusBadge>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={MessageSquare}
              title="Conversations"
              value={stats.conversations.total}
              subValue={`${stats.conversations.last30Days} last 30 days`}
            />
            <StatCard
              icon={Mic}
              title="Voice Minutes"
              value={stats.voiceMinutes}
              subValue="Total usage"
            />
            <StatCard
              icon={Brain}
              title="Flashcards"
              value={stats.flashcards.total}
              subValue={`${stats.flashcards.reviewed} reviews`}
            />
            <StatCard
              icon={FileText}
              title="Materials"
              value={stats.materials}
              subValue="Uploaded files"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Info</CardTitle>
                <CardDescription>Account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={User} label="Username" value={user.username} />
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow
                  icon={Calendar}
                  label="Created"
                  value={formatDate(user.createdAt)}
                />
                <InfoRow
                  icon={Clock}
                  label="Last Activity"
                  value={
                    data?.user.lastActivity
                      ? formatDate(data.user.lastActivity)
                      : "—"
                  }
                />
                <InfoRow icon={Shield} label="Role" value={user.role} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Maestri</CardTitle>
                <CardDescription>Most used AI tutors</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topMaestri.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No conversations yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.topMaestri.map((m, i) => (
                      <div
                        key={m.maestroId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-5">
                            {i + 1}.
                          </span>
                          <span className="font-medium">{m.maestroId}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {m.sessions} sessions
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {settings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                  <CardDescription>User preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow
                    icon={Settings}
                    label="Language"
                    value={settings.language?.toUpperCase()}
                  />
                  <InfoRow
                    icon={Settings}
                    label="Theme"
                    value={settings.theme}
                  />
                  {settings.accessibilityProfile && (
                    <InfoRow
                      icon={Settings}
                      label="Accessibility"
                      value={settings.accessibilityProfile}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Summary</CardTitle>
                <CardDescription>Engagement metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Messages
                  </span>
                  <span className="font-medium">{stats.messages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Avg Messages/Conversation
                  </span>
                  <span className="font-medium">
                    {stats.conversations.total > 0
                      ? Math.round(stats.messages / stats.conversations.total)
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Flashcard Review Rate
                  </span>
                  <span className="font-medium">
                    {stats.flashcards.total > 0
                      ? Math.round(
                          (stats.flashcards.reviewed / stats.flashcards.total) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  subValue: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{subValue}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground w-24">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}
