export function mergeProspectOutreachTemplate(
  template: string,
  vars: { previewUrl: string; businessName: string; yourName?: string },
): string {
  const name = vars.yourName ?? "";
  return template
    .replace(/\{\{previewUrl\}\}/gi, vars.previewUrl)
    .replace(/\{\{businessName\}\}/gi, vars.businessName)
    .replace(/\{\{yourName\}\}/gi, name);
}
