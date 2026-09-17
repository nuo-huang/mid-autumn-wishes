-- 在专用 Supabase 项目执行一次。只新增本应用对象，不删除旧表或旧留言。
begin;
create table if not exists public.moon_messages (
 id bigint generated always as identity primary key,
 name text not null check (char_length(btrim(name)) between 1 and 24),
 body text not null check (char_length(btrim(body)) between 1 and 280),
 created_at timestamptz not null default now()
);
create index if not exists moon_messages_created_at_idx on public.moon_messages(created_at);
alter table public.moon_messages enable row level security;
revoke all on public.moon_messages from anon, authenticated;
revoke all on sequence public.moon_messages_id_seq from anon, authenticated;

create or replace function public.moon_list_messages()
returns jsonb language sql security definer set search_path = '' as $$
 select jsonb_build_object('messages',coalesce(jsonb_agg(row_to_json(m) order by m.id desc),'[]'::jsonb))
 from (select id,name,body,created_at as "createdAt" from public.moon_messages order by id desc limit 50) m;
$$;

create or replace function public.moon_add_message(p_name text,p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.moon_messages;
begin
 if p_name is null or p_body is null
   or char_length(btrim(p_name)) not between 1 and 24
   or char_length(btrim(p_body)) not between 1 and 280 then
  return jsonb_build_object('error','昵称限24字，祝福限280字，且不能为空','status',400);
 end if;
 -- 在同一事务中串行检查限流与插入，多个云函数实例也不会绕过额度。
 perform pg_advisory_xact_lock(17092026,8787);
 if (select count(*) from public.moon_messages where created_at>clock_timestamp()-interval '1 minute')>=30 then
  return jsonb_build_object('error','此刻留言较多，请一分钟后再试','status',429);
 end if;
 if (select count(*) from public.moon_messages)>=10000 then
  return jsonb_build_object('error','留言板暂时已满，请联系站点主人','status',503);
 end if;
 insert into public.moon_messages(name,body) values(btrim(p_name),btrim(p_body)) returning * into saved;
 return jsonb_build_object('message',jsonb_build_object('id',saved.id,'name',saved.name,'body',saved.body,'createdAt',saved.created_at));
end;
$$;

revoke all on function public.moon_list_messages() from public,anon,authenticated;
revoke all on function public.moon_add_message(text,text) from public,anon,authenticated;
grant execute on function public.moon_list_messages() to service_role;
grant execute on function public.moon_add_message(text,text) to service_role;
commit;
