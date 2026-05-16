-- Lead deletion previously failed silently (the app filtered by owner_id which
-- excluded unassigned webhook-imported leads) and, even when scoped correctly,
-- would still have been blocked by FK constraints on dependent tables that
-- defaulted to NO ACTION. Application logic now relies on RLS for permissions
-- (`agency_all_lead`); this migration aligns the FK ON DELETE behavior with
-- the product semantics so a permitted delete actually succeeds.
--
-- Behavior:
--   - cascade: data is conceptually owned by the lead and is meaningless
--     without it (intel reports, signal hits computed for that lead).
--   - set null: data is a first-class record that has independent value
--     even after the lead is removed (calendar appointments, conversation
--     threads, sales proposals that may be re-targeted, audit/webhook
--     logs that document delivery history).
--
-- Tables already on cascade (`deal`, `lead_tag_assignment`) are unchanged.

begin;

-- appointment.lead_id : preserve appointments, just unlink them.
alter table public.appointment
  drop constraint if exists appointment_lead_id_fkey;
alter table public.appointment
  add constraint appointment_lead_id_fkey
    foreign key (lead_id) references public.lead (id) on delete set null;

-- conversation.lead_id : preserve conversation threads, unlink.
alter table public.conversation
  drop constraint if exists conversation_lead_id_fkey;
alter table public.conversation
  add constraint conversation_lead_id_fkey
    foreign key (lead_id) references public.lead (id) on delete set null;

-- prospect_intel_report.lead_id : derived per-lead data, cascade.
alter table public.prospect_intel_report
  drop constraint if exists prospect_intel_report_lead_id_fkey;
alter table public.prospect_intel_report
  add constraint prospect_intel_report_lead_id_fkey
    foreign key (lead_id) references public.lead (id) on delete cascade;

-- prospect_signal_hit.lead_id : derived per-lead data, cascade.
alter table public.prospect_signal_hit
  drop constraint if exists prospect_signal_hit_lead_id_fkey;
alter table public.prospect_signal_hit
  add constraint prospect_signal_hit_lead_id_fkey
    foreign key (lead_id) references public.lead (id) on delete cascade;

-- sales_proposal.lead_id : proposal docs may outlive the lead.
alter table public.sales_proposal
  drop constraint if exists sales_proposal_lead_id_fkey;
alter table public.sales_proposal
  add constraint sales_proposal_lead_id_fkey
    foreign key (lead_id) references public.lead (id) on delete set null;

-- facebook_lead_event_log.lead_id : keep audit log, unlink.
alter table public.facebook_lead_event_log
  drop constraint if exists facebook_lead_event_log_lead_id_fkey;
alter table public.facebook_lead_event_log
  add constraint facebook_lead_event_log_lead_id_fkey
    foreign key (lead_id) references public.lead (id) on delete set null;

commit;
