# Guia de teste: criar demanda como usuário e validar como administrador

Este roteiro valida o fluxo principal do PAC:

1. um usuário cria uma demanda;
2. adiciona um item ativo do catálogo;
3. envia a demanda para validação;
4. um administrador do grupo de contratação localiza a demanda;
5. o administrador valida ou devolve o item.

O fluxo usa a aplicação em `http://localhost` e a massa de homologação reservada pelo projeto. A massa usa o ano de referência **2099**, códigos `HML-*` e usuários fictícios.

## 1. Preparar o ambiente

Abra o PowerShell na raiz do projeto:

~~~
cd C:\Users\Caio\Desktop\projeto-pac
docker compose up -d
docker compose ps
~~~

O esperado é que `pac_postgres`, `pac_backend` e `pac_frontend` estejam em execução. Se a aplicação estiver com código antigo, atualize as imagens:

~~~
docker compose up -d --build backend frontend
docker compose up -d --force-recreate frontend
~~~

Não use `docker compose down -v`, pois isso remove o volume do banco.

## 2. Popular a massa de homologação

Escolha uma senha temporária somente para este teste. Ela será usada por todos os usuários da massa:

~~~
$env:PAC_ENVIRONMENT = "development"
$env:ALLOW_HOMOLOGACAO_SEED = "True"
$env:HOMOLOGACAO_TEST_PASSWORD = "SuaSenhaTemporaria123!"
~~~

Primeiro confira o alvo. O comando `--check` não grava dados:

~~~
docker compose exec -e PAC_ENVIRONMENT=development -e ALLOW_HOMOLOGACAO_SEED=True -e "HOMOLOGACAO_TEST_PASSWORD=$env:HOMOLOGACAO_TEST_PASSWORD" backend python manage.py seed_homologacao --check
~~~

Copie o fingerprint exibido e aplique a massa:

~~~
docker compose exec -e PAC_ENVIRONMENT=development -e ALLOW_HOMOLOGACAO_SEED=True -e "HOMOLOGACAO_TEST_PASSWORD=$env:HOMOLOGACAO_TEST_PASSWORD" backend python manage.py migrate
docker compose exec -e PAC_ENVIRONMENT=development -e ALLOW_HOMOLOGACAO_SEED=True -e "HOMOLOGACAO_TEST_PASSWORD=$env:HOMOLOGACAO_TEST_PASSWORD" backend python manage.py seed_homologacao --apply --confirm-target <FINGERPRINT>
~~~

Se o seed já foi executado com a mesma senha, esta etapa pode ser pulada. A execução é repetível e preserva os dados fora do namespace reservado.

## 3. Usuários que serão usados

Todos usam a senha definida em `HOMOLOGACAO_TEST_PASSWORD`.

| Usuário | Perfil | Escopo | Uso neste roteiro |
| --- | --- | --- | --- |
| `usuario_teste` | Usuário | Solicitante da unidade CCN | Cria a demanda |
| `admin_teste` | Admin | Grupo `TIC Homologação` | Valida a demanda |
| `admin_outro_grupo` | Admin | Grupo `Infraestrutura Homologação` | Testa isolamento |
| `admin_master_teste` | Admin Master | Todos os grupos | Confere a visão global |

O item recomendado para este teste é:

| Código | Nome | Grupo | Situação |
| --- | --- | --- | --- |
| `HML-CAT-001` | Notebook Administrativo | TIC Homologação | Ativo |

> Não misture as massas de teste. O par E2E `usuario_e2e` / `Notebook E2E` pertence ao grupo `Tecnologia E2E` e deve ser validado por `admin_e2e`, não por `admin_teste`. Para usar `admin_teste`, selecione um item do grupo `TIC Homologação`, como `HML-CAT-001`.

## 4. Criar a demanda como usuário

1. Abra `http://localhost`.
2. Entre com `usuario_teste` e a senha temporária.
3. No menu, abra **Demandas**.
4. Clique em **Nova demanda**.
5. Informe o ano `2099` e, opcionalmente, uma observação como `Teste manual usuário e administrador`.
6. Salve a demanda.
7. Na página da demanda, clique em **Adicionar item**.
8. Selecione **Selecionar do catálogo**.
9. Pesquise por `HML-CAT-001` ou `Notebook Administrativo` e selecione o item.
10. Confirme que a tela mostra `Grupo de contratação: TIC Homologação`.
11. Preencha os campos editáveis. Um conjunto válido para o teste é:

    - quantidade: `2`;
    - valor estimado unitário: `5200.00`;
    - data prevista: `2099-06-30`;
    - prioridade: `Média`;
    - indicação orçamentária: `Recursos próprios`;
    - justificativa da necessidade: `Teste de validação do fluxo de demandas`.

12. Clique em **Salvar item**.
13. Confira que o item aparece na demanda com status de rascunho e que a demanda possui pelo menos um item.
14. Clique em **Enviar para validação** e confirme a operação.

### Resultado esperado desta etapa

- A demanda deixa de ser rascunho.
- O item fica com status **Aguardando validação**.
- O número da demanda aparece na URL, por exemplo `/demandas/123`. Anote esse número; ele será usado para localizar o registro como administrador.
- O item mantém o grupo `TIC Homologação`, que é o vínculo usado para autorizar o `admin_teste`.

> Importante: salvar a demanda ou o item não é suficiente. O administrador só recebe itens depois de **Enviar para validação**.

## 5. Validar a demanda como administrador

