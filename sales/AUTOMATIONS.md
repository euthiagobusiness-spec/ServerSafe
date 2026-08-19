# Automacoes

## Principio

Automatizar leitura, classificacao, priorizacao e rascunhos antes de automatizar
envio. Toda execucao registra timestamp, acao, empresa, contato, motivo, input,
resultado, status, erro e proxima acao.

## Fases

1. Manual assistido: pesquisa, score, deduplicacao e rascunhos.
2. Gmail read-only: localizar threads, respostas e opt-outs.
3. Rascunhos: criar drafts de Nivel A/B sem enviar.
4. Relatorio diario: consolidar prioridades e respostas.
5. Alertas: avisar eventos de alto valor ou risco.
6. Nivel A automatico: somente apos amostra aprovada e medicao de erro.

## Codex Automations

Uso recomendado:

- tarefa local diaria para validar dados e gerar relatorio;
- monitor de inbox em horario comercial, inicialmente apenas leitura;
- alerta quando regras de `REPORTING.md` forem satisfeitas.

## Ativa

- `Relatorio diario ServerSafe`: heartbeat diario as 08:00 no fuso local
  America/Manaus, vinculado a tarefa do projeto. Opera em leitura/relatorio,
  valida os dados e nao envia emails nem avanca pipeline sem aprovacao.

Pendencias para outras automacoes: origem definitiva dos prospects, politica
de notificacao para alertas imediatos e autorizacao explicita para qualquer
envio.

## Controles

- limite diario configuravel;
- idempotencia por `prospectId + etapa + mensagem`;
- supressao verificada imediatamente antes de preparar/enviar;
- retries limitados e registrados;
- nenhum fallback que transforme rascunho em envio;
- falha parcial nao avanca pipeline.
