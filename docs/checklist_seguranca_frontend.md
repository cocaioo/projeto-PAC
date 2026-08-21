# Checklist de segurança do frontend

Este checklist registra o comportamento efetivamente implementado no frontend do PAC. A interface reduz exposição acidental, mas a autorização definitiva continua sendo responsabilidade da API.

## Autenticação e sessão

- [x] A autenticação usa a sessão do Django; o frontend não cria nem armazena token bearer.
- [x] Todas as chamadas HTTP usam `credentials: "include"` para trabalhar com o cookie de sessão.
- [x] O login solicita antes um cookie CSRF em `GET /api/auth/csrf/`.
- [x] Requisições que alteram estado enviam o valor disponível de `csrftoken` no cabeçalho `X-CSRFToken`; o fluxo de login garante antes a criação desse cookie.
- [x] Usuário, senha e tokens não são gravados em `localStorage` ou `sessionStorage` nem enviados ao console.
- [x] O logout chama a API para encerrar a sessão no servidor e, após sucesso, limpa o usuário mantido somente em memória.
- [x] Em produção (`DEBUG=false`), os cookies de sessão e CSRF são marcados como `Secure`; o cookie de sessão mantém o padrão `HttpOnly` do Django.
- [ ] Garantir HTTPS em todo o ambiente publicado e habilitar `DJANGO_SECURE_SSL_REDIRECT=true` no deploy.

## Autorização e controle de acesso

- [x] Rotas de validações e DFDs exigem usuário autenticado com capacidade efetiva de `ADMIN`/`ADMIN_MASTER`; `is_staff` isolado não concede acesso no PAC.
- [x] A API expõe `is_admin_user` e `is_admin_master_user`, calculados pelas mesmas propriedades usadas na autorização do backend.
- [x] Acesso direto por URL administrativa redireciona usuário comum para a página inicial.
- [x] Menus e ações administrativas não são exibidos a usuário comum.
- [x] A aplicação trata `403` com mensagem pública de permissão e não mostra o detalhe interno da resposta.
- [x] Os endpoints administrativos também validam sessão, perfil e escopo no backend; ocultar botões não é usado como barreira de segurança.

## Entrada, saída e exposição de dados

- [x] Textos recebidos da API são interpolados pelo React e renderizados como texto; não há uso de `dangerouslySetInnerHTML`.
- [x] Testes cobrem payload com marcação maliciosa e verificam que nenhum elemento HTML é criado ou executado.
- [x] Erros `5xx` e detalhes com padrão de stack trace são substituídos por mensagem genérica.
- [x] Erros de validação mostram somente mensagens de campos necessárias para correção.
- [x] O cliente não registra corpos de requisição, respostas ou credenciais no console.
- [x] A API envia `X-Content-Type-Options: nosniff` e bloqueia framing com `X-Frame-Options: DENY`.
- [ ] Definir e validar uma Content Security Policy no servidor/reverse proxy antes da publicação.

## Configuração e verificação contínua

- [x] CORS aceita credenciais somente para as origens configuradas em `DJANGO_CORS_ALLOWED_ORIGINS`.
- [x] Origens confiáveis para CSRF são configuradas por `DJANGO_CSRF_TRUSTED_ORIGINS`.
- [x] Testes automatizados cobrem rota protegida, ações por perfil, resposta `403`, escape de texto e ausência de persistência de credenciais.
- [x] Executar `npm audit --omit=dev --audit-level=high` no CI para bloquear vulnerabilidades nas dependências entregues em produção.
- [ ] Acompanhar separadamente os alertas transitivos das ferramentas de desenvolvimento (incluindo Lighthouse CI), sem aplicar atualização forçada incompatível.
- [ ] Reexecutar testes de autorização sempre que um perfil, rota ou ação administrativa for criado.
- [ ] Revisar cabeçalhos de segurança, flags de cookies e origens permitidas em cada ambiente de deploy.
