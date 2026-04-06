/**
 * Optional Stitch project to attach generated screens to (web + mobile),
 * instead of calling createProject on every run.
 *
 * @see https://stitch.withgoogle.com/projects/{id}
 */

export function getStitchLinkedProjectId(): string | null {
  const raw = (
    process.env.STITCH_PROJECT_ID ??
    process.env.STITCH_DEFAULT_PROJECT_ID ??
    ""
  ).trim();
  if (!raw) return null;
  const id = raw.startsWith("projects/") ? raw.slice("projects/".length).trim() : raw;
  if (!/^\d{10,24}$/.test(id)) return null;
  return id;
}

export function isStitchLinkedProjectConfigured(): boolean {
  return getStitchLinkedProjectId() !== null;
}
