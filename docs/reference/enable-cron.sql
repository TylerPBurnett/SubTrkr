-- Enable automated daily notifications via pg_cron
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bpgsfyallqqvvtjorybl/sql

-- Store project URL in Vault (for cron job to call Edge Function)
SELECT vault.create_secret(
  'https://bpgsfyallqqvvtjorybl.supabase.co',
  'project_url'
);

-- Store anon key in Vault (for cron job authorization)
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ3NmeWFsbHFxdnZ0am9yeWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjM4OTEsImV4cCI6MjA4NDY5OTg5MX0.sj5SH8t80RFRF2HQuCG9dxFgJS5cylUjirbvF57g4w4',
  'anon_key'
);

-- Schedule daily notification check at 8:00 AM UTC
SELECT cron.schedule(
  'daily-notification-check',
  '0 8 * * *',  -- Every day at 8:00 AM UTC
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := jsonb_build_object('scheduled', true, 'time', now()),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- Verify the cron job was created
SELECT
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'daily-notification-check';
