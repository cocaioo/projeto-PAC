# Auditoria de RBAC e fluxo administrativo de demandas

## Causa raiz reproduzida

O trabalho administrativo ocorre por **item da demanda**, não pela demanda inteira. Cada item de catálogo possui um grupo de contratação e cada administrador comum recebe grupos explicitamente em `grupos_administrados`. A tela `/demandas` é a área do requisitante; a fila de trabalho do administrador é `/validacoes`.

O caso relatado combinava dois fatores:

1. a massa local tinha grupos distintos para `admin_teste` e `admin_e2e`; o “Notebook Administrativo” pertence a **TIC Homologação**, enquanto o “Notebook E2E” pertence a **Tecnologia E2E**;
2. a interface mostrava a demanda na listagem geral, mas não identificava claramente a fila nem os nomes dos itens. Uma fila aberta antes do envio também permanecia desatualizada.

A auditoria encontrou ainda regras fail-open: um admin sem grupo explícito herdava escopo pela unidade, rascunhos de terceiros podiam aparecer e um admin com grupo, mas sem unidade, não conseguia abrir o item que aparecia em sua fila. Essas inconsistências foram corrigidas.

## Modelo de autorização esperado

| Perfil | Demandas próprias | Itens dos grupos atribuídos | Outros grupos | Gestão de usuários |
|---|---:|---:|---:|---:|
| Usuário | Sim | Não | Não | Não |
| Admin | Sim | Sim, após o envio | Não | Não |
| Admin Master | Sim | Todos | Todos | Sim |

Regras adicionais:

- admin comum sem grupo explícito falha fechado;
- grupo inativo não concede autorização;
- rascunho é privado ao requisitante, inclusive quando o item pertence ao grupo do admin;
- item manual é roteado excepcionalmente pela unidade, mas somente para admin que já possua ao menos um grupo explícito;
- o backend é a fonte de verdade; esconder botões no frontend é apenas defesa adicional.

## Demanda versus item

Uma demanda pode conter itens de vários grupos. O roteamento e a decisão são independentes:

```text
Demanda
├── Item A → Grupo A → Admin A
├── Item B → Grupo B → Admin B
└── Item C → Grupo A → Admin A
```

Admin A recebe A e C; Admin B recebe B. Nenhum deles recebe o item do outro grupo. O Admin Master enxerga todos.

O estado agregado da demanda segue os itens:

| Estado dos itens | Estado da demanda |
|---|---|
| todos rascunho | `rascunho` |
| todos aguardando | `aguardando_validacao` |
| todos vinculados a DFD | `concluida` |
| qualquer combinação intermediária | `em_andamento` |

## Passo a passo de homologação

### Preparar a massa

```powershell
docker compose exec backend python manage.py seed_homologacao
```

Confirme na saída do seed as credenciais e a associação:

- `admin_teste` administra **TIC Homologação**;
- use no cenário o item **Notebook Administrativo** (`HML-CAT-001`);
- se usar **Notebook E2E**, valide com `admin_e2e`, pois ele pertence a outro grupo.

### Executar o fluxo

1. Entre como usuário comum de homologação.
2. Acesse **Área do requisitante → Minhas demandas → Nova demanda**.
3. Adicione **Notebook Administrativo** pelo catálogo e salve.
4. Na demanda, selecione **Enviar para validação** e confirme.
5. Saia e entre como `admin_teste`.
6. Acesse **Administração → Pendências de validação** (`/validacoes`).
7. Se a página já estava aberta em outra sessão, use **Atualizar fila** ou volte o foco para a janela.
8. Confirme que o cartão mostra o nome **Notebook Administrativo** e abra **Analisar itens**.
9. Valide ou devolva o item. Em uma devolução, informe a justificativa.
10. Como requisitante, corrija o item devolvido e use **Reenviar**.
11. Como `admin_teste`, valide o reenvio.
12. Consolide o item validado em DFD e confirme que a demanda só fica concluída quando todos os seus itens estiverem vinculados.

### Evidência automática

```powershell
.\venv\Scripts\python.exe backend\manage.py test apps.api.tests_workflow_rbac_regression --keepdb
cd frontend
npm.cmd test -- --run src/pages/AdministrativeFlow.regression.test.jsx
npm.cmd run test:e2e -- e2e/specs/multigroup-demand.spec.js
```

## Diagnóstico rápido quando uma pendência não aparece

Verifique, nesta ordem:

1. se a demanda foi realmente enviada e possui `enviada_em`;
2. se o item está em `aguardando_validacao`;
3. qual é o grupo atual do item de catálogo;
4. se esse grupo está ativo e explicitamente associado ao administrador;
5. se o administrador está em `/validacoes`, e não apenas em `/demandas`;
6. se a fila foi atualizada após um envio feito em outra sessão.

## Riscos que exigem decisão de domínio

- O grupo é lido do catálogo no momento da consulta; alterar o grupo do catálogo pode rerotear itens históricos. Um snapshot do grupo no item eliminaria essa ambiguidade.
- Itens manuais não têm grupo explícito e ainda usam a unidade como critério excepcional.
- Existem rotas HTML legadas paralelas à SPA; devem ser removidas ou mantidas sob a mesma suíte de contratos.
- O vínculo DFD possui uma FK no item e uma relação legada M2M sincronizada; a duplicidade merece migração futura.
