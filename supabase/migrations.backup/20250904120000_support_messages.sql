create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  user_email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

comment on table public.support_messages is 'Support requests submitted from the public website footer modal.';
comment on column public.support_messages.user_email is 'Email address provided by the requester.';
comment on column public.support_messages.subject is 'Short subject describing the support inquiry.';
comment on column public.support_messages.message is 'Detailed message content submitted by the user.';
