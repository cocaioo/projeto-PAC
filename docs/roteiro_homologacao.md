# Roteiro de homologação do MVP PAC

Este roteiro orienta a validação manual da Joara com a massa criada por `seed_homologacao`. O comando controla somente os registros identificados como dados de homologação e pode ser reexecutado para restaurar o cenário-base.

## 1. Preparar o ambiente

1. Configure `HOMOLOGACAO_TEST_PASSWORD` no gerenciador de segredos da homologação. Use uma senha temporária exclusiva desse ambiente; não a envie por chat, não a registre neste arquivo e não a inclua em capturas de tela.
2. Aplique as migrações e execute o seed:

   ```bash
   cd pac
   python manage.py migrate
   python manage.py seed_homologacao
   ```

3. Confirme a mensagem `Dados de homologação configurados` sem qualquer senha na saída.
4. Se for necessário restaurar o cenário inicial, execute novamente o mesmo comando. A reexecução mantém os mesmos registros, corrige seus valores controlados e não duplica a massa.

## 2. Contas e escopos esperados

Todas as contas usam a senha temporária fornecida por `HOMOLOGACAO_TEST_PASSWORD`.

| Usuário | Perfil | Unidade | Uso no roteiro |
| --- | --- | --- | --- |
| `usuario_teste` | Usuário | HML-CCN | Criar, enviar, corrigir e acompanhar a demanda |
| `admin_teste` | ADMIN | HML-STI | Gerir e validar itens do grupo TIC |
| `admin_outro_grupo` | ADMIN | HML-PREUNI | Validar o isolamento de outro grupo |
| `admin_master_teste` | ADMIN_MASTER | HML-STI | Validar a visão administrativa global |

Nunca use essas contas ou a senha temporária em produção.

## 3. Conferir o cenário-base

1. Entre como `usuario_teste` e abra a demanda de 2099 marcada como cenário de homologação.
2. Confirme os cinco itens e seus estados:
   - Notebook: aguardando validação;
   - Monitor: devolvido;
   - Switch: validado e disponível para consolidação;
   - Nobreak: vinculado ao `HML-DFD-001`;
   - serviço de outro grupo: validado.
3. No Monitor, confirme a exibição do motivo de devolução sobre especificação técnica e cotação atualizada.
4. Confirme que a demanda está `Em andamento`, pois combina itens em diferentes etapas.
5. Abra o item Nobreak e confirme o número `HML-DFD-001`.
6. Entre como `admin_teste`, abra o catálogo e confirme cinco itens ativos e o item `HML-CAT-999` inativo no filtro administrativo.

## 4. Executar o fluxo completo

Use uma nova demanda para não alterar o cenário-base.

1. Como `usuario_teste`, crie uma demanda para 2099 e salve-a como rascunho.
2. Adicione um item ativo do catálogo. Tente adicioná-lo novamente e confirme que a duplicidade na mesma demanda é bloqueada.
3. Preencha quantidade, data prevista, justificativa da necessidade e indicação orçamentária. Se escolher prioridade Alta, informe também sua justificativa.
4. Envie a demanda e confirme o estado `Aguardando validação`.
5. Saia e entre como `admin_teste`.
6. Em Validações, abra a nova demanda, devolva o item e registre um motivo objetivo. Confirme que a ação só ocorre após a confirmação.
7. Volte a `usuario_teste`, confira o motivo, corrija o item e reenvie-o.
8. Entre novamente como `admin_teste`, valide o item e confirme a atualização da linha sem recarregar manualmente a página.
9. Em Consolidação, selecione o item validado, confira quantidade e unidade solicitante e vincule um número de DFD exclusivo para este teste.
10. Volte a `usuario_teste` e confirme que o item exibe o DFD informado e que a demanda foi sincronizada para `Concluída` quando todos os seus itens estiverem vinculados.

## 5. Validar permissões

1. Como `usuario_teste`, confirme que não aparecem botões administrativos no catálogo, nas validações ou na consolidação.
2. Como `admin_outro_grupo`, tente abrir ou decidir um item de TIC e confirme que a ação é negada sem expor dados do grupo.
3. Ainda como `admin_outro_grupo`, confirme acesso ao item de serviço do grupo de infraestrutura.
4. Como `admin_master_teste`, confirme a visão global dos grupos e a capacidade de atuar nos dois escopos.
5. Verifique que nenhum erro apresenta stack trace, senha, token ou detalhe técnico.

## 6. Registrar o resultado

Para cada etapa, anote data, navegador, resultado esperado, resultado observado e evidência sem dados sensíveis. Registre defeitos com o usuário/perfil usado, a ação executada e o texto visível do erro. Ao finalizar, remova ou rotacione `HOMOLOGACAO_TEST_PASSWORD` no gerenciador de segredos do ambiente.
