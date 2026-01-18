import { useState, useEffect } from "react";
import { useSettingsStore } from "@/lib/stores";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type {
  DetailedProviderStatus,
  CostSummary,
  CostForecast,
} from "../types";

export function useProviderSettings() {
  const { preferredProvider, setPreferredProvider } = useSettingsStore();
  const [providerStatus, setProviderStatus] =
    useState<DetailedProviderStatus | null>(null);
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [forecast, setForecast] = useState<CostForecast | null>(null);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [costsConfigured, setCostsConfigured] = useState(true);
  const [showEnvDetails, setShowEnvDetails] = useState(false);

  useEffect(() => {
    fetch("/api/provider/status")
      .then((res) => res.json())
      .then((data) => setProviderStatus(data))
      .catch(() => setProviderStatus(null));
  }, []);

  useEffect(() => {
    if (providerStatus?.activeProvider !== "azure") return;

    let cancelled = false;

    const fetchCosts = async () => {
      try {
        const [costRes, forecastRes] = await Promise.all([
          fetch("/api/azure/costs?days=30"),
          fetch("/api/azure/costs?type=forecast"),
        ]);

        if (cancelled) return;

        if (!costRes.ok || !forecastRes.ok) {
          const costData = await costRes.json();
          if (costData.configured === false) {
            setCostsConfigured(false);
          } else {
            setCostsConfigured(true);
            setCosts(null);
          }
          return;
        }

        const [costData, forecastData] = await Promise.all([
          costRes.json(),
          forecastRes.json(),
        ]);

        if (costData.error || costData.totalCost === undefined) {
          if (costData.configured === false) {
            setCostsConfigured(false);
          } else {
            setCostsConfigured(true);
            setCosts(null);
          }
          return;
        }

        setCosts(costData);
        setForecast(forecastData.error ? null : forecastData);
      } catch {
        if (!cancelled) setCostsConfigured(false);
      } finally {
        if (!cancelled) setLoadingCosts(false);
      }
    };

    setLoadingCosts(true);
    fetchCosts();

    return () => {
      cancelled = true;
    };
  }, [providerStatus?.activeProvider]);

  const saveCostConfig = async (config: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
  }) => {
    await csrfFetch("/api/user/settings", {
      method: "PUT",
      body: JSON.stringify({ azureCostConfig: JSON.stringify(config) }),
    });
  };

  return {
    providerStatus,
    costs,
    forecast,
    loadingCosts,
    costsConfigured,
    showEnvDetails,
    setShowEnvDetails,
    preferredProvider,
    setPreferredProvider,
    saveCostConfig,
  };
}
