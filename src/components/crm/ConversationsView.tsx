"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Send,
  Smile,
  Paperclip,
  Mic,
  MoreVertical,
  Download,
  Reply,
  Heart,
  ThumbsUp,
  Plus,
  Play,
  Mail,
  MessageCircle,
  Smartphone,
  MessageSquareDot,
  Instagram,
  Linkedin,
  Megaphone,
  X,
  StopCircle,
  FileText,
} from "lucide-react";
import {
  markConversationRead,
  sendConversationMessage,
} from "@/app/(crm)/actions/conversations";

export type ConversationListItem = {
  id: string;
  contact_name: string;
  channel: string;
  last_message_at: string | null;
  unread_count: number;
  logo_url?: string | null;
  preview?: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  kind: string;
  direction: string;
  body: string | null;
  sender_name: string | null;
  sender_avatar_url: string | null;
  attachment: {
    name?: string;
    size_kb?: number;
    url?: string | null;
  } | null;
  created_at: string;
  email_subject?: string | null;
  email_message_id?: string | null;
};

type GroupRow =
  | { type: "sep"; label: string }
  | { type: "msg"; m: MessageRow };

const CHANNEL_DEFS: {
  id: string;
  label: string;
  connected: boolean;
}[] = [
  { id: "email", label: "Email", connected: true },
  { id: "whatsapp", label: "WhatsApp", connected: true },
  { id: "sms", label: "SMS", connected: true },
  { id: "facebook_messenger", label: "Messenger", connected: false },
  { id: "instagram", label: "Instagram", connected: false },
  { id: "linkedin", label: "LinkedIn", connected: false },
  { id: "x", label: "X", connected: false },
  { id: "paid_ads", label: "Ads", connected: true },
];

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  facebook_messenger: "Messenger",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  paid_ads: "Ads",
  other: "Other",
};

/** Pastel channel shells — scannable in the conversation list and thread header. */
const CHANNEL_BADGE_STYLES: Record<string, string> = {
  email:
    "border-sky-200/90 bg-sky-50/95 text-sky-900 [&_svg]:opacity-90 dark:border-sky-500/30 dark:bg-sky-500/[0.12] dark:text-sky-100",
  sms:
    "border-violet-200/90 bg-violet-50/95 text-violet-900 [&_svg]:opacity-90 dark:border-violet-500/30 dark:bg-violet-500/[0.12] dark:text-violet-100",
  whatsapp:
    "border-emerald-200/90 bg-emerald-50/95 text-emerald-900 [&_svg]:opacity-90 dark:border-emerald-500/30 dark:bg-emerald-500/[0.12] dark:text-emerald-100",
  facebook_messenger:
    "border-blue-200/90 bg-blue-50/95 text-blue-900 [&_svg]:opacity-90 dark:border-blue-500/30 dark:bg-blue-500/[0.12] dark:text-blue-100",
  instagram:
    "border-pink-200/80 bg-rose-50/95 text-rose-900 [&_svg]:opacity-90 dark:border-pink-500/25 dark:bg-rose-500/[0.12] dark:text-rose-100",
  linkedin:
    "border-indigo-200/90 bg-indigo-50/95 text-indigo-900 [&_svg]:opacity-90 dark:border-indigo-500/30 dark:bg-indigo-500/[0.12] dark:text-indigo-100",
  x:
    "border-zinc-300/80 bg-zinc-100/95 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/85 dark:text-zinc-100",
  paid_ads:
    "border-amber-200/90 bg-amber-50/95 text-amber-950 [&_svg]:opacity-90 dark:border-amber-500/30 dark:bg-amber-500/[0.12] dark:text-amber-100",
  other:
    "border-slate-200/90 bg-slate-50/95 text-slate-700 [&_svg]:opacity-90 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200",
};

function channelBadgeStyles(channel: string) {
  return CHANNEL_BADGE_STYLES[channel] ?? CHANNEL_BADGE_STYLES.other;
}

function avatarInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ChannelBadge({ channel }: { channel: string }) {
  const label = CHANNEL_LABELS[channel] ?? channel;
  const iconClass = "h-3.5 w-3.5 shrink-0";
  let icon = <MessageCircle className={iconClass} />;
  if (channel === "email") icon = <Mail className={iconClass} />;
  else if (channel === "sms") icon = <Smartphone className={iconClass} />;
  else if (channel === "facebook_messenger")
    icon = <MessageSquareDot className={iconClass} />;
  else if (channel === "instagram") icon = <Instagram className={iconClass} />;
  else if (channel === "linkedin") icon = <Linkedin className={iconClass} />;
  else if (channel === "paid_ads") icon = <Megaphone className={iconClass} />;
  else if (channel === "x")
    icon = <span className="text-[10px] font-bold">𝕏</span>;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${channelBadgeStyles(channel)}`}
    >
      {icon}
      {label}
    </span>
  );
}

function BusinessAvatar({
  name,
  logoUrl,
  className,
  fallbackClassName,
}: {
  name: string;
  logoUrl?: string | null;
  className: string;
  fallbackClassName: string;
}) {
  const [failed, setFailed] = useState(!logoUrl);
  const onError = useCallback(() => setFailed(true), []);

  if (failed || !logoUrl) {
    return (
      <span className={fallbackClassName}>
        {avatarInitials(name)}
      </span>
    );
  }

  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- business favicons come from external domains */}
      <img
        src={logoUrl}
        alt=""
        className="h-full w-full object-contain p-1.5"
        onError={onError}
      />
    </span>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatListTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return formatTime(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (today) return "Today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday =
    d.getDate() === y.getDate() &&
    d.getMonth() === y.getMonth() &&
    d.getFullYear() === y.getFullYear();
  if (yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

type TabId = "messages" | "notes" | "files";

export default function ConversationsView({
  conversations,
  activeConversationId,
  activeConversation,
  messages,
}: {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  activeConversation: {
    id: string;
    contact_name: string;
    channel: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    logo_url?: string | null;
  } | null;
  messages: MessageRow[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabId>("messages");
  const [body, setBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Composer attachments + recorder + emoji picker state.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [attachment, setAttachment] = useState<{
    base64: string;
    name: string;
    contentType: string;
    sizeBytes: number;
    isVoice: boolean;
  } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const isEmailChannel = activeConversation?.channel === "email";
  const threadSubject = useMemo(() => {
    if (!isEmailChannel) return null;
    for (const m of messages) {
      if (m.email_subject) return m.email_subject;
    }
    return null;
  }, [messages, isEmailChannel]);

  useEffect(() => {
    if (!activeConversationId) return;
    void (async () => {
      await markConversationRead(activeConversationId);
      router.refresh();
    })();
  }, [activeConversationId, router]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refreshIfVisible, 10000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router]);

  useEffect(() => {
    setTab("messages");
    setBody("");
    setEmailSubject("");
    setFormError(null);
    setAttachment(null);
    setEmojiOpen(false);
  }, [activeConversationId]);

  // Tear down any active recording when leaving the conversation or unmounting.
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      rec?.stream?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      recordingChunksRef.current = [];
    };
  }, [activeConversationId]);

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Unexpected file reader result"));
          return;
        }
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setFormError("Attachment exceeds 25 MB.");
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setAttachment({
        base64,
        name: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        isVoice: false,
      });
      setFormError(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not read the selected file."
      );
    }
  }

  const insertEmoji = useCallback((emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setBody((prev) => (prev + emoji).slice(0, 1000));
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const next = (ta.value.slice(0, start) + emoji + ta.value.slice(end)).slice(
      0,
      1000
    );
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const caret = Math.min(start + emoji.length, next.length);
      ta.setSelectionRange(caret, caret);
    });
  }, []);

  async function startRecording() {
    if (recording) return;
    setFormError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setFormError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (m) =>
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
      );
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined
      );
      recordingChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordingChunksRef.current.push(ev.data);
        }
      };
      recorder.onstop = async () => {
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        stream.getTracks().forEach((t) => t.stop());
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (blob.size === 0) {
          setFormError("No audio captured. Try again.");
          return;
        }
        try {
          const buf = await blob.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buf);
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(
              null,
              Array.from(bytes.subarray(i, i + chunkSize))
            );
          }
          const base64 =
            typeof btoa === "function"
              ? btoa(binary)
              : Buffer.from(buf).toString("base64");
          const ext =
            type.includes("mp4") ? "m4a" : type.includes("webm") ? "webm" : "ogg";
          setAttachment({
            base64,
            name: `voice-message-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
            contentType: type,
            sizeBytes: blob.size,
            isVoice: true,
          });
        } catch (err) {
          setFormError(
            err instanceof Error
              ? err.message
              : "Could not encode voice recording."
          );
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          const next = s + 1;
          if (next >= 120) {
            // Hard cap at 2 minutes.
            const r = recorderRef.current;
            if (r && r.state !== "inactive") {
              try {
                r.stop();
              } catch {
                /* ignore */
              }
            }
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            setRecording(false);
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Microphone access was blocked or unavailable."
      );
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecording(false);
  }

  function clearAttachment() {
    setAttachment(null);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.contact_name.toLowerCase().includes(q) ||
        (c.preview ?? "").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const tabMessages = useMemo(() => {
    if (tab === "messages")
      return messages.filter((m) => m.kind === "external" || m.kind === "system");
    if (tab === "notes") return messages.filter((m) => m.kind === "internal");
    return messages.filter((m) => m.attachment != null);
  }, [messages, tab]);

  const composerKind = tab === "notes" ? "internal" : "external";
  const showComposer = tab === "messages" || tab === "notes";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeConversationId) return;
    if (recording) return;
    setFormError(null);
    const fd = new FormData();
    fd.set("conversation_id", activeConversationId);
    fd.set("kind", composerKind);
    fd.set("body", body);
    if (isEmailChannel && composerKind === "external") {
      const subj = emailSubject.trim() || threadSubject || "";
      if (subj) fd.set("email_subject", subj);
    }
    if (attachment) {
      fd.set("attachment_base64", attachment.base64);
      fd.set("attachment_name", attachment.name);
      fd.set("attachment_type", attachment.contentType);
      if (attachment.isVoice) fd.set("is_voice", "1");
    }
    startTransition(async () => {
      const res = await sendConversationMessage(fd);
      if ("error" in res && res.error) setFormError(res.error);
      else {
        setBody("");
        setAttachment(null);
        setEmojiOpen(false);
        router.refresh();
      }
    });
  }

  const grouped = useMemo((): GroupRow[] => {
    const rows: GroupRow[] = [];
    let lastDay = "";
    for (const m of tabMessages) {
      const dk = dayKey(m.created_at);
      if (dk !== lastDay) {
        lastDay = dk;
        rows.push({ type: "sep", label: dayLabel(m.created_at) });
      }
      rows.push({ type: "msg", m });
    }
    return rows;
  }, [tabMessages]);

  const initials = avatarInitials;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Conversations
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            One inbox for email, social, SMS, and ads — connect channels in
            Settings when you&apos;re ready.
          </p>
        </div>
      </div>

      <div className="mt-6 flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30 lg:flex-row">
        {/* Inbox list */}
        <div className="flex w-full shrink-0 flex-col border-b border-border lg:w-[320px] lg:border-b-0 lg:border-r dark:border-zinc-800">
          <div className="border-b border-border p-3 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/50" />
              <input
                type="search"
                placeholder="Search conversations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface py-2 pl-8 pr-3 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-800/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">
                No conversations match your search.
              </p>
            ) : (
              <ul className="divide-y divide-border dark:divide-zinc-800">
                {filtered.map((c) => {
                  const active = pathname === `/conversations/${c.id}`;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/conversations/${c.id}`}
                        className={`flex gap-3 px-3 py-3 transition-colors ${
                          active
                            ? "bg-accent/10 dark:bg-blue-500/10"
                            : "hover:bg-surface/80 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        <BusinessAvatar
                          name={c.contact_name}
                          logoUrl={c.logo_url}
                          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                          fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-blue-500 text-xs font-bold text-white"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-sm font-semibold ${
                                c.unread_count > 0
                                  ? "text-text-primary"
                                  : "text-text-primary/90"
                              }`}
                            >
                              {c.contact_name}
                            </span>
                            <span className="shrink-0 text-[11px] text-text-secondary">
                              {formatListTime(c.last_message_at)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <ChannelBadge channel={c.channel} />
                            {c.unread_count > 0 ? (
                              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {c.unread_count}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                            {c.preview ?? "—"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-h-[420px] min-w-0 flex-1 flex-col">
          {!activeConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-text-secondary">
              <p className="font-medium text-text-primary">
                Select a conversation
              </p>
              <p>Choose a thread from the list to read and reply.</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-border px-3 pt-2 dark:border-zinc-800">
                {(
                  [
                    ["messages", "Messages"],
                    ["notes", "Internal Notes"],
                    ["files", "Files"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`relative px-3 pb-2 text-sm font-medium transition-colors ${
                      tab === id
                        ? "text-accent"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {label}
                    {tab === id ? (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent" />
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Contact row */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3 dark:border-zinc-800">
                <BusinessAvatar
                  name={activeConversation.contact_name}
                  logoUrl={activeConversation.logo_url}
                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">
                    {activeConversation.contact_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={activeConversation.channel} />
                    {activeConversation.contact_email ? (
                      <span className="truncate text-xs text-text-secondary">
                        {activeConversation.contact_email}
                      </span>
                    ) : null}
                    {activeConversation.contact_phone ? (
                      <span className="truncate text-xs text-text-secondary">
                        {activeConversation.contact_phone}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-surface/40 px-4 py-4 dark:bg-zinc-950/40">
                {tab === "messages" && tabMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-secondary">
                    No messages in this thread yet.
                  </p>
                ) : null}
                {tab === "files" && tabMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-secondary">
                    No file attachments in this thread.
                  </p>
                ) : null}
                {tab === "notes" && tabMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-secondary">
                    No internal notes yet. Add one below — visible only to your
                    team.
                  </p>
                ) : null}
                <div className="flex flex-col gap-4">
                  {grouped.map((row, idx) =>
                    row.type === "sep" ? (
                      <div
                        key={`sep-${idx}-${row.label}`}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="h-px flex-1 bg-border dark:bg-zinc-800" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                          {row.label}
                        </span>
                        <div className="h-px flex-1 bg-border dark:bg-zinc-800" />
                      </div>
                    ) : (
                      <MessageBubble
                        key={row.m.id}
                        m={row.m}
                        tab={tab}
                        initialsFn={initials}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Composer */}
              {showComposer ? (
                <div className="border-t border-border p-4 dark:border-zinc-800">
                  <form onSubmit={onSubmit} className="space-y-3">
                    {isEmailChannel && composerKind === "external" ? (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-secondary">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={emailSubject || threadSubject || ""}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Email subject…"
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900"
                          readOnly={!!threadSubject && !emailSubject}
                          onFocus={() => {
                            if (threadSubject && !emailSubject) setEmailSubject(threadSubject);
                          }}
                        />
                      </div>
                    ) : null}
                    <div className="relative rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <textarea
                        ref={textareaRef}
                        name="body"
                        value={body}
                        onChange={(e) =>
                          setBody(e.target.value.slice(0, 1000))
                        }
                        rows={3}
                        placeholder={
                          tab === "notes"
                            ? "Write an internal note…"
                            : "Write your message…"
                        }
                        className="w-full resize-none rounded-2xl border-0 bg-transparent px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-0"
                      />
                      <button
                        type="submit"
                        disabled={
                          pending ||
                          recording ||
                          (!body.trim() && !attachment)
                        }
                        className="absolute bottom-3 right-3 rounded-xl p-2 text-accent hover:bg-accent/10 disabled:opacity-40"
                        aria-label="Send"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFilePicked}
                    />

                    {attachment ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary dark:border-zinc-700 dark:bg-zinc-800/50">
                        {attachment.isVoice ? (
                          <Mic className="h-4 w-4 text-text-secondary" />
                        ) : attachment.contentType.startsWith("image/") ? (
                          <Paperclip className="h-4 w-4 text-text-secondary" />
                        ) : (
                          <FileText className="h-4 w-4 text-text-secondary" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {attachment.name}
                        </span>
                        <span className="shrink-0 text-text-secondary">
                          {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB
                        </span>
                        <button
                          type="button"
                          onClick={clearAttachment}
                          className="shrink-0 rounded-md p-1 text-text-secondary hover:bg-white hover:text-text-primary dark:hover:bg-zinc-700"
                          aria-label="Remove attachment"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}

                    {recording ? (
                      <div className="flex items-center gap-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/60" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
                        </span>
                        <span className="font-medium">
                          Recording… {Math.floor(recordingSeconds / 60)}:
                          {String(recordingSeconds % 60).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          Stop
                        </button>
                      </div>
                    ) : null}

                    <div className="relative flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <ToolbarBtn
                          icon={<Smile className="h-4 w-4" />}
                          label="Emoji"
                          active={emojiOpen}
                          onClick={() => setEmojiOpen((v) => !v)}
                          disabled={pending}
                          dataAttr="data-emoji-toggle"
                        />
                        <ToolbarBtn
                          icon={<Paperclip className="h-4 w-4" />}
                          label="Attach"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={pending || recording}
                        />
                        <ToolbarBtn
                          icon={<Mic className="h-4 w-4" />}
                          label={recording ? "Stop" : "Voice"}
                          active={recording}
                          onClick={recording ? stopRecording : startRecording}
                          disabled={pending}
                        />
                      </div>
                      <span className="text-[11px] text-text-secondary">
                        {body.length}/1000
                      </span>

                      {emojiOpen ? (
                        <EmojiPickerPopover
                          onPick={(em) => insertEmoji(em)}
                          onClose={() => setEmojiOpen(false)}
                        />
                      ) : null}
                    </div>
                    {formError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {formError}
                      </p>
                    ) : null}
                  </form>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Channel strip */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/70">
          Channels
        </span>
        {CHANNEL_DEFS.map((ch) => (
          <span
            key={ch.id}
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
              ch.connected
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-surface text-text-secondary dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {ch.label}
            {ch.connected ? " · Connected" : (
              <>
                {" · "}
                <Link
                  href="/settings"
                  className="underline decoration-dotted underline-offset-2 hover:text-accent"
                >
                  Connect
                </Link>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  active,
  disabled,
  dataAttr,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  dataAttr?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      {...(dataAttr ? { [dataAttr]: "true" } : {})}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "bg-accent/10 text-accent"
          : "text-text-secondary hover:bg-surface hover:text-text-primary dark:hover:bg-zinc-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

const QUICK_EMOJI = [
  "😀", "😄", "😅", "😂", "🤣", "😊", "😍", "🥰",
  "😎", "🤔", "🙄", "😉", "🥳", "🤩", "😢", "🙏",
  "👍", "👏", "🙌", "💪", "🔥", "💯", "✨", "🎉",
  "❤️", "💙", "💚", "💛", "✅", "❌", "⚠️", "📌",
  "📞", "📧", "⏰", "💰",
];

function EmojiPickerPopover({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (popRef.current && popRef.current.contains(t)) return;
      // Re-clicking the toolbar Emoji button must toggle, not close+reopen.
      if (t.closest && t.closest("[data-emoji-toggle]")) return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label="Insert emoji"
      className="absolute bottom-9 left-0 z-30 w-[260px] rounded-xl border border-border bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-8 gap-1">
        {QUICK_EMOJI.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => onPick(em)}
            className="rounded-md p-1.5 text-lg leading-none hover:bg-surface dark:hover:bg-zinc-800"
            aria-label={`Insert ${em}`}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  m,
  tab,
  initialsFn,
}: {
  m: MessageRow;
  tab: TabId;
  initialsFn: (n: string) => string;
}) {
  const outbound = m.direction === "outbound";
  const isVoice = m.body === "[voice]";

  if (tab === "files" && m.attachment) {
    return (
      <div className="flex justify-start">
        <AttachmentCard att={m.attachment} sender={m.sender_name} time={m.created_at} />
      </div>
    );
  }

  if (tab !== "files") {
    return (
      <div
        className={`flex flex-col gap-1 ${outbound ? "items-end" : "items-start"}`}
      >
        <div
          className={`flex items-center gap-2 text-xs ${outbound ? "flex-row-reverse" : ""}`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
              outbound
                ? "bg-gradient-to-br from-indigo-400 to-violet-600"
                : "bg-gradient-to-br from-teal-400 to-cyan-600"
            }`}
          >
            {initialsFn(m.sender_name ?? "?")}
          </span>
          <span className="font-semibold text-text-primary">
            {m.sender_name ?? "Unknown"}
          </span>
          <span className="text-text-secondary">{formatTime(m.created_at)}</span>
        </div>

        <div
          className={`max-w-[min(100%,420px)] rounded-2xl px-4 py-2.5 text-sm ${
            outbound
              ? "bg-violet-100/90 text-text-primary dark:bg-violet-500/20 dark:text-zinc-100"
              : "bg-emerald-100/80 text-text-primary dark:bg-emerald-500/15 dark:text-zinc-100"
          }`}
        >
          {m.email_subject ? (
            <p className="mb-1 text-xs font-semibold opacity-70">
              {m.email_subject}
            </p>
          ) : null}
          {isVoice ? (
            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-accent shadow-sm dark:bg-zinc-800"
                aria-label="Play voice message"
              >
                <Play className="h-4 w-4 fill-current" />
              </button>
              <div className="flex h-8 flex-1 items-end gap-0.5">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-current opacity-40"
                    style={{
                      height: `${8 + ((i * 17) % 20)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : m.attachment ? (
            <div className="space-y-2">
              {m.body ? <p>{m.body}</p> : null}
              <AttachmentCard att={m.attachment} inline />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{m.body ?? ""}</p>
          )}
        </div>

        {tab === "messages" && !isVoice ? (
          <div
            className={`flex flex-wrap items-center gap-2 pt-1 ${outbound ? "justify-end" : ""}`}
          >
            <button
              type="button"
              className="rounded-full p-1 text-text-secondary hover:bg-white/60 dark:hover:bg-zinc-800"
              aria-label="Heart"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full p-1 text-text-secondary hover:bg-white/60 dark:hover:bg-zinc-800"
              aria-label="Thumbs up"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full p-1 text-text-secondary hover:bg-white/60 dark:hover:bg-zinc-800"
              aria-label="Add reaction"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary hover:bg-white/60 dark:hover:bg-zinc-800"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}

function AttachmentCard({
  att,
  sender,
  time,
  inline,
}: {
  att: NonNullable<MessageRow["attachment"]>;
  sender?: string | null;
  time?: string;
  inline?: boolean;
}) {
  const name = att.name ?? "File";
  const size =
    att.size_kb != null ? `${att.size_kb} KB` : "—";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900 ${
        inline ? "w-full" : "max-w-sm"
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface dark:bg-zinc-800">
        <Paperclip className="h-5 w-5 text-text-secondary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        <p className="text-xs text-text-secondary">{size}</p>
        {sender && time ? (
          <p className="mt-1 text-[11px] text-text-secondary">
            {sender} · {formatTime(time)}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
        aria-label="Download"
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="shrink-0 rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
        aria-label="Emoji"
      >
        <Smile className="h-4 w-4" />
      </button>
    </div>
  );
}
