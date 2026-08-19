# ServerSafe Migration Sales

Workspace operacional interno para prospeccao e venda assistida por IA do
servico de migracao ServerSafe. O objetivo e gerar oportunidades qualificadas
com ticket desejado a partir de R$ 30.000, priorizando evidencia, qualidade,
reputacao e controle humano.

## Separacao do site publico

Esta pasta nao e importada por `src/app` e nao altera a landing page. Dados de
prospects, mensagens e relatorios sao internos e nao devem ser publicados.

## Fonte de verdade inicial

- `data/prospects.json`: empresas e contatos, sem duplicidade por dominio ou
  email normalizado.
- `data/interactions.json`: contatos, respostas, reunioes e notas.
- `data/suppressions.json`: opt-outs e bloqueios de envio.
- `data/activity-log.json`: trilha append-only de acoes e erros.
- `config/scoring.json`: pesos do score 0-100.
- `config/pipeline.json`: estagios e transicoes permitidas.

O armazenamento em JSON e uma fundacao local, simples e migravel. O esquema
PostgreSQL de destino esta em `db/postgres-schema.sql`, mas nao foi aplicado a
nenhum provedor.

## Operacao segura

1. Pesquisar a empresa e registrar fontes.
2. Separar fatos, inferencias e hipoteses.
3. Calcular o score; hipoteses nao somam pontos.
4. Preparar mensagem personalizada somente a partir de evidencia.
5. Respeitar `APPROVALS.md` antes de criar ou enviar qualquer resposta.
6. Registrar toda acao e toda mudanca de estagio.
7. Bloquear imediatamente qualquer endereco em `suppressions.json`.

## Validacao

```bash
npm run sales:validate
npm run sales:test
```

Os validadores recusam IDs, dominios e emails duplicados; scores fora do
intervalo; estagios invalidos; referencias quebradas; e proximas acoes em
prospects marcados como opt-out.

## Documentos

- `ICP.md`: perfil ideal e criterios de descarte.
- `SCORING.md`: modelo de pontuacao e regra de evidencia.
- `PIPELINE.md`: estagios, transicoes e historico.
- `PLAYBOOK.md`: rotina de pesquisa, qualificacao e cadencia.
- `APPROVALS.md`: autonomia A/B/C e human-in-the-loop.
- `MESSAGING.md`: biblioteca de mensagens.
- `REPORTING.md`: relatorio executivo e metricas.
- `AUTOMATIONS.md`: arquitetura de automacao gradual.
- `INTEGRATIONS.md`: inventario verificado e pendencias.
- `DIAGNOSTIC.md`: auditoria da aplicacao e do deployment.
