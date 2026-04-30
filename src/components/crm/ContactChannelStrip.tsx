"use client";

import type { ReactNode } from "react";
import type { ProspectSocialUrls } from "@/lib/crm/prospect-enrichment-types";
import { Facebook, Globe, Instagram, Linkedin, Mail, Youtube } from "lucide-react";

export function listingSiteLabel(raw: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./i, "");
    return host || raw;
  } catch {
    return raw.length > 56 ? `${raw.slice(0, 54)}…` : raw;
  }
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const channelBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 text-text-primary transition hover:border-accent/50 hover:bg-surface dark:border-zinc-600 dark:hover:border-blue-500/40 dark:hover:bg-zinc-800/80";

const channelDisabledClass =
  "inline-flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-dashed border-border/50 bg-surface/40 text-text-secondary/35 dark:border-zinc-700/50 dark:bg-zinc-900/30 dark:text-zinc-600";

type ContactChannelStripProps = {
  websiteUrl: string | null;
  contactEmail: string | null;
  socialUrls: ProspectSocialUrls | null;
  onPickEmail?: (email: string) => void;
  /** Optional short note below the icon row. */
  footnote?: string | null;
};

/**
 * Fixed order: Website, Email, LinkedIn, Instagram, Facebook, TikTok, YouTube, WhatsApp.
 */
export default function ContactChannelStrip({
  websiteUrl,
  contactEmail,
  socialUrls,
  onPickEmail,
  footnote = null,
}: ContactChannelStripProps) {
  const s = socialUrls;
  const email = contactEmail?.trim() || null;
  const web = websiteUrl?.trim() || null;

  const item = (
    key: string,
    label: string,
    active: boolean,
    node: ReactNode,
    title: string
  ) => (
    <div key={key} className="flex flex-col items-center gap-1">
      {active ? node : <span className={channelDisabledClass} title={title}>{node}</span>}
      <span className="max-w-[4.5rem] truncate text-center text-[9px] font-medium uppercase tracking-wide text-text-secondary/70 dark:text-zinc-500">
        {label}
      </span>
    </div>
  );

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
        Contact channels
      </p>
      <div className="flex flex-wrap justify-start gap-3 sm:gap-4">
        {item(
          "web",
          "Website",
          Boolean(web),
          web ? (
            <a
              href={/^https?:\/\//i.test(web) ? web : `https://${web}`}
              target="_blank"
              rel="noreferrer"
              className={channelBtnClass}
              title={listingSiteLabel(web)}
              aria-label="Open website"
            >
              <Globe className="h-4 w-4 text-accent dark:text-blue-400" aria-hidden />
            </a>
          ) : (
            <Globe className="h-4 w-4" aria-hidden />
          ),
          "No website on Google listing (add a URL and research to scan)"
        )}
        {item(
          "email",
          "Email",
          Boolean(email),
          email ? (
            <a
              href={`mailto:${email}`}
              className={channelBtnClass}
              title={email}
              aria-label={`Email ${email}`}
              onClick={() => onPickEmail?.(email)}
            >
              <Mail className="h-4 w-4 text-accent dark:text-blue-400" aria-hidden />
            </a>
          ) : (
            <Mail className="h-4 w-4" aria-hidden />
          ),
          "Not found on scanned public pages yet"
        )}
        {item(
          "linkedin",
          "LinkedIn",
          Boolean(s?.linkedin?.trim()),
          s?.linkedin ? (
            <a
              href={s.linkedin}
              target="_blank"
              rel="noreferrer"
              className={channelBtnClass}
              title="LinkedIn"
              aria-label="Open LinkedIn"
            >
              <Linkedin className="h-4 w-4 text-[#0A66C2]" aria-hidden />
            </a>
          ) : (
            <Linkedin className="h-4 w-4" aria-hidden />
          ),
          "Not linked from scanned pages"
        )}
        {item(
          "instagram",
          "Instagram",
          Boolean(s?.instagram?.trim()),
          s?.instagram ? (
            <a
              href={s.instagram}
              target="_blank"
              rel="noreferrer"
              className={channelBtnClass}
              title="Instagram"
              aria-label="Open Instagram"
            >
              <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" aria-hidden />
            </a>
          ) : (
            <Instagram className="h-4 w-4" aria-hidden />
          ),
          "Not linked from scanned pages"
        )}
        {item(
          "facebook",
          "Facebook",
          Boolean(s?.facebook?.trim()),
          s?.facebook ? (
            <a
              href={s.facebook}
              target="_blank"
              rel="noreferrer"
              className={channelBtnClass}
              title="Facebook"
              aria-label="Open Facebook"
            >
              <Facebook className="h-4 w-4 text-[#1877F2]" aria-hidden />
            </a>
          ) : (
            <Facebook className="h-4 w-4" aria-hidden />
          ),
          "Not linked from scanned pages"
        )}
        {item(
          "tiktok",
          "TikTok",
          Boolean(s?.tiktok?.trim()),
          s?.tiktok ? (
            <a
              href={s.tiktok}
              target="_blank"
              rel="noreferrer"
              className={channelBtnClass}
              title="TikTok"
              aria-label="Open TikTok"
            >
              <TikTokGlyph className="h-4 w-4 text-text-primary dark:text-zinc-100" />
            </a>
          ) : (
            <TikTokGlyph className="h-4 w-4" />
          ),
          "Not linked from scanned pages"
        )}
        {item(
          "youtube",
          "YouTube",
          Boolean(s?.youtube?.trim()),
          s?.youtube ? (
            <a
              href={s.youtube}
              target="_blank"
              rel="noreferrer"
              className={channelBtnClass}
              title="YouTube"
              aria-label="Open YouTube"
            >
              <Youtube className="h-4 w-4 text-red-600 dark:text-red-500" aria-hidden />
            </a>
          ) : (
            <Youtube className="h-4 w-4" aria-hidden />
          ),
          "Not linked from scanned pages"
        )}
        {item(
          "whatsapp",
          "WhatsApp",
          Boolean(s?.whatsapp?.trim()),
          s?.whatsapp ? (
            <a
              href={s.whatsapp}
              target="_blank"
              rel="noreferrer"
              className={channelBtnClass}
              title="WhatsApp"
              aria-label="Open WhatsApp chat"
            >
              <WhatsAppGlyph className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </a>
          ) : (
            <WhatsAppGlyph className="h-4 w-4" />
          ),
          "Not linked from scanned pages"
        )}
      </div>
      {footnote?.trim() ? (
        <p className="text-[10px] leading-snug text-text-secondary/90 dark:text-zinc-500">{footnote.trim()}</p>
      ) : null}
    </div>
  );
}
