"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MockTeamMember } from "@/lib/crm/mock-data";
import {
  mergeTeamMembersWithProfileAvatars,
  readStoredTeamMembers,
  type ProfileAvatarRow,
} from "@/lib/crm/team-members-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

/**
 * Team roster persisted from the Team page (localStorage), merged with
 * `profiles.avatar_url` when Supabase is configured (match by member id or email).
 * Updates when members change or another tab fires `storage`.
 */
export function useCrmTeamMembers() {
  const [members, setMembers] = useState<MockTeamMember[]>(() =>
    readStoredTeamMembers()
  );
  const profileRowsRef = useRef<ProfileAvatarRow[] | null>(null);

  const recompute = useCallback(() => {
    const base = readStoredTeamMembers();
    const rows = profileRowsRef.current;
    setMembers(
      rows && rows.length > 0
        ? mergeTeamMembersWithProfileAvatars(base, rows)
        : base
    );
  }, []);

  useEffect(() => {
    recompute();
    const onStorage = () => recompute();
    window.addEventListener("storage", onStorage);
    window.addEventListener("crm-team-members-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("crm-team-members-changed", onStorage);
    };
  }, [recompute]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      profileRowsRef.current = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, avatar_url");
        if (cancelled) return;
        if (error || !data) {
          profileRowsRef.current = null;
        } else {
          profileRowsRef.current = data as ProfileAvatarRow[];
        }
        recompute();
      } catch {
        if (!cancelled) {
          profileRowsRef.current = null;
          recompute();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recompute]);

  return members;
}
