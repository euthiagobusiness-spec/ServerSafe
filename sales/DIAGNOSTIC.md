# Diagnostico do projeto

Atualizado em 2026-08-14.

## Publicacao

- Producao e dominio customizado: `https://serversafe.com.br/`
- Landing de migracao: `https://serversafe.com.br/migracao-vmware-hyper-v`
- Hospedagem: Vercel, confirmada pelos cabecalhos HTTP `Server: Vercel`,
  `X-Vercel-Cache` e `X-Vercel-Id`.
- Ambas as rotas responderam `200 OK` em 2026-08-14.
- URL `*.vercel.app` e previews: nao identificados. O conector Vercel devolveu
  zero times e zero projetos para o escopo autenticado.
- `www.serversafe.com.br`: CNAME para o dominio raiz, mas a verificacao HTTPS
  apresentou falha de certificado no ambiente de diagnostico.

## Aplicacao

- Next.js 16.2.6, React 19.2.6, TypeScript e Tailwind CSS 4.
- App Router com rotas `/` e `/migracao-vmware-hyper-v`.
- Conteudo centralizado em `src/config`.
- Componentes separados em layout, secoes e UI reutilizavel.
- Ancoras com scroll suave e animacoes que respeitam movimento reduzido.
- SEO basico por Metadata e Open Graph.

## Captura e integracoes no codigo

- Formulario da landing valida nome, email, empresa e telefone no cliente.
- Envio atual abre `mailto:`; nao existe captura server-side ou persistencia.
- WhatsApp e email sao os unicos canais ativos no codigo.
- Nao existem API routes, banco, auth, CRM, webhooks, analytics, pixels ou SDK
  de servico externo.
- Nao existem arquivos `.env`, `.mcp.json`, `vercel.json`, `.vercel/project.json`
  ou `AGENTS.md` local.
- O diretorio nao contem `.git`.

## Validacao tecnica

- `npm run lint`: aprovado em 2026-08-13.
- `npm run typecheck`: aprovado em 2026-08-13.
- A build local foi bloqueada pela politica do Windows aplicada aos bindings
  nativos de Next SWC/Tailwind Oxide. A producao ativa comprova que uma build
  compativel foi concluida na Vercel.
- `npm audit` reportou 7 vulnerabilidades (1 baixa, 6 altas), ainda sem triagem.

## Riscos imediatos

1. Leads do formulario nao sao capturados se o visitante nao concluir o envio
   no proprio cliente de email.
2. O checkout local nao tem metadados do deployment ou historico Git.
3. Nao ha privacidade/termos completos; os links atuais sao ancoras.
4. Nao ha analytics para medir conversao.
5. Nao ha banco ou trilha comercial integrada ao site.
6. A URL do provedor e previews nao sao recuperaveis pelo escopo atual do
   conector Vercel.
