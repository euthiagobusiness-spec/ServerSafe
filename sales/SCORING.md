# Lead scoring 0-100

O calculo usa 15 dimensoes, cada uma avaliada de 0 a 5. Pesos somam 100.

| Dimensao | Peso |
| --- | ---: |
| Porte | 12 |
| Aderencia do setor | 5 |
| Faturamento estimado | 7 |
| Funcionarios | 6 |
| Complexidade tecnologica | 10 |
| Sinais de infraestrutura | 9 |
| Sinais de cloud | 5 |
| Sinais de datacenter | 5 |
| Expansao | 6 |
| Evidencias de problemas | 8 |
| Gatilhos recentes | 7 |
| Relevancia do contato | 6 |
| Necessidade de migracao | 6 |
| Capacidade de pagamento | 4 |
| Urgencia aparente | 4 |

## Confianca da evidencia

- `fact`: multiplica a contribuicao por 1,00. Precisa de fonte verificavel.
- `inference`: multiplica por 0,65. Deve explicar a ligacao entre fatos.
- `hypothesis`: multiplica por 0. Hipoteses orientam pesquisa, nao aumentam score.

Uma nota positiva sem evidencia e rejeitada pelo calculador. A explicacao deve
registrar nota, fonte, tipo de evidencia, contribuicao e lacunas.

## Classificacao

- 0-39: baixa prioridade
- 40-59: investigar
- 60-74: prospectar
- 75-89: alta prioridade
- 90-100: oportunidade excepcional

## Regra operacional

- Abaixo de 60: nao abordar sem justificativa excepcional aprovada.
- 60-74: preparar contato personalizado.
- 75+: colocar no topo da fila e alertar quando houver resposta.
- O score nao substitui julgamento, compliance ou opt-out.

O calculo executavel fica em `core/scoring.mjs` e os pesos em
`config/scoring.json`.
