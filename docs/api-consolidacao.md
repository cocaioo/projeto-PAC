# API de consolida\u00e7\u00e3o

Todas as rotas exigem sess\u00e3o autenticada e perfil `admin` ou `admin_master`.
Um ADMIN normal s\u00f3 enxerga e consolida itens de grupos administrados pela sua unidade.

`GET /api/consolidacoes/itens-elegiveis/?ciclo_pac_id=2&item_catalogo_id=10&grupo_contratacao_id=3`

Retorna grupos por item de cat\u00e1logo. `quantidade_total` e as quantidades por unidade s\u00e3o valores num\u00e9ricos; a unidade de medida \u00e9 devolvida separadamente.

```json
[{"item_catalogo":{"id":10,"nome":"Notebook","unidade_medida":"unidade"},"quantidade_total":32,"total_solicitacoes":5,"quantidades_por_unidade":[{"unidade_id":4,"unidade_nome":"CCN","quantidade":12}],"item_ids":[31,45]}]
```

`POST /api/dfds/consolidar/`

```json
{"numero_dfd":"123/2027","ciclo_pac_id":2,"item_ids":[31,45]}
```

Retorna `201` para um DFD novo e `200` para um DFD existente no mesmo ciclo. Em conflito de elegibilidade retorna `409` com `code: ITEM_NAO_ELEGIVEL` e os `item_ids` recusados. Itens vinculados passam diretamente de `validada` para `vinculada_dfd`.
