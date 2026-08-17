# Roteiro de homologação do MVP PAC

Este roteiro usa somente registros fictícios reservados pelo namespace `[SEED:HML-MASSA]`, pelo ano 2099 e por códigos `HML-*`. Ele não autoriza uso em produção nem limpeza do banco.

## 1. Confirmar o alvo antes de gravar

No PowerShell, dentro de `pac/`, configure variáveis apenas para a sessão atual:

```powershell
$env:PAC_ENVIRONMENT = "development"
$env:ALLOW_HOMOLOGACAO_SEED = "True"
$env:HOMOLOGACAO_TEST_PASSWORD = "<senha-temporaria-ficticia>"
python manage.py seed_homologacao --check
```

Confira somente estes metadados sanitizados: ambiente, backend, escopo local/remoto e fingerprint. O comando não mostra host, nome do banco, URI, usuário ou senha. Se o alvo estiver correto, copie o fingerprint e execute:

```powershell
python manage.py migrate
python manage.py seed_homologacao --apply --confirm-target <fingerprint>
```

Para banco remoto de homologação, o fingerprint também deve estar explicitamente em `HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS`. Produção é sempre recusada, mesmo com as outras opções. Ao terminar, remova as três variáveis temporárias da sessão.

## 2. Massa esperada

O relatório JSON do comando deve informar, sem segredos:

- 17 unidades `HML-*`;
- 5 grupos: TIC, Infraestrutura, Almoxarifado, Serviços e Equipamentos Permanentes;
- 41 itens de catálogo, sendo 38 ativos e 3 inativos;
- 41 demandas: 5 rascunhos, 8 aguardando, 5 parciais, 5 devolvidas, 5 reenviadas, 5 validadas, 5 consolidadas e 3 canceladas;
- entre 1 e 8 itens por demanda, com itens manuais apenas em cenários de rascunho/cancelamento;
- 5 DFDs `HML-MASSA-DFD-001` a `HML-MASSA-DFD-005`.

As quantidades, valores, prioridades, textos curtos/longos, unidades e grupos variam. Todo item de prioridade alta possui justificativa. Itens consolidados mantêm as duas relações existentes no schema: a FK `ItemDemanda.dfd` e o M2M `DFD.itens_demanda`.

## 3. Contas de demonstração

Todas usam a senha temporária fornecida exclusivamente por `HOMOLOGACAO_TEST_PASSWORD`.

| Usuário | Perfil | Finalidade |
| --- | --- | --- |
| `usuario_teste` | Usuário | criar uma demanda nova no fluxo completo |
| `usuario_sem_demanda` | Usuário | estado vazio |
| `usuario_rascunho` | Usuário | demanda em rascunho |
| `usuario_aguardando` | Usuário | demanda aguardando validação |
| `usuario_devolvido` | Usuário | motivo de devolução visível |
| `usuario_reenviado` | Usuário | item corrigido e reenviado |
| `usuario_validado` | Usuário | itens prontos para consolidação |
| `usuario_consolidado` | Usuário | DFD já vinculado |
| `admin_teste` | ADMIN | grupo TIC/HML-STI |
| `admin_outro_grupo` | ADMIN | Infraestrutura/HML-PREUNI e teste de isolamento |
| `admin_almoxarifado` | ADMIN | Almoxarifado/HML-PRAD |
| `admin_servicos` | ADMIN | Serviços/HML-BC |
| `admin_permanentes` | ADMIN | Equipamentos/HML-CT |
| `admin_master_teste` | ADMIN_MASTER | visão administrativa global |

Há outros solicitantes `hml_*` para distribuir as 41 demandas entre unidades. E-mails usam o domínio inválido `homologacao.invalid`, SIAPEs são sintéticos e nenhum usuário é superusuário.

## 4. Conferir telas e estados

1. Entre como `usuario_sem_demanda` e confirme os estados vazios sem erro.
2. Entre como `usuario_rascunho` e confira edição, item manual e item de catálogo.
3. Entre como `usuario_devolvido` e confira o motivo administrativo.
4. Entre como `usuario_reenviado` e confira o histórico de devolução com estado atual aguardando validação.
5. Entre como `usuario_validado` e confirme que os itens aparecem para consolidação no grupo correto.
6. Entre como `usuario_consolidado` e confirme o número do DFD e a demanda concluída.
7. Como `admin_teste`, confira catálogo ativo/inativo, fila TIC, filtros, agrupamentos e dashboard.
8. Como `admin_outro_grupo`, confirme que itens e demandas TIC não aparecem nem podem ser decididos por URL direta.
9. Como `admin_master_teste`, confirme a visão global permitida.
10. Confira paginação e responsividade com as muitas demandas e itens do catálogo.

## 5. Executar o fluxo completo

Use uma demanda nova para não alterar os cenários-base:

1. Como `usuario_teste`, crie uma demanda, adicione item ativo do catálogo e salve o rascunho.
2. Tente repetir o mesmo catálogo na demanda e confirme o bloqueio de duplicidade.
3. Escolha prioridade alta sem justificativa e confirme a validação; depois informe a justificativa.
4. Envie a demanda.
5. Como `admin_teste`, devolva o item com motivo.
6. Como solicitante, veja o motivo, edite e reenvie.
7. Como `admin_teste`, valide o item reenviado.
8. Consolide-o, informe um número de DFD exclusivo e confirme a resposta.
9. Como solicitante, abra novamente a demanda e confira o DFD.

O Playwright automatiza essa mesma jornada, incluindo as trocas de perfil.

## 6. Permissões e segurança

Confirme que:

- usuário comum não vê nem abre rotas administrativas;
- ADMIN comum só atua no grupo administrado por sua unidade;
- ADMIN_MASTER mantém visão global;
- demanda e dashboard não vazam totais ou itens fora do escopo;
- mensagens da API são tratadas como texto, sem renderizar HTML;
- cookies de sessão/CSRF são usados sem token em storage ou logs;
- relatório, CI, screenshots e traces não contêm a senha temporária.

## 7. Reexecução e registro de falhas

Reexecutar o seed com as mesmas travas restaura apenas a massa reservada, preserva IDs e não aumenta as contagens. Não limpe o banco para isso.

Para cada defeito, registre: etapa, perfil, endpoint ou tela, payload sem credenciais, comportamento esperado, comportamento observado e possível causa. Não marque a homologação manual como concluída antes de a interface ser revisada por uma pessoa.
