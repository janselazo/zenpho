"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, Plug, Upload, Trash2, KeyRound, Zap, ListTree } from "lucide-react";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import type { CrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import SettingsFieldsTab from "@/components/crm/SettingsFieldsTab";
import {
  updateProfile,
  updatePassword,
  uploadAvatar,
  removeAvatar,
  ROLE_LABELS,
} from "@/app/(crm)/actions/settings";

export type SettingsInitial = {
  configured: boolean;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: string | null;
  avatarUrl: string | null;
  profileError: string | null;
};

export type SettingsCrmFieldsPack = {
  fieldOptions: MergedCrmFieldOptions;
  pipeline: CrmPipelineSettings;
  leadStageCounts: Record<string, number>;
  dealStageCounts: Record<string, number>;
};

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/45 focus:border-accent focus:ring-2 focus:ring-accent/15";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary";

function initialsFrom(name: string | null | undefined, email: string | null) {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function SettingsPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-border" />
      <div className="mt-6 h-10 w-full rounded-lg bg-border" />
      <div className="mt-8 h-64 rounded-2xl bg-border" />
    </div>
  );
}

function SettingsPageViewInner({
  initial,
  crmFields,
}: {
  initial: SettingsInitial;
  crmFields: SettingsCrmFieldsPack | null;
}) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("profile");

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    ...(crmFields
      ? [{ id: "fields" as const, label: "Fields", icon: ListTree }]
      : []),
    { id: "integrations" as const, label: "Integrations", icon: Plug },
  ];

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "integrations") setActiveTab("integrations");
    else if (t === "fields" && crmFields) setActiveTab("fields");
    else setActiveTab("profile");
  }, [searchParams, crmFields]);

  return (
    <div className={crmFields ? "mx-auto max-w-4xl" : "mx-auto max-w-3xl"}>
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Settings
      </h1>

      <div className="mt-6 border-b border-border dark:border-zinc-800">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Settings sections">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "text-accent"
                    : "text-text-secondary hover:text-text-primary dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4 opacity-80" aria-hidden />
                {label}
                {active ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8">
        {activeTab === "profile" && <ProfileTab initial={initial} />}
        {activeTab === "fields" && crmFields ? (
          <SettingsFieldsTab
            initialFieldOptions={crmFields.fieldOptions}
            pipeline={crmFields.pipeline}
            leadStageCounts={crmFields.leadStageCounts}
            dealStageCounts={crmFields.dealStageCounts}
          />
        ) : null}
        {activeTab === "integrations" && <IntegrationsTab />}
      </div>
    </div>
  );
}

export default function SettingsPageView({
  initial,
  crmFields = null,
}: {
  initial: SettingsInitial;
  crmFields?: SettingsCrmFieldsPack | null;
}) {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageViewInner initial={initial} crmFields={crmFields} />
    </Suspense>
  );
}

type IntegrationItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  available: boolean;
};

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: "twilio-sms",
    name: "Twilio SMS & WhatsApp",
    category: "Communication",
    description:
      "Two-way SMS & WhatsApp messaging, automated campaigns, and inbound lead capture",
    available: true,
  },
  {
    id: "facebook-marketplace",
    name: "Facebook Marketplace",
    category: "Marketplace",
    description: "Marketplace lead capture",
    available: false,
  },
  {
    id: "facebook-instagram",
    name: "Facebook & Instagram",
    category: "Social",
    description: "Post content & manage Messenger/IG DMs",
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "Social",
    description: "Post videos & manage TikTok DMs",
    available: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Social",
    description: "Upload videos & manage YouTube channel",
    available: false,
  },
  {
    id: "google-my-business",
    name: "Google My Business",
    category: "Reviews",
    description: "Manage Google reviews & business profile",
    available: true,
  },
  {
    id: "google-ads",
    name: "Google Ads",
    category: "Advertising",
    description: "Google lead form extensions",
    available: false,
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "Communication",
    description: "Email parsing for inbound leads",
    available: false,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Calendar",
    description: "Sync appointments and availability with your CRM",
    available: true,
  },
  {
    id: "microsoft-outlook",
    name: "Microsoft Outlook",
    category: "Calendar",
    description: "Sync Outlook calendar events and meeting invites",
    available: true,
  },
];

