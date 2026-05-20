-- Every staff member (including super_admin) sees only leads they own.

drop policy if exists "agency_all_lead" on public.lead;
create policy "agency_all_lead" on public.lead for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
    and owner_id = auth.uid()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
    and owner_id = auth.uid()
  );
