# Integracoes verificadas

Atualizado em 2026-08-14. Disponibilidade de ferramenta nao implica permissao
para executar acoes comerciais de escrita.

## Conectadas e verificadas

### Gmail

- Conta autenticada: `euthiagobusiness@gmail.com`.
- Capacidades: busca, leitura de mensagens e threads, anexos, classificacao,
  labels, criacao/edicao de rascunhos e envio.
- Uso inicial aprovado: leitura, associacao de threads, classificacao e criacao
  de rascunhos. Envio segue `APPROVALS.md`.

### Google Drive / Sheets

- Conta autenticada: `euthiagobusiness@gmail.com`.
- Pode ser usado para exportacao ou visao colaborativa, mas nao sera a fonte
  primaria enquanto o modelo relacional e o controle de historico nao forem
  validados.

### Vercel

- App conectado e permissao global configurada para acoes de baixo risco.
- Producao confirmada publicamente no dominio `serversafe.com.br`.
- Limitacao: o escopo consultado retorna zero times e zero projetos; por isso
  nao foi possivel obter o project ID, deployment ID, URL `vercel.app`, previews,
  variaveis ou logs.

### Supabase

- Conector autenticado e saudavel.
- Projetos visiveis: `Evellyn-Litke` e `MedAula`; nenhum pertence ao ServerSafe.
- Nenhuma tabela, projeto ou credencial foi criada ou alterada.

### Codex

- Automacoes/ tarefas agendadas estao disponiveis no aplicativo.
- O fluxo suporta relatorios recorrentes e alertas por tarefa, mas eles somente
  devem ser ativados quando fonte de dados, horario e politica de notificacao
  estiverem definidos.

## Disponiveis no ambiente, sem vinculo ao projeto

- GitHub: plugin instalado; o diretorio ServerSafe nao e um repositorio Git.
- Browser/Chrome e Computer Use: disponiveis para verificacao e fluxos que
  dependem de sessao existente.
- Sites: disponivel, mas a hospedagem atual e Vercel e nao deve ser substituida.

## Nao instaladas/conectadas

- Apollo.io
- HubSpot
- Airtable

Essas integracoes constam como plugins que podem ser instalados, mas nao estao
disponiveis para uso nesta execucao. Nenhum plano, compra ou custo foi criado.

## Recomendacao

1. Manter Gmail como canal de leitura e rascunho com aprovacao humana.
2. Usar o armazenamento local validado desta pasta na fase de calibracao.
3. Criar um projeto Supabase dedicado somente com autorizacao, aplicando o
   esquema privado e migravel de `db/postgres-schema.sql`.
4. Avaliar HubSpot quando houver volume que justifique CRM externo.
5. Avaliar Apollo somente para enrichment, com limites e custo aprovados.
