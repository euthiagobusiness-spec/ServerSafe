# Playbook operacional

## Pesquisa e qualificacao

1. Normalizar dominio e verificar duplicidade.
2. Registrar fontes e data da consulta.
3. Extrair apenas fatos sustentados pela fonte.
4. Registrar inferencias com raciocinio e hipoteses como perguntas de pesquisa.
5. Identificar porte, infraestrutura, gatilhos e decisores.
6. Calcular score e documentar lacunas.
7. Descartar, pesquisar mais ou preparar contato conforme `SCORING.md`.

## Personalizacao

Toda abordagem deve responder: por que a ServerSafe esta falando
especificamente com esta empresa agora?

Use apenas um gatilho verificavel e uma hipotese prudente. Nao alegar que a
empresa tem um problema; formular como contexto a validar.

## Cadencia inicial conservadora

- Dia 0: primeiro contato curto e personalizado.
- Dia util 3: follow-up 1, acrescentando contexto util.
- Dia util 7: follow-up 2, pergunta simples de encaminhamento.
- Dia util 12: follow-up 3, encerramento respeitoso.
- Sem resposta: `NURTURING` por pelo menos 60 dias.

Limites iniciais configuraveis: 8 novos contatos e 12 follow-ups por dia. Esses
limites protegem qualidade e reputacao; nao sao meta de volume.

## Tratamento de respostas

1. Associar pela thread, email normalizado e empresa.
2. Classificar intencao, sentimento, objecoes e urgencia.
3. Aplicar nivel A/B/C.
4. Atualizar pipeline e historico.
5. Preparar proxima acao especifica.
6. Alertar imediatamente para score 75+, C-level, pedido de reuniao/proposta,
   preco, pergunta tecnica ou risco de perda.

## Opt-out

Registrar em `data/suppressions.json`, limpar proxima acao comercial e bloquear
qualquer automacao futura para o endereco e, quando solicitado, para o dominio.
