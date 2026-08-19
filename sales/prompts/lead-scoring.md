# Pontuacao de lead

Use `sales/config/scoring.json` e `sales/core/scoring.mjs`.

Para cada dimensao, atribua nota inteira de 0 a 5 e inclua evidencias com:

- `kind`: `fact`, `inference` ou `hypothesis`;
- `statement`: afirmacao precisa;
- `source`: URL ou referencia verificavel;
- `rationale`: por que a nota se aplica.

Hipoteses nao somam pontos. Nota positiva sem evidencia deve falhar. Execute o
calculador e retorne score, classificacao, breakdown, lacunas e proxima acao.
