/**
 * Mock data for business KPIs - used as fallback when DB queries fail
 */

import type {
  BusinessKPIResponse,
  CountryMetric,
  MaestroMetric,
} from "./business-kpi-types";

export function getMockCountries(): CountryMetric[] {
  return [
    { country: "Italy", countryCode: "IT", users: 748, revenue: 7470 },
    { country: "Germany", countryCode: "DE", users: 187, revenue: 1870 },
    { country: "France", countryCode: "FR", users: 125, revenue: 1250 },
    { country: "Spain", countryCode: "ES", users: 87, revenue: 870 },
    { country: "United Kingdom", countryCode: "GB", users: 54, revenue: 540 },
    { country: "Switzerland", countryCode: "CH", users: 23, revenue: 230 },
    { country: "Austria", countryCode: "AT", users: 15, revenue: 150 },
    { country: "Netherlands", countryCode: "NL", users: 8, revenue: 80 },
  ];
}

export function getMockMaestri(): MaestroMetric[] {
  return [
    {
      name: "Leonardo da Vinci",
      subject: "Art & Science",
      sessions: 342,
      avgDuration: 18.5,
    },
    {
      name: "Marie Curie",
      subject: "Chemistry",
      sessions: 298,
      avgDuration: 16.2,
    },
    {
      name: "Galileo Galilei",
      subject: "Physics",
      sessions: 276,
      avgDuration: 15.8,
    },
    {
      name: "Ada Lovelace",
      subject: "Mathematics",
      sessions: 234,
      avgDuration: 14.3,
    },
    {
      name: "Albert Einstein",
      subject: "Physics",
      sessions: 221,
      avgDuration: 17.1,
    },
    {
      name: "Jane Goodall",
      subject: "Biology",
      sessions: 198,
      avgDuration: 13.9,
    },
    {
      name: "Carl Sagan",
      subject: "Astronomy",
      sessions: 187,
      avgDuration: 16.7,
    },
    {
      name: "Maya Angelou",
      subject: "Literature",
      sessions: 165,
      avgDuration: 12.4,
    },
    {
      name: "Nikola Tesla",
      subject: "Engineering",
      sessions: 154,
      avgDuration: 15.2,
    },
    {
      name: "Rachel Carson",
      subject: "Environmental Science",
      sessions: 142,
      avgDuration: 14.6,
    },
  ];
}

export function getMockKPIs(): BusinessKPIResponse {
  return {
    revenue: {
      mrr: 2450,
      arr: 29400,
      growthRate: 8.5,
      totalRevenue: 35280,
      currency: "EUR",
    },
    users: {
      totalUsers: 1247,
      activeUsers: 892,
      trialUsers: 523,
      paidUsers: 245,
      churnRate: 3.2,
      trialConversionRate: 46.8,
    },
    topCountries: getMockCountries(),
    topMaestri: getMockMaestri(),
  };
}
