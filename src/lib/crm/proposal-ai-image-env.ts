/**
 * Shared server-side gate for GPT proposal illustrations (generation + UX hints).
 */
export function isProposalAiImageGenerationEnabled(): boolean {
  const raw = process.env.PROPOSAL_AI_IMAGE_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
