# ServerSafe Landing Page

Landing page institucional premium para a ServerSafe, construída com Next.js,
TypeScript e Tailwind CSS.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## ServerSafe AI

A IA está integrada ao mesmo Next.js por uma rota privada definida em
`SERVERSAFE_AI_SLUG`. Ela não é vinculada à navegação pública nem ao sitemap.
O acesso usa chave server-side e cookies assinados HttpOnly; conversas e
projetos persistem no Upstash Redis. O OpenHarness roda em Vercel Sandbox com
Claude Haiku 4.5 via AWS Bedrock em `us-east-1`.

Consulte [`AGENTS.md`](./AGENTS.md) para arquitetura, segurança, manutenção,
testes, snapshot e deploy. Os nomes das variáveis estão em [`.env.example`](./.env.example).

## Operacao comercial

A landing permanece isolada da operacao interna. O sistema comercial assistido
por IA fica em [`sales/`](./sales/README.md), com ICP, scoring, pipeline,
politicas de aprovacao, mensagens, dados locais migraveis e validacoes.

```bash
npm run sales:validate
npm run sales:test
```

## Direção visual

Visual claro, institucional e profissional para infraestrutura empresarial,
com superfícies brancas, cinzas frios, azul técnico moderado, bordas finas,
sombras discretas e interações leves apenas onde agregam refinamento.
