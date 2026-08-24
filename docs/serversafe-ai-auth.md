# ServerSafe AI — configuração local do Supabase Auth

Esta etapa adiciona Supabase Auth como uma camada posterior ao private slug. Ela não migra o Redis e não substitui o cookie legado `ssai_session`.

## Variáveis locais e Vercel futuras

Somente estas variáveis públicas são consumidas pelo código:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

A publishable key é pública por definição e depende de RLS. Não usar `service_role`, secret key, senha do banco ou access token da CLI no navegador, no Git ou em variáveis `NEXT_PUBLIC_*`.

## URLs a cadastrar posteriormente

Defina:

- `ORIGIN`: origem HTTPS exata do deployment autorizado, sem barra final.
- `PRIVATE_BASE`: `/<valor-de-SERVERSAFE_AI_SLUG>`.

Cadastre no Supabase Auth, após autorização explícita:

- Site URL: `ORIGIN + PRIVATE_BASE`
- Redirect URL: `ORIGIN + PRIVATE_BASE + /auth/callback`

O fluxo de recuperação envia ao Supabase a URL exata:

`ORIGIN + PRIVATE_BASE + /auth/callback?next=` seguida por `PRIVATE_BASE + /auth/update-password` codificado como query string.

Cada origem Preview autorizada precisa de sua própria Redirect URL ou de um padrão restrito aprovado. Não usar wildcard amplo. O callback aceita apenas o próprio `PRIVATE_BASE` ou `PRIVATE_BASE + /auth/update-password` como destino interno.

## Fluxo implementado

1. A rota confirma o private slug.
2. O proxy renova cookies Supabase sem redirecionar.
3. Página e APIs verificam o JWT com `getClaims()`.
4. Sem claims válidas, a página mostra login e as APIs retornam `401`.
5. Com claims válidas, `claims.sub` é a identidade equivalente a `auth.uid()`.
6. O profile próprio é criado idempotentemente pela sessão `authenticated`, sujeito a RLS.
7. O Redis continua isolado pelo cookie legado `ssai_session`; nenhuma migração ou dual-write ocorre nesta etapa.

## Pendências remotas

- desabilitar signup público;
- definir Site URL e Redirect URLs;
- configurar SMTP transacional;
- criar usuários somente por convite;
- configurar CAPTCHA/Turnstile em etapa futura;
- adicionar as duas variáveis públicas aos ambientes autorizados da Vercel.

Todas essas ações continuam exigindo autorização explícita.
