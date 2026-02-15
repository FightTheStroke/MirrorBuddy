import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getMaintenanceMode } from '@/lib/admin/control-panel-service';

export type MaintenanceStateSource = 'env' | 'db' | 'memory';

export interface MaintenanceState {
  isActive: boolean;
  message?: string;
  severity?: string;
  estimatedEndTime?: Date;
  source?: MaintenanceStateSource;
}

export interface ListMaintenanceWindowsOptions {
  includeCancelled?: boolean;
  onlyActive?: boolean;
  from?: Date;
  to?: Date;
  take?: number;
  skip?: number;
}

const MAINTENANCE_ENV_ENABLED_VALUE = 'true';
const UPCOMING_WINDOW_HOURS = 48;

export function isMaintenanceModeEnv(): boolean {
  return process.env.MAINTENANCE_MODE === MAINTENANCE_ENV_ENABLED_VALUE;
}

export async function getActiveMaintenanceWindow() {
  const now = new Date();

  return prisma.maintenanceWindow.findFirst({
    where: {
      isActive: true,
      cancelled: false,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: { startTime: 'desc' },
  });
}

export async function getUpcomingMaintenanceWindow() {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + UPCOMING_WINDOW_HOURS * 60 * 60 * 1000);

  return prisma.maintenanceWindow.findFirst({
    where: {
      cancelled: false,
      startTime: {
        gt: now,
        lte: in48Hours,
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getMaintenanceState(): Promise<MaintenanceState> {
  if (isMaintenanceModeEnv()) {
    return { isActive: true, source: 'env' };
  }

  const activeWindow = await getActiveMaintenanceWindow();
  if (activeWindow) {
    return {
      isActive: true,
      message: activeWindow.message,
      severity: activeWindow.severity,
      estimatedEndTime: activeWindow.endTime,
      source: 'db',
    };
  }

  const memoryState = getMaintenanceMode();
  if (!memoryState.isEnabled) {
    return { isActive: false, source: 'memory' };
  }

  return {
    isActive: true,
    message: memoryState.customMessage || undefined,
    severity: memoryState.severity,
    estimatedEndTime: memoryState.estimatedEndTime,
    source: 'memory',
  };
}

export async function listMaintenanceWindows(options: ListMaintenanceWindowsOptions = {}) {
  const where: Prisma.MaintenanceWindowWhereInput = {
    cancelled: options.includeCancelled ? undefined : false,
    isActive: options.onlyActive ? true : undefined,
    startTime: {
      gte: options.from,
      lte: options.to,
    },
  };

  return prisma.maintenanceWindow.findMany({
    where,
    orderBy: { startTime: 'desc' },
    take: options.take,
    skip: options.skip,
  });
}

export async function createMaintenanceWindow(data: Prisma.MaintenanceWindowCreateInput) {
  return prisma.maintenanceWindow.create({ data });
}

export async function activateMaintenanceWindow(id: string) {
  return prisma.maintenanceWindow.update({
    where: { id },
    data: { isActive: true },
  });
}

export async function deactivateMaintenanceWindow(id: string) {
  return prisma.maintenanceWindow.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function cancelMaintenanceWindow(id: string) {
  return prisma.maintenanceWindow.update({
    where: { id },
    data: { cancelled: true, isActive: false },
  });
}
