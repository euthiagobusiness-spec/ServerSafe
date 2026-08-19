# Pipeline comercial

## Estagios

1. IDENTIFICADO
2. EM PESQUISA
3. QUALIFICADO
4. CONTATO PREPARADO
5. PRIMEIRO CONTATO ENVIADO
6. FOLLOW-UP 1
7. FOLLOW-UP 2
8. FOLLOW-UP 3
9. RESPONDEU
10. OPORTUNIDADE
11. REUNIAO
12. DIAGNOSTICO
13. PROPOSTA
14. NEGOCIACAO
15. GANHO
16. PERDIDO
17. NURTURING
18. NAO QUALIFICADO

Os valores persistidos usam identificadores sem acentos definidos em
`config/pipeline.json`.

## Regras

- Toda mudanca inclui `from`, `to`, timestamp, autor, motivo e evidencia.
- Nunca sobrescrever o historico anterior.
- `GANHO`, `PERDIDO` e `NAO_QUALIFICADO` sao terminais; reabertura exige evento
  explicito e aprovacao humana.
- `RESPONDEU` nao implica interesse. A intencao deve ser classificada.
- `OPORTUNIDADE` exige necessidade, interlocutor relevante e proximo passo.
- `PROPOSTA` e `NEGOCIACAO` nunca avancam automaticamente.
- Opt-out bloqueia mensagens futuras independentemente do estagio.

## Campos obrigatorios por marco

- `QUALIFICADO`: score, justificativa e fontes.
- `CONTATO_PREPARADO`: contato, canal, motivo e rascunho.
- `PRIMEIRO_CONTATO_ENVIADO`: mensagem aprovada, timestamp e identificador da
  thread.
- `RESPONDEU`: resumo, intencao, sentimento e objecoes.
- `OPORTUNIDADE`: valor estimado, urgencia e proxima acao.
- `GANHO/PERDIDO`: valor final, motivo e data.
