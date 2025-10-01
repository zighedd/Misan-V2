-- Fonction sécurisée pour créer un profil utilisateur si absent
create or replace function public.ensure_user_profile(
  _user_id uuid,
  _email text,
  _name text,
  _role text,
  _subscription_type text,
  _subscription_status text,
  _subscription_start timestamptz,
  _subscription_end timestamptz,
  _tokens_balance integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_profiles (
    id,
    email,
    name,
    role,
    subscription_type,
    subscription_status,
    subscription_start,
    subscription_end,
    tokens_balance,
    trial_used
  ) values (
    _user_id,
    coalesce(_email, ''),
    coalesce(nullif(_name, ''), coalesce(_email, 'Utilisateur Misan')),
    coalesce(_role, 'premium'),
    coalesce(_subscription_type, 'premium'),
    coalesce(_subscription_status, 'active'),
    coalesce(_subscription_start, now()),
    _subscription_end,
    coalesce(_tokens_balance, 0),
    false
  )
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.ensure_user_profile(uuid, text, text, text, text, text, timestamptz, timestamptz, integer) to anon, authenticated;
