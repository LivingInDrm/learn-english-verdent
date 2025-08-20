-- 创建attempts表，用于存储用户描述和AI反馈
create table attempts(
  id uuid primary key default gen_random_uuid(),
  install_id text not null,
  user_id uuid null,
  scene_id text not null,
  input_text text not null,
  detail_score int null check (detail_score >= 1 and detail_score <= 5),
  accuracy_note text null,
  suggested_revision text null,
  keywords text[] null,
  image_url text null,
  status text not null check (status in ('partial','ok','text_only','blocked','error')),
  latency_eval_ms int null,
  latency_image_ms int null,
  created_at timestamptz default now()
);

-- 创建索引以提高查询性能
create index idx_attempts_install_id on attempts(install_id);
create index idx_attempts_created_at on attempts(created_at desc);
create index idx_attempts_status on attempts(status);

-- 为性能监控创建视图
create view attempt_stats as
select 
  status,
  count(*) as count,
  avg(latency_eval_ms) as avg_eval_latency,
  avg(latency_image_ms) as avg_image_latency,
  percentile_cont(0.95) within group (order by latency_eval_ms) as p95_eval_latency,
  percentile_cont(0.95) within group (order by latency_image_ms) as p95_image_latency
from attempts 
where created_at >= now() - interval '24 hours'
group by status;