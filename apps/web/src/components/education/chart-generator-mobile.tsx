/**
 * ChartGeneratorMobile Component - Mobile-Optimized Chart Generator
 *
 * Requirement: F-32 - Chart generator has mobile-friendly data input and chart display
 * Features:
 * - Data input form optimized for mobile (large inputs, number keyboard)
 * - Chart type selector with visual icons (bar, line, pie)
 * - Chart display fills available width on mobile
 * - Pinch-to-zoom on chart preview
 * - Export/share buttons with 44px touch targets
 * - Responsive: stacked layout on mobile, side-by-side on desktop
 * - Uses xs: breakpoint and responsive styling
 */

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  BarChart3,
  LineChart,
  PieChart,
  Share2,
  Download,
  ZoomIn,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ChartDataPoint {
  id: string;
  label: string;
  value: number;
}

type ChartType = "bar" | "line" | "pie";

interface ChartGeneratorMobileProps {
  onExport?: (data: ChartDataPoint[], chartType: ChartType) => void;
  onShare?: (data: ChartDataPoint[], chartType: ChartType) => void;
  className?: string;
}

const CHART_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

export function ChartGeneratorMobile({
  onExport,
  onShare,
  className,
}: ChartGeneratorMobileProps) {
  const t = useTranslations("education");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [dataPoints, setDataPoints] = useState<ChartDataPoint[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);

  const handleAddDataPoint = () => {
    if (labelInput.trim() && valueInput.trim()) {
      const newPoint: ChartDataPoint = {
        id: `point-${Date.now()}`,
        label: labelInput,
        value: parseFloat(valueInput),
      };
      setDataPoints([...dataPoints, newPoint]);
      setLabelInput("");
      setValueInput("");
    }
  };

  const handleRemoveDataPoint = (id: string) => {
    setDataPoints(dataPoints.filter((point) => point.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDataPoint();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const scaleFactor = distance / lastTouchDistance.current;
      setScale((prev) => Math.min(Math.max(prev * scaleFactor, 1), 3));
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = 0;
  };

  const handleExport = () => {
    onExport?.(dataPoints, chartType);
  };

  const handleShare = () => {
    onShare?.(dataPoints, chartType);
  };

  const chartTypeOptions: Array<{
    type: ChartType;
    label: string;
    icon: typeof BarChart3;
  }> = [
    { type: "bar", label: "Bar", icon: BarChart3 },
    { type: "line", label: "Line", icon: LineChart },
    { type: "pie", label: "Pie", icon: PieChart },
  ];

  const renderChart = () => {
    if (dataPoints.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <p className="text-slate-500 dark:text-slate-400 text-center px-4">
            {t("addDataPointsToGenerateAChart")}
          </p>
        </div>
      );
    }

    const chartData = dataPoints.map((point) => ({
      name: point.label,
      value: point.value,
    }));

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="value"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                isAnimationActive={true}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                isAnimationActive={true}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
                isAnimationActive={true}
              >
                {chartData.map((_, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-6xl mx-auto p-3 xs:p-4 sm:p-6",
        "bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800",
        "shadow-sm dark:shadow-lg",
        className,
      )}
      role="main"
    >
      {/* Header */}
      <div className="mb-4 xs:mb-6">
        <h2 className="text-lg xs:text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
          {t("chartGenerator")}
        </h2>
        <p className="text-sm xs:text-base text-slate-600 dark:text-slate-400 mt-1">
          {t("createCustomChartsFromYourData")}
        </p>
      </div>

      {/* Main Container - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xs:gap-6">
        {/* Left Section - Input and Controls */}
        <div className="flex flex-col gap-4 xs:gap-6">
          {/* Chart Type Selector */}
          <div className="space-y-2">
            <div
              id="chart-type-label"
              className="block text-sm xs:text-base font-medium text-slate-700 dark:text-slate-300"
            >
              {t("chartType")}
            </div>
            <div
              className="flex gap-2 flex-wrap"
              role="group"
              aria-labelledby="chart-type-label"
            >
              {chartTypeOptions.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={cn(
                    "min-h-[44px] min-w-[44px] h-auto",
                    "px-3 xs:px-4 py-2 xs:py-3",
                    "flex items-center gap-2 rounded-lg border-2 transition-all duration-200",
                    chartType === type
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300",
                    "hover:border-blue-400 dark:hover:border-blue-400",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
                  )}
                  aria-label={label}
                  aria-pressed={chartType === type}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden xs:inline text-sm font-medium">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Data Input Section */}
          <div className="space-y-3 xs:space-y-4">
            <div
              id="data-input-label"
              className="block text-sm xs:text-base font-medium text-slate-700 dark:text-slate-300"
            >
              {t("addDataPoint1")}
            </div>

            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("labelEGJanuary")}
              aria-label={t("label")}
              className={cn(
                "w-full min-h-[44px] h-auto",
                "px-3 xs:px-4 py-2 xs:py-3",
                "text-base xs:text-lg",
                "border-2 border-slate-300 dark:border-slate-700 rounded-lg",
                "bg-white dark:bg-slate-900 text-slate-900 dark:text-white",
                "placeholder-slate-500 dark:placeholder-slate-400",
                "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
              )}
            />

            <input
              type="number"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("valueEG42")}
              aria-label={t("value")}
              inputMode="numeric"
              className={cn(
                "w-full min-h-[44px] h-auto",
                "px-3 xs:px-4 py-2 xs:py-3",
                "text-base xs:text-lg",
                "border-2 border-slate-300 dark:border-slate-700 rounded-lg",
                "bg-white dark:bg-slate-900 text-slate-900 dark:text-white",
                "placeholder-slate-500 dark:placeholder-slate-400",
                "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
              )}
            />

            <Button
              onClick={handleAddDataPoint}
              disabled={!labelInput.trim() || !valueInput.trim()}
              className={cn(
                "w-full min-h-[44px] h-auto",
                "py-2 xs:py-3",
                "flex items-center justify-center gap-2",
                "text-base xs:text-lg font-medium",
              )}
            >
              <Plus className="w-5 h-5" />
              <span>{t("addDataPoint")}</span>
            </Button>
          </div>

          {/* Data Points List */}
          {dataPoints.length > 0 && (
            <div className="space-y-2 xs:space-y-3">
              <label className="block text-sm xs:text-base font-medium text-slate-700 dark:text-slate-300">
                {t("dataPoints")}{dataPoints.length})
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {dataPoints.map((point) => (
                    <motion.div
                      key={point.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={cn(
                        "flex items-center justify-between gap-2 xs:gap-3",
                        "p-2 xs:p-3",
                        "bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm xs:text-base font-medium text-slate-900 dark:text-white break-words">
                          {point.label}
                        </p>
                        <p className="text-xs xs:text-sm text-slate-600 dark:text-slate-400">
                          {point.value}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveDataPoint(point.id)}
                        className={cn(
                          "min-h-[44px] min-w-[44px] h-auto",
                          "p-2 xs:p-3",
                          "flex items-center justify-center rounded-lg",
                          "text-red-600 dark:text-red-400",
                          "hover:bg-red-50 dark:hover:bg-red-950 transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
                        )}
                        aria-label={t("deletePoint", { label: point.label })}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Chart Preview */}
        <div className="flex flex-col gap-4 xs:gap-6">
          {/* Chart Container with Pinch-to-Zoom Support */}
          <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={cn(
              "w-full",
              "bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800",
              "p-3 xs:p-4",
              "overflow-auto",
              "transition-transform duration-200",
            )}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center",
            }}
          >
            {renderChart()}
          </div>

          {/* Zoom Hint for Touch Devices */}
          {dataPoints.length > 0 && (
            <div className="flex items-center gap-2 text-xs xs:text-sm text-slate-600 dark:text-slate-400 px-2">
              <ZoomIn className="w-4 h-4" />
              <span>{t("pinchToZoomChart")}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
            <Button
              onClick={handleExport}
              disabled={dataPoints.length === 0}
              variant="outline"
              className={cn(
                "w-full xs:flex-1 min-h-[44px] h-auto",
                "py-2 xs:py-3",
                "flex items-center justify-center gap-2",
                "text-sm xs:text-base font-medium",
              )}
            >
              <Download className="w-5 h-5" />
              <span className="hidden xs:inline">{t("export")}</span>
            </Button>

            <Button
              onClick={handleShare}
              disabled={dataPoints.length === 0}
              className={cn(
                "w-full xs:flex-1 min-h-[44px] h-auto",
                "py-2 xs:py-3",
                "flex items-center justify-center gap-2",
                "text-sm xs:text-base font-medium",
              )}
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden xs:inline">{t("share")}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