function categoryPillClass(category: string) {
  const c = category.toLowerCase();
  if (c === "communication")
    return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200";
  if (c === "marketplace")
    return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200";
  if (c === "social")
    return "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/45 dark:text-fuchsia-200";
  if (c === "reviews")
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200";
  if (c === "advertising")
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200";
  if (c === "calendar")
    return "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function IntegrationsTab() {
  return (
    <div>
      <p className="text-sm text-text-secondary dark:text-zinc-400">
        Connect channels and tools to capture leads and keep conversations in
        one place.
      </p>
      <ul className="mt-6 space-y-3" role="list">
        {INTEGRATIONS.map((item) => (
          <li
            key={item.id}
            className="flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/90"
              aria-hidden
            >
              <Zap className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                  {item.name}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${categoryPillClass(item.category)}`}
                >
                  {item.category}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                {item.description}
              </p>
            </div>
            <div className="flex shrink-0 items-start pt-0.5">
              {item.available ? (
                item.id === "twilio-sms" ? (
                  <Link
                    href="/settings/integrations/twilio"
                    className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Configure
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Configure
                  </button>
                )
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl border border-transparent bg-transparent px-3.5 py-2 text-sm font-medium text-text-secondary/45 dark:text-zinc-500"
                >
                  Coming Soon
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileTab({ initial }: { initial: SettingsInitial }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profilePending, startProfile] = useTransition();
  const [pwdPending, startPwd] = useTransition();
  const [avatarPending, setAvatarPending] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);

  if (!initial.configured) {
    return (
      <p className="text-sm text-text-secondary">
        Configure Supabase to manage your profile.
      </p>
    );
  }

  const roleLabel =
    (initial.role && ROLE_LABELS[initial.role]) || initial.role || "—";

  async function onSaveProfile(formData: FormData) {
    setProfileMsg(null);
    setProfileErr(null);
    startProfile(async () => {
      const res = await updateProfile(formData);
      if ("error" in res && res.error) setProfileErr(res.error);
      else setProfileMsg("Profile saved.");
    });
  }

  async function onChangePassword(formData: FormData) {
    setPwdMsg(null);
    setPwdErr(null);
    startPwd(async () => {
      const res = await updatePassword(formData);
      if ("error" in res && res.error) setPwdErr(res.error);
      else {
        setPwdMsg("Password updated.");
        (document.getElementById("pwd-form") as HTMLFormElement | null)?.reset();
      }
    });
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarPending(true);
    const fd = new FormData();
    fd.set("avatar", file);
    const res = await uploadAvatar(fd);
    setAvatarPending(false);
    if ("error" in res && res.error) setProfileErr(res.error);
    else if ("url" in res && res.url) {
      setAvatarUrl(res.url);
      setProfileMsg("Photo updated.");
      setProfileErr(null);
    }
  }

  async function onRemoveAvatar() {
    setAvatarPending(true);
    const res = await removeAvatar();
    setAvatarPending(false);
    if ("error" in res && res.error) setProfileErr(res.error);
    else {
      setAvatarUrl(null);
      setProfileMsg("Photo removed.");
      setProfileErr(null);
    }
  }

  return (
    <div className="space-y-6">
      {initial.profileError ? (
        <p className="text-sm text-amber-800">{initial.profileError}</p>
      ) : null}

      {/* Personal Information */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <User className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Personal Information
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              Your account details and preferences
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-border bg-surface shadow-inner">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile photo"
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-text-secondary">
                  {initialsFrom(initial.fullName, initial.email)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickAvatar}
                />
                <button
                  type="button"
                  disabled={avatarPending}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-text-primary shadow-sm hover:bg-surface disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Change
                </button>
                <button
                  type="button"
                  disabled={avatarPending || !avatarUrl}
                  onClick={() => void onRemoveAvatar()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-text-primary shadow-sm hover:bg-surface disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </div>
              <p className="text-xs text-text-secondary">
                JPG, PNG, or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        <form action={onSaveProfile} className="mt-8 space-y-5">
          <div>
            <label htmlFor="settings-email" className={labelClass}>
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              readOnly
              value={initial.email ?? ""}
              className={`${inputClass} cursor-not-allowed bg-surface/60 text-text-secondary`}
            />
            <p className="mt-1 text-xs text-text-secondary">
              Email cannot be changed.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="full_name" className={labelClass}>
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={initial.fullName ?? ""}
                className={inputClass}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={initial.phone ?? ""}
                className={inputClass}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="role_display" className={labelClass}>
              Role
            </label>
            <select
              id="role_display"
              disabled
              value={initial.role ?? "agency_member"}
              className={`${inputClass} cursor-not-allowed bg-surface/60 text-text-secondary`}
            >
              <option value={initial.role ?? ""}>{roleLabel}</option>
            </select>
            <p className="mt-1 text-xs text-text-secondary">
              Role is assigned by an administrator.
            </p>
          </div>

          {profileErr ? (
            <p className="text-sm text-red-700" role="alert">
              {profileErr}
            </p>
          ) : null}
          {profileMsg ? (
            <p className="text-sm text-emerald-800">{profileMsg}</p>
          ) : null}

          <button
            type="submit"
            disabled={profilePending}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-60"
          >
            {profilePending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-text-primary">
            <KeyRound className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="text-base font-semibold text-text-primary">
            Change password
          </h2>
        </div>

        <form id="pwd-form" action={onChangePassword} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className={labelClass}>
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                placeholder="At least 6 characters"
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="confirm_password" className={labelClass}>
                Confirm password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
          </div>

          {pwdErr ? (
            <p className="text-sm text-red-700" role="alert">
              {pwdErr}
            </p>
          ) : null}
          {pwdMsg ? (
            <p className="text-sm text-emerald-800">{pwdMsg}</p>
          ) : null}

          <button
            type="submit"
            disabled={pwdPending}
            className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-primary shadow-sm hover:bg-surface disabled:opacity-60"
          >
            {pwdPending ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
