import { discoverCompetitors } from "./google-places-provider";
import type { BusinessProfile, Competitor, GoogleLocalRankingSnapshot, ServiceResult } from "./types";

export async function analyzeCompetitors(input: {
  business: BusinessProfile;
  serviceArea: string;
}): Promise<
  ServiceResult<{
    competitors: Competitor[];
    rankingSnapshot: GoogleLocalRankingSnapshot;
  }>
> {
  return discoverCompetitors(input);
}
