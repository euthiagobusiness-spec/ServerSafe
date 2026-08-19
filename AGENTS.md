# ServerSafe — guia para agentes

## Arquitetura

- O site institucional continua em `src/app/page.tsx` e `src/app/migracao-vmware-hyper-v/`. Não vincule a IA a menu, homepage, footer, sitemap ou navegação pública.
- O ServerSafe AI vive em `src/app/[slug]/page.tsx` e só responde quando `[slug]` coincide com `SERVERSAFE_AI_SLUG`.
- APIs da IA ficam em `src/app/[slug]/api/[...segments]/route.ts`: o namespace é `/<slug>/api/*`. Não crie equivalentes em `src/app/api`.
- Frontend, estilos, segurança, storage e execução isolada ficam em `src/features/server-safe-ai/`.
- Dados, locks e rate limit usam Upstash Redis. Nunca use filesystem de Function ou Sandbox como persistência.
- OpenHarness 0.1.9 executa em Vercel Sandbox por snapshot, usando Claude Haiku 4.5 no AWS Bedrock, `us-east-1`.

## Onde alterar

- Layout: `ServerSafeAIClient.tsx` e `server-safe-ai.module.css`.
- Backend: `src/app/[slug]/api/[...segments]/route.ts`.
- Limites/modelo/região: `config.ts`.
- Cookies e acesso: `security.ts`; persistência: `storage.ts`; OpenHarness/Skills: `sandbox.ts`.

## Segurança obrigatória

- Manter chave de acesso, cookies assinados HttpOnly, `SameSite=Strict`, `Secure` em produção, validação de origem e header anti-CSRF.
- Manter isolamento anônimo, storage e locks distribuídos, rate limit e limites de corpo, mensagem, histórico, resposta, conversa, buffer, turnos e duração.
- OpenHarness permanece em `plan`, ambiente reduzido, ferramentas perigosas negadas, Sandbox externo e sandbox interno fail-closed.
- Nunca habilitar `full_auto`, `dangerously-skip-permissions`, bash, filesystem irrestrito ou ferramentas de equipe/agentes.
- Nunca retornar stderr, prompts internos, chain-of-thought, JSON bruto de ferramentas ou secrets ao navegador.
- Nunca colocar credenciais em código, `NEXT_PUBLIC_*`, Git, logs, assets, fixtures, exemplos ou mensagens. Secrets reais ficam somente nas variáveis server-side da Vercel.

## Teste, build e deploy

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`
6. Com Vercel autenticada/vinculada, execute uma vez `npm run ai:snapshot` e cadastre o ID retornado.
7. Cadastre as variáveis de `.env.example` e execute `vercel deploy` para preview Hobby.

O snapshot não guarda conversas. A arquitetura é Hobby-compatible e Pro-ready por variáveis e adaptadores, sem redução de segurança.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
