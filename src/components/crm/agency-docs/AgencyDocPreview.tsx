import {
  AGENCY_DOC_TABLE_PROSE_CLASS,
  blocksFromBody,
  isEmptyBlockHtml,
  sanitizeDocHtml,
} from "@/lib/crm/agency-doc-body";

type AgencyDocPreviewProps = {
  text: string;
  emptyLabel?: string;
};

const readingClass = `${AGENCY_DOC_TABLE_PROSE_CLASS} [&_code]:rounded [&_code]:bg-black/[0.06] [&_code]:px-1 [&_code]:text-sm [&_code]:dark:bg-white/10 [&_em]:italic [&_hr]:my-4 [&_hr]:border-border dark:[&_hr]:border-zinc-600 [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_u]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5`;

/** Renders v2 JSON (HTML blocks) or legacy plain text from `blocksFromBody`. */
export default function AgencyDocPreview({
  text,
  emptyLabel = "No content yet — add text in the editor below.",
}: AgencyDocPreviewProps) {
  const blockRows = blocksFromBody(text);
  const visible = blockRows.filter((b) => !isEmptyBlockHtml(b.html));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-text-secondary dark:text-zinc-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <article
      className={`w-full space-y-4 text-justify text-base leading-relaxed text-text-secondary dark:text-zinc-400 ${readingClass}`}
      aria-label="Preview"
    >
      {visible.map((b) => (
        <div
          key={b.id}
          className="max-w-full overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeDocHtml(b.html) }}
        />
      ))}
    </article>
  );
}
