/**
 * Dashboard types + shared constants safe to import from Client Components.
 * (Do not import `@/lib/crm/dashboard-data` from `"use client"` modules — it pulls in
 * `@/lib/supabase/server` / `next/headers`.)
 */

export type DashboardFunnelStage = {
  label: string;
  count: number;
  value: number;
  color: string;
  bg: string;
};

export type LeadsAppointmentsPoint = {
  label: string;
  leads: number;
  appointments: number;
};

export type ClientsCreatedPoint = {
  label: string;
  clients: number;
};

export type DashboardRangeTotals = {
  leads: number;
  appointments: number;
  clients: number;
  revenue: number;
};
