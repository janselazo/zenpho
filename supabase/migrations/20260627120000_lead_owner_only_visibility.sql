-- Lead visibility: only super_admin sees org-wide leads.
-- Admins and users see leads they own (owner_id = auth.uid()).

drop policy if exists "agency_all_lead" on public.lead;
create policy "agency_all_lead" on public.lead for all
  using (
    public.is_super_admin()
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  );
