-- Additional lookup indexes for Meta Ad Intelligence foreign keys.

create index if not exists prospect_video_thumbnails_ad_intel_idx
  on public.prospect_video_thumbnails (prospect_ad_intel_id);

create index if not exists prospect_video_thumbnail_usage_user_date_idx
  on public.prospect_video_thumbnail_usage (user_id, usage_date desc);
