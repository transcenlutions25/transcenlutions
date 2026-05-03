import type { MetricsSnapshot } from "@/lib/tay/insight";

/**
 * Sample seed data so the dashboard renders something real before
 * connectors are live. Replace with normalized warehouse reads
 * once the connection layer ships.
 */
export const sampleMetrics: MetricsSnapshot = {
  spend7d: 4280,
  revenue7d: 9120,
  newCustomers7d: 71,
  refundRate: 0.062,
  topChannel: "Meta Ads",
  worstChannel: "TikTok Ads",
  cashRunwayDays: 142,
};

export interface ChannelRow {
  name: string;
  spend: number;
  revenue: number;
  conv: number;
}

export const sampleChannels: ChannelRow[] = [
  { name: "Meta Ads", spend: 1820, revenue: 4710, conv: 38 },
  { name: "Google Ads", spend: 1340, revenue: 2980, conv: 22 },
  { name: "Organic / SEO", spend: 0, revenue: 990, conv: 8 },
  { name: "TikTok Ads", spend: 880, revenue: 540, conv: 3 },
  { name: "Email", spend: 240, revenue: 900, conv: 0 },
];

export interface SparkPoint {
  d: string;
  v: number;
}

export const revenueSpark: SparkPoint[] = [
  { d: "Mon", v: 980 },
  { d: "Tue", v: 1240 },
  { d: "Wed", v: 1110 },
  { d: "Thu", v: 1530 },
  { d: "Fri", v: 1480 },
  { d: "Sat", v: 1380 },
  { d: "Sun", v: 1400 },
];

export const spendSpark: SparkPoint[] = [
  { d: "Mon", v: 540 },
  { d: "Tue", v: 610 },
  { d: "Wed", v: 580 },
  { d: "Thu", v: 720 },
  { d: "Fri", v: 660 },
  { d: "Sat", v: 590 },
  { d: "Sun", v: 580 },
];
