import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import {
  getMaintenanceState,
  getUpcomingMaintenanceWindow,
} from '@/lib/maintenance/maintenance-service';

export const revalidate = 30;

export const GET = pipe(withSentry('/api/maintenance'))(async () => {
  const state = await getMaintenanceState();

  if (state.isActive) {
    return NextResponse.json({
      status: 'active',
      message: state.message,
      severity: state.severity,
      estimatedEndTime: state.estimatedEndTime?.toISOString(),
    });
  }

  const upcomingWindow = await getUpcomingMaintenanceWindow();
  if (upcomingWindow) {
    return NextResponse.json({
      status: 'upcoming',
      message: upcomingWindow.message,
      severity: upcomingWindow.severity,
      startTime: upcomingWindow.startTime.toISOString(),
      endTime: upcomingWindow.endTime.toISOString(),
    });
  }

  return NextResponse.json({ status: 'none' });
});
