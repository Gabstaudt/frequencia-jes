-- =====================================================================
-- Frequência JES — esquema do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Perfis (1 por conta). Criado automaticamente no cadastro.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  data_nascimento date,
  estuda boolean not null default false,
  universidade text,
  estado char(2),
  aceite_termos_em timestamptz,
  is_admin boolean not null default false,
  is_master boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, data_nascimento, estuda, universidade, estado, aceite_termos_em)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'data_nascimento', '')::date,
    coalesce((new.raw_user_meta_data ->> 'estuda')::boolean, false),
    nullif(new.raw_user_meta_data ->> 'universidade', ''),
    nullif(new.raw_user_meta_data ->> 'estado', ''),
    case when (new.raw_user_meta_data ->> 'aceite_termos') = 'true' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Frequências (marcações). Aberta = desbloqueio_em <= agora e não fechada.
-- ---------------------------------------------------------------------
create table if not exists public.frequencias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dia int not null check (dia >= 1),
  marcacao int not null default 1 check (marcacao >= 1),
  palavra_chave text not null,
  desbloqueio_em timestamptz not null,
  fechada boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists frequencias_dia_idx on public.frequencias (dia, marcacao);

-- ---------------------------------------------------------------------
-- Presenças. Uma por pessoa por frequência.
-- ---------------------------------------------------------------------
create table if not exists public.presencas (
  id uuid primary key default gen_random_uuid(),
  frequencia_id uuid not null references public.frequencias (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  origem text not null default 'palavra' check (origem in ('palavra', 'manual')),
  marcado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (frequencia_id, user_id)
);
create index if not exists presencas_user_idx on public.presencas (user_id);

-- ---------------------------------------------------------------------
-- Configuração do evento (linha única).
-- ---------------------------------------------------------------------
create table if not exists public.config (
  id int primary key default 1 check (id = 1),
  evento_nome text not null default 'JES',
  horas_por_dia numeric not null default 4,
  regra text not null default 'percentual' check (regra in ('soma', 'percentual', 'minimo')),
  regra_percentual int not null default 50 check (regra_percentual between 0 and 100),
  certificados_liberados boolean not null default false,
  liberados_em timestamptz
);
insert into public.config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Modelos de certificado (um por tipo): arte + blocos de texto + QR.
-- ---------------------------------------------------------------------
create table if not exists public.modelos_certificado (
  id uuid primary key default gen_random_uuid(),
  tipo text not null unique,
  imagem_path text,
  imagem_largura int,
  imagem_altura int,
  blocos jsonb not null default '[]'::jsonb,
  qr jsonb not null default '{"x": 84, "y": 76, "tamanho": 11, "ativo": true}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.modelos_certificado (tipo, blocos) values
('Participante', '[
  {"id":"titulo","texto":"CERTIFICADO","x":10,"y":18,"largura":80,"tamanho":40,"alinhamento":"centro","fonte":"helvetica","negrito":true,"cor":"#151922"},
  {"id":"corpo","texto":"Certificamos que {{nome}} participou do {{evento}}, com carga horária de {{horas}} horas.","x":12,"y":40,"largura":76,"tamanho":18,"alinhamento":"centro","fonte":"helvetica","negrito":false,"cor":"#151922"},
  {"id":"data","texto":"Emitido em {{data_emissao}}","x":12,"y":62,"largura":76,"tamanho":12,"alinhamento":"centro","fonte":"helvetica","negrito":false,"cor":"#3D4350"},
  {"id":"codigo","texto":"Código de validação: {{codigo}}\nValide em {{link_validacao}}","x":40,"y":80,"largura":42,"tamanho":9,"alinhamento":"direita","fonte":"helvetica","negrito":false,"cor":"#3D4350"}
]'::jsonb),
('Palestrante', '[
  {"id":"titulo","texto":"CERTIFICADO","x":10,"y":18,"largura":80,"tamanho":40,"alinhamento":"centro","fonte":"helvetica","negrito":true,"cor":"#151922"},
  {"id":"corpo","texto":"Certificamos que {{nome}} ministrou palestra no {{evento}}, com carga horária de {{horas}} horas.","x":12,"y":40,"largura":76,"tamanho":18,"alinhamento":"centro","fonte":"helvetica","negrito":false,"cor":"#151922"},
  {"id":"data","texto":"Emitido em {{data_emissao}}","x":12,"y":62,"largura":76,"tamanho":12,"alinhamento":"centro","fonte":"helvetica","negrito":false,"cor":"#3D4350"},
  {"id":"codigo","texto":"Código de validação: {{codigo}}\nValide em {{link_validacao}}","x":40,"y":80,"largura":42,"tamanho":9,"alinhamento":"direita","fonte":"helvetica","negrito":false,"cor":"#3D4350"}
]'::jsonb),
('Organizador', '[
  {"id":"titulo","texto":"CERTIFICADO","x":10,"y":18,"largura":80,"tamanho":40,"alinhamento":"centro","fonte":"helvetica","negrito":true,"cor":"#151922"},
  {"id":"corpo","texto":"Certificamos que {{nome}} integrou a comissão organizadora do {{evento}}, com carga horária de {{horas}} horas.","x":12,"y":40,"largura":76,"tamanho":18,"alinhamento":"centro","fonte":"helvetica","negrito":false,"cor":"#151922"},
  {"id":"data","texto":"Emitido em {{data_emissao}}","x":12,"y":62,"largura":76,"tamanho":12,"alinhamento":"centro","fonte":"helvetica","negrito":false,"cor":"#3D4350"},
  {"id":"codigo","texto":"Código de validação: {{codigo}}\nValide em {{link_validacao}}","x":40,"y":80,"largura":42,"tamanho":9,"alinhamento":"direita","fonte":"helvetica","negrito":false,"cor":"#3D4350"}
]'::jsonb)
on conflict (tipo) do nothing;

-- ---------------------------------------------------------------------
-- Palestrantes, organizadores e outros (não precisam de conta).
-- ---------------------------------------------------------------------
create table if not exists public.pessoas_extras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  tipo text not null,
  horas numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Certificados emitidos.
-- ---------------------------------------------------------------------
create table if not exists public.certificados (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  tipo text not null,
  nome text not null,
  email text not null,
  user_id uuid references public.profiles (id) on delete set null,
  pessoa_extra_id uuid references public.pessoas_extras (id) on delete set null,
  horas numeric not null,
  emitido_em timestamptz not null default now(),
  invalidado boolean not null default false,
  invalidado_em timestamptz
);
create unique index if not exists certificados_user_tipo_uidx on public.certificados (user_id, tipo) where user_id is not null and pessoa_extra_id is null;
create unique index if not exists certificados_extra_uidx on public.certificados (pessoa_extra_id) where pessoa_extra_id is not null;
create index if not exists certificados_email_idx on public.certificados (lower(email));

-- ---------------------------------------------------------------------
-- Segurança: RLS ligado em tudo. O app acessa os dados pelo servidor
-- (service role) depois de checar o usuário; o navegador só fala com a
-- autenticação. Assim a palavra-chave nunca chega ao participante.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.frequencias enable row level security;
alter table public.presencas enable row level security;
alter table public.config enable row level security;
alter table public.modelos_certificado enable row level security;
alter table public.pessoas_extras enable row level security;
alter table public.certificados enable row level security;

drop policy if exists "perfil próprio" on public.profiles;
create policy "perfil próprio" on public.profiles for select using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- Storage: bucket privado para as artes dos certificados.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('modelos', 'modelos', false)
on conflict (id) do nothing;

-- =====================================================================
-- DEPOIS DE CRIAR SUA CONTA NO SITE, rode (troque pelo seu e-mail):
--
--   update public.profiles set is_admin = true, is_master = true
--   where lower(email) = lower('seu@email.com');
-- =====================================================================
