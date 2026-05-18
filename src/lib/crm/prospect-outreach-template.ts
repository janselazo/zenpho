export type ProspectOutreachMergeVars = {
  previewUrl?: string;
  businessName: string;
  yourName?: string;
  hookText?: string;
  ctaText?: string;
  videoThumbnailUrl?: string;
};

export function mergeProspectOutreachTemplate(
  template: string,
  vars: ProspectOutreachMergeVars,
): string {
  const name = vars.yourName ?? "";
  return template
    .replace(/\{\{previewUrl\}\}/gi, vars.previewUrl ?? "")
    .replace(/\{\{businessName\}\}/gi, vars.businessName)
    .replace(/\{\{yourName\}\}/gi, name)
    .replace(/\{\{hookText\}\}/gi, vars.hookText?.trim() || "a stronger video hook")
    .replace(/\{\{ctaText\}\}/gi, vars.ctaText?.trim() || "Book now")
    .replace(/\{\{videoThumbnailUrl\}\}/gi, vars.videoThumbnailUrl?.trim() || "");
}
