"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "max-w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide",
        className
          ?.split(" ")
          .filter((c) => c.startsWith("overflow-") || c.startsWith("snap-"))
          .join(" "),
      )}
    >
      <div
        role="tablist"
        className={cn(
          "inline-flex h-10 items-center justify-start rounded-md bg-slate-100 p-1 text-slate-500 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
  icon?: string;
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled,
  icon: Icon,
  ...props
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs();
  const isSelected = selectedValue === value;

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm min-h-11 min-w-11 px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50"
          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50",
        className,
      )}
      data-state={isSelected ? "active" : "inactive"}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 sm:mr-2" aria-hidden="true" />}
      <span className={Icon ? "hidden sm:inline" : ""}>{children}</span>
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabs();

  if (selectedValue !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed focus-visible:ring-offset-2 dark:ring-offset-slate-950",
        className,
      )}
    >
      {children}
    </div>
  );
}
