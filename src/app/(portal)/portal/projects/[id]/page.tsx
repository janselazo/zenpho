import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function PortalProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();

  if (!profile?.client_id) notFound();

  const { data: project, error: pErr } = await supabase
    .from("project")
    .select("id, title, status, description, target_date")
    .eq("id", id)
    .eq("client_id", profile.client_id)
    .maybeSingle();

  if (pErr || !project) notFound();

  const { data: tasks, error: tErr } = await supabase
    .from("task")
    .select("id, title, status, due_date, client_visible")
    .eq("project_id", id)
    .eq("client_visible", true)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <Link
        href="/portal"
        className="text-sm text-accent hover:underline"
      >
        ← All projects
      </Link>
      <h1 className="mt-4 heading-display text-2xl font-bold text-text-primary">
        {project.title}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Status: <span className="font-medium">{project.status}</span>
        {project.target_date ? ` · Target ${project.target_date}` : ""}
      </p>
      {project.description ? (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          {project.description}
        </p>
      ) : null}

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Timeline
      </h2>
      {tErr ? (
        <p className="mt-2 text-sm text-red-600">{tErr.message}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {(tasks ?? []).length === 0 ? (
            <li className="text-sm text-text-secondary">
              No shared tasks yet. Your agency can mark tasks as visible to
              you.
            </li>
          ) : (
            (tasks ?? []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3"
              >
                <span className="text-sm font-medium text-text-primary">
                  {t.title}
                </span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {t.status}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
