# Frequência JES

Plataforma de validação de presença do JES. O participante marca presença digitando uma palavra-chave e a plataforma calcula a carga horária. Depois emite certificados em PDF com código e QR code de validação.

**Stack:** Next.js 15 (App Router) + Supabase (login, e-mail, banco e arquivos). O deploy foi pensado para a Vercel.

## O que tem

**Participante**
- Cadastro com nome completo, e-mail, senha, data de nascimento, universidade (se estuda), estado e aceite LGPD.
- Confirmação de e-mail e recuperação de senha.
- Login obrigatório. O link de uma frequência (`/f/<id>`) mostra a frequência, pede login e depois volta para ela.
- Marcação por palavra-chave. A comparação ignora maiúsculas, acentos e espaços.
- Lista de frequências por dia, com o status de cada uma e o resumo do dia.
- Certificados na conta, com código, QR code e download em PDF, depois que a organização libera.

**Admin**
- **Frequências:** criação, edição e exclusão. Cada uma abre sozinha no horário de desbloqueio e pode ser fechada ou reaberta manualmente. Tem link direto para copiar.
- **Detalhe da frequência:** quem marcou (dados, horário e origem, com busca), quem ainda não marcou e presença manual.
- **Presenças por dia:** filtro de incompletos (marcou 1 de 2) e presença manual. O dia só conta com as 2 marcações.
- **Certificados:**
  - modelo por tipo: arte PNG/JPG mais textos com campos `{{nome}}`, `{{horas}}` etc., posicionados arrastando, e QR code;
  - regra de carga horária: soma, percentual ou mínimo;
  - palestrantes, organizadores e outros tipos, sem precisar de conta;
  - emissão, liberação, invalidação e download em ZIP.
- **Métricas:** faixa etária, universidade, estado, presenças por frequência.
- **Exportação CSV:** participantes, presenças e certificados. Abre direto no Excel.
- **Admins:** vários admins com todas as permissões. Só a admin master adiciona ou remove admins.

**Público:** `/validar` confere qualquer certificado pelo código ou pelo QR code.

---

## Colocando no ar (passo a passo)

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com). O plano gratuito atende o evento.
2. Abra **SQL Editor**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication → URL Configuration**:
   - **Site URL:** o endereço do site, ex. `https://frequencia-jes.vercel.app`
   - **Redirect URLs:** adicione `https://frequencia-jes.vercel.app/**`. Para testar localmente, adicione também `http://localhost:3000/**`.
4. Em **Authentication → Emails → Templates**:
   - **Confirm signup:** cole o conteúdo de [`supabase/emails/confirmar-cadastro.html`](supabase/emails/confirmar-cadastro.html). Assunto sugerido: `Confirme seu e-mail · Frequência JES`.
   - **Reset password:** cole [`supabase/emails/recuperar-senha.html`](supabase/emails/recuperar-senha.html). Assunto sugerido: `Criar nova senha · Frequência JES`.

   Esses modelos fazem o link funcionar mesmo que a pessoa abra o e-mail em outro aparelho. Também levam a pessoa de volta para a frequência que ela abriu.
5. **Importante para o evento: configure um SMTP próprio** em **Authentication → Emails → SMTP Settings**.
   - O e-mail padrão do Supabase envia só poucos e-mails por hora e não dá conta de dezenas de cadastros ao mesmo tempo.
   - Serviços gratuitos que funcionam bem: [Resend](https://resend.com) e [Brevo](https://www.brevo.com).
   - Depois, em **Authentication → Rate Limits**, aumente o limite de e-mails por hora.
6. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secreta)

### 2. Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe este repositório.
2. Em **Environment Variables**, cadastre:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (nunca compartilhe) |
| `NEXT_PUBLIC_SITE_URL` | endereço final do site, sem `/` no fim |

3. Clique em **Deploy**. Se trocar o domínio depois, atualize `NEXT_PUBLIC_SITE_URL` e as URLs do passo 1.3.

### 3. Virar admin master

1. Abra o site e crie sua conta normalmente. Confirme o e-mail.
2. No **SQL Editor** do Supabase, rode o comando abaixo trocando pelo seu e-mail:

```sql
update public.profiles set is_admin = true, is_master = true
where lower(email) = lower('seu@email.com');
```

3. Entre de novo no site. Você cai direto no painel `/admin`. Outros admins você adiciona pela tela **Admins**; a pessoa precisa ter criado conta antes.

---

## Usando no evento

1. **Antes:**
   - Crie as frequências em **Frequências → Nova frequência**: Dia 1 · Marcação 1, Dia 1 · Marcação 2 e assim por diante, cada uma com palavra-chave e horário de desbloqueio.
   - Divulgue o link de cadastro para os participantes criarem conta com antecedência.
2. **Na palestra:**
   - A frequência abre sozinha no horário de desbloqueio.
   - Anuncie a palavra-chave e mande o link pelo botão **Copiar link**. Você pode colocar o link num QR code no slide.
   - Quando quiser, clique em **Fechar**.
3. **No fim do dia:**
   - Em **Presenças**, filtre **Só incompletos** para ver quem marcou só uma das duas.
   - Se for o caso, use **Marcar manual**.
4. **Certificados:**
   - **Modelos:** para cada tipo, envie a arte (PNG ou JPG, até 4 MB, **sem** os textos que mudam) e ajuste os textos e o QR code arrastando. Confira em **Ver PDF de teste**.
   - **Regra e pessoas:** escolha a regra (ex.: Percentual, 50%). Adicione palestrantes e organizadores com tipo e carga horária.
   - **Emitir:** clique em **Emitir e liberar certificados**. Cada pessoa passa a ver e baixar o seu na conta. Se mudar a regra ou os dados, emita de novo; os códigos de quem já tinha certificado continuam os mesmos.

### Campos do certificado

| Campo | Vira |
| --- | --- |
| `{{nome}}` | nome completo |
| `{{horas}}` | carga horária |
| `{{evento}}` | nome do evento (configurável na regra) |
| `{{data_emissao}}` | data de emissão |
| `{{tipo}}` | Participante, Palestrante, Organizador… |
| `{{codigo}}` | código de validação, ex. `JES-7K2P-91QD` |
| `{{link_validacao}}` | endereço da página de validação |

O QR code é um elemento separado, que você arrasta para o lugar que quiser ou desliga.

### Regras de carga horária

- Um **dia completo** exige todas as marcações daquele dia. Com só uma, o dia é perdido.
- **Soma:** horas = dias completos × horas por dia.
- **Percentual:** acima de X% dos dias completos, a pessoa ganha a carga horária cheia do evento; abaixo, não recebe certificado.
- **Mínimo:** a partir de X% dos dias completos, a pessoa recebe a soma das horas; abaixo, não recebe.

---

## Rodando localmente

```bash
cp .env.example .env.local   # preencha com as chaves do Supabase
npm install
npm run dev                  # http://localhost:3000
npm test                     # testes da regra de horas e dos campos
```

## Segurança

- A palavra-chave nunca vai para o navegador do participante. Toda consulta ao banco acontece no servidor, depois de verificar quem é o usuário.
- O RLS está ligado em todas as tabelas. A `service_role` fica só no servidor.
- Uma presença por pessoa por frequência, garantida pelo banco.
- O bucket das artes é privado.

## Ajustes comuns

- **Fuso horário:** fixado em Belém (UTC−3) em `src/lib/frequencia.ts`.
- **Lista de universidades do cadastro:** `UNIVERSIDADES` em `src/app/(auth)/forms.tsx`. A opção "Outra" permite digitar o nome.
- **Cores:** variáveis em `src/app/globals.css`.
