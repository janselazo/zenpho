import { analyzeBrandIdentity } from "./brand-identity-service";
import { analyzeCompetitors } from "./competitor-analysis-service";
import { analyzeCompetitorStrengths } from "./competitor-strengths-service";
import { getBusinessDetails } from "./google-places-provider";
import { analyzePhotos } from "./photo-analysis-service";
import { analyzeReviewSentiment } from "./review-sentiment-service";
import {
  buildCompetitorMapPoints,
  scoreAudit,
} from "./revenue-leak-scoring-service";
import { auditWebsite } from "./website-audit-service";
import type {
  AuditAssumptions,
  BusinessProfile,
  RevenueLeakAudit,
  ServiceResult,
} from "./types";

function slugId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "audit"}-${Date.now().toString(36)}`;
}

export function normalizeAssumptions(
  input: Partial<AuditAssumptions>,
  business: BusinessProfile
): AuditAssumptions {
  const usingDefaults: string[] = [];
  const industry = input.industry?.trim() || business.category || "Local service business";
  if (!input.industry?.trim()) usingDefaults.push("industry");
  const serviceArea =
    input.serviceArea?.trim() ||
    business.address?.split(",").slice(-2, -1)[0]?.trim() ||
    "Local market";
  if (!input.serviceArea?.trim()) usingDefaults.push("serviceArea");
  const averageJobValue =
    typeof input.averageJobValue === "number" && input.averageJobValue > 0
      ? input.averageJobValue
      : 2500;
  if (!input.averageJobValue || input.averageJobValue <= 0) usingDefaults.push("averageJobValue");
  let closeRate =
    typeof input.closeRate === "number" && input.closeRate > 0 ? input.closeRate : 0.25;
  if (closeRate > 1) closeRate = closeRate / 100;
  closeRate = Math.max(0.01, Math.min(1, closeRate));
  if (!input.closeRate || input.closeRate <= 0) usingDefaults.push("closeRate");
  const estimatedMonthlyLeads =
    typeof input.estimatedMonthlyLeads === "number" && input.estimatedMonthlyLeads > 0
      ? input.estimatedMonthlyLeads
      : 40;
  if (!input.estimatedMonthlyLeads || input.estimatedMonthlyLeads <= 0) {
    usingDefaults.push("estimatedMonthlyLeads");
  }
  const monthlyAdSpend =
    typeof input.monthlyAdSpend === "number" && input.monthlyAdSpend > 0
      ? input.monthlyAdSpend
      : null;

  return {
    industry,
    averageJobValue: Math.round(averageJobValue),
    closeRate,
    estimatedMonthlyLeads: Math.round(estimatedMonthlyLeads),
    serviceArea,
    monthlyAdSpend,
    usingDefaults: [...new Set([...(input.usingDefaults ?? []), ...usingDefaults])],
  };
}

export async function generateRevenueLeakAudit(input: {
  business: BusinessProfile;
  assumptions: Partial<AuditAssumptions>;
}): Promise<ServiceResult<RevenueLeakAudit>> {
  const detailResult = await getBusinessDetails(input.business.placeId);
  const business = detailResult.data ?? input.business;
  const assumptions = normalizeAssumptions(input.assumptions, business);

  const [brand, competitorsResult, website] = await Promise.all([
    analyzeBrandIdentity(business.website, business.name),
    analyzeCompetitors({ business, serviceArea: assumptions.serviceArea }),
    auditWebsite(business.website),
  ]);
  const identityAttributes = [
    ...business.identityAttributes,
    ...website.data.identityAttributes,
  ].filter(
    (attribute, index, all) =>
      attribute.detected && all.findIndex((item) => item.id === attribute.id) === index
  );
  const businessWithIdentity = {
    ...business,
    identityAttributes,
  };

  const reviewSentiment = analyzeReviewSentiment(businessWithIdentity);
  const photoAnalysis = analyzePhotos(businessWithIdentity, competitorsResult.data.competitors);
  const competitorStrengths = analyzeCompetitorStrengths(
    businessWithIdentity,
    competitorsResult.data.competitors
  );
  const scored = scoreAudit({
    business: businessWithIdentity,
    assumptions,
    competitors: competitorsResult.data.competitors,
    rankingSnapshot: competitorsResult.data.rankingSnapshot,
    websiteAudit: website.data,
    reviewSentiment,
    photoAnalysis,
    competitorStrengths,
  });
  const competitorMapPoints = buildCompetitorMapPoints(
    businessWithIdentity,
    competitorsResult.data.competitors
  );

  const warnings = [
    ...detailResult.warnings,
    ...brand.warnings,
    ...competitorsResult.warnings,
    ...website.warnings,
    ...reviewSentiment.warnings,
    competitorMapPoints.length < 2 ? "Map unavailable because competitor coordinates are limited." : null,
  ].filter((x): x is string => Boolean(x));

  return {
    data: {
      id: slugId(business.name),
      business: businessWithIdentity,
      assumptions,
      competitors: competitorsResult.data.competitors,
      competitorMapPoints,
      rankingSnapshot: competitorsResult.data.rankingSnapshot,
      brandIdentity: brand.data,
      competitorStrengths,
      websiteAudit: website.data,
      scores: scored.scores,
      findings: scored.findings,
      revenueEstimate: scored.revenueEstimate,
      moneySummary: scored.moneySummary,
      sectionSummaries: scored.sectionSummaries,
      actionPlan: scored.actionPlan,
      recommendedNextStep: scored.recommendedNextStep,
      warnings,
      createdAt: new Date().toISOString(),
    },
    warnings,
  };
}
