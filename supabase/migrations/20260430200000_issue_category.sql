-- Issue taxonomy: feature vs bug vs customer request
alter table public.issue
  add column if not exists category text not null default 'bug_report';

alter table public.issue drop constraint if exists issue_category_check;

alter table public.issue
  add constraint issue_category_check check (
    category in ('feature_request', 'bug_report', 'customer_request')
  );

comment on column public.issue.category is
  'Issue kind: feature_request, bug_report, or customer_request.';