1. Clique em **Sair**, no canto superior direito.
2. Entre com `admin_teste` e a mesma senha temporária.
3. Abra **Validações** no menu. A tela deve se chamar **Demandas recebidas**.
4. Se necessário, use o filtro **Grupo de contratação** e selecione `TIC Homologação`.
5. Localize a demanda pelo número anotado na etapa anterior.
6. Clique em **Analisar itens**. A lista exibe um cartão por demanda; os botões **Validar** e **Devolver** ficam na próxima tela, por item.
7. Confirme os dados do solicitante, unidade, ano `2099`, item, grupo e quantidade.
8. O item deve estar com status **Aguardando validação**.
9. Clique em **Validar** no item.
10. No modal **Confirmar validação**, clique em **Confirmar validação**.

### Resultado esperado desta etapa

- A aplicação informa que o item foi validado com sucesso.
- O item muda para **Validada** e mostra **Decisão concluída**.
- Ao voltar para **Demandas recebidas**, o item não aparece mais na fila de pendências.
- Ao entrar novamente como `usuario_teste`, a demanda e o histórico mostram a decisão administrativa.

## 6. Testar devolução e reenvio (opcional)

Para testar o ciclo completo, crie outra demanda ou use uma demanda de teste ainda pendente:

1. Como `admin_teste`, abra o item pendente.
2. Clique em **Devolver**.
3. Informe uma justificativa, por exemplo `Detalhar melhor a necessidade do equipamento`.
4. Clique em **Confirmar devolução**.
5. Saia e entre como `usuario_teste`.
6. Abra a demanda e confirme que o parecer da devolução está visível.
7. Edite o item, ajuste a descrição ou a justificativa e salve.
8. Reenvie o item para validação.
9. Volte para `admin_teste` e valide o item reenviado.

O botão de reenvio só deve ser usado depois que a correção for salva. O histórico deve conservar a devolução anterior.

## 7. Confirmar o isolamento por grupo

Use a demanda criada com o item `HML-CAT-001`:

1. Saia de `admin_teste`.
2. Entre como `admin_outro_grupo`.
3. Abra **Validações**.
4. Pesquise pelos filtros ou tente abrir diretamente `/validacoes/<ID_DA_DEMANDA>`.

Resultado esperado: a demanda TIC não deve aparecer nem permitir decisão para o administrador de Infraestrutura. A tela pode mostrar **Demanda sem itens pendentes**, pois a demanda está fora do escopo administrativo.

Depois:

1. Entre como `admin_master_teste`.
2. Abra **Validações**.

Resultado esperado: o Admin Master consegue visualizar os grupos, respeitando a visão global prevista para esse perfil.

## 8. Diagnóstico quando a fila do admin estiver vazia

Verifique os pontos abaixo na ordem:

| Sintoma | Verificação |
| --- | --- |
| Demanda não aparece | Confirme que **Enviar para validação** foi executado e que o status não está em rascunho. |
| Item não aparece para `admin_teste` | Confirme que o item escolhido pertence ao grupo `TIC Homologação`. |
| Catálogo sem resultados | Verifique se o seed foi aplicado e se o item está ativo. Use `HML-CAT-001`. |
| Tela administrativa bloqueada | Confirme que o login foi feito com `admin_teste`, e não com `usuario_teste`. |
| Admin vê a tela, mas não pode decidir | Confirme o grupo administrado em **Minha conta** e use o admin correspondente ao grupo do item. |
| Erro de usuário sem unidade | Repita o teste com `usuario_teste`, criado pela massa de homologação. |
| Dados antigos na tela | Atualize a página após o login e verifique se o navegador não manteve a sessão do usuário anterior. |

Também é possível conferir os serviços:

~~~
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
~~~

## 9. Conferência técnica pela aba Network do navegador

Se a interface não deixar claro em qual etapa falhou, abra o DevTools do navegador, aba **Network**, e repita o fluxo. As requisições esperadas são:

| Etapa | Requisição esperada |
| --- | --- |
| Criar demanda | `POST /api/demandas/` |
| Adicionar item | `POST /api/demandas/<id>/itens/` |
| Enviar | `POST /api/demandas/<id>/enviar/` |
| Listar fila do admin | `GET /api/validacoes/pendentes/` |
| Abrir uma demanda para decisão | `GET /api/validacoes/pendentes/?demanda=<id>` |
| Validar ou devolver | `POST /api/validacoes/decidir/` |

Em qualquer resposta `4xx`, leia o campo `detail` ou os erros por campo. Não registre cookies, senhas ou dados de sessão ao compartilhar o diagnóstico.

## 10. Checklist final

- [ ] O usuário conseguiu criar uma demanda.
- [ ] O item foi selecionado de um catálogo ativo.
- [ ] O item exibiu o grupo de contratação esperado.
- [ ] A demanda foi enviada, saindo de rascunho.
- [ ] O item apareceu na fila do administrador correto.
- [ ] O administrador validou o item.
- [ ] O item saiu da fila de pendências após a validação.
- [ ] Um administrador de outro grupo não conseguiu decidir o item.
- [ ] O Admin Master conseguiu consultar a visão global.
- [ ] O número da demanda e os status foram anotados como evidência do teste.

Referências no código: [CREDENCIAIS.md](../CREDENCIAIS.md), [roteiro_homologacao.md](roteiro_homologacao.md), [rotas do frontend](../frontend/src/routes.jsx) e [cliente da API](../frontend/src/api/client.js).
