# 📖 Manual e Tutorial Didático das Rotas da API REST — PAC UFPI

Este documento serve como referência didática e tutorial para consumo da API REST do **Sistema de Gestão do Plano Anual de Contratações (PAC UFPI)**.

A API foi projetada com o **Django REST Framework (DRF)** e é consumida pela aplicação SPA em React.

---

## 📌 1. Visão Geral e Padrões da API

* **Base URL**: `/api/` (Exemplo: `http://localhost:8000/api/`)
* **Autenticação**: Sessão baseada em Cookies (`sessionid` e `csrftoken`).
* **Formato das Requisições/Respostas**: JSON (`Content-Type: application/json`).
* **Proteção CSRF**: Para métodos de alteração (`POST`, `PUT`, `PATCH`, `DELETE`), o cabeçalho `X-CSRFToken` deve ser enviado.

---

## 🔑 2. Autenticação e Sessão (`/api/auth/`)

Gerencia o acesso dos usuários e obtenção de credenciais de sessão.

### 2.1. Obter Token CSRF
* **Rota**: `GET /api/auth/csrf/`
* **Permissão**: Pública (`AllowAny`).
* **Finalidade**: Garante a criação do cookie CSRF no navegador antes do login.

### 2.2. Login de Usuário
* **Rota**: `POST /api/auth/login/`
* **Permissão**: Pública (`AllowAny`).
* **Payload**:
```json
{
  "username": "usuario_teste",
  "password": "senha_segura"
}
```
* **Resposta de Sucesso (200 OK)**:
```json
{
  "id": 1,
  "username": "usuario_teste",
  "first_name": "Caio",
  "last_name": "Moura",
  "nome_completo": "Caio Moura",
  "email": "caio@ufpi.edu.br",
  "siape": "1234567",
  "perfil": "usuario",
  "unidade": 4
}
```

### 2.3. Usuário Atual (Me)
* **Rota**: `GET /api/auth/me/`
* **Permissão**: Autenticado (`IsAuthenticated`).
* **Finalidade**: Retorna as informações e o perfil do usuário logado na sessão ativa.

### 2.4. Logout
* **Rota**: `POST /api/auth/logout/`
* **Permissão**: Autenticado (`IsAuthenticated`).
* **Finalidade**: Encerra a sessão do usuário.

---

## 📦 3. Catálogo de Materiais e Serviços (`/api/catalogo/`)

Pesquisa e manutenção dos itens oficiais catalogados (CATMAT / CATSER).

| Método | Rota | Descrição | Permissão |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/catalogo/` | Lista os itens ativos do catálogo | Autenticado |
| `POST` | `/api/catalogo/` | Cadastra um novo item no catálogo | Admin |
| `GET` | `/api/catalogo/{id}/` | Detalhes de um item | Autenticado |
| `PUT/PATCH`| `/api/catalogo/{id}/` | Edita dados de um item do catálogo | Admin |
| `POST` | `/api/catalogo/{id}/ativar/` | Ativa um item inativo | Admin |
| `POST` | `/api/catalogo/{id}/desativar/`| Desativa um item | Admin |

### Parâmetros de Busca na Listagem (`GET /api/catalogo/`):
* `?q=notebook` ou `?search=notebook`: Busca por nome ou código CATMAT/CATSER.
* `?grupo=2`: Filtra por ID do Grupo de Contratação.
* `?ativo=true`: (Apenas para Admin) Filtra por status ativo/inativo.

---

## 📋 4. Gestão de Demandas (`/api/demandas/`)

Operações do ciclo de vida das solicitações da unidade.

### 4.1. Listar Demandas
* **Rota**: `GET /api/demandas/`
* **Permissão**: Usuário visualiza suas próprias demandas; Administradores enxergam todas as demandas de seu escopo.

### 4.2. Criar Demanda (Rascunho)
* **Rota**: `POST /api/demandas/`
* **Payload**:
```json
{
  "ano_referencia": 2027,
  "observacao": "Demanda inicial do centro para o ciclo 2027."
}
```
* **Resposta (201 Created)**: Cria a demanda com status `rascunho`.

### 4.3. Enviar Demanda para Validação
* **Rota**: `POST /api/demandas/{id}/enviar/`
* **Finalidade**: Altera o status da demanda de `rascunho` para `aguardando_validacao` e envia seus itens para a fila dos gestores.

---

## 📝 5. Itens da Demanda (`/api/demandas/{id}/itens/` e `/api/itens/{id}/`)

Inclusão, correção e reenvio de itens individuais.

### 5.1. Adicionar Item a uma Demanda
* **Rota**: `POST /api/demandas/{demanda_id}/itens/`
* **Payload (Item Manual)**:
```json
{
  "tipo": "material",
  "nome": "Cadeira Ergonômica",
  "descricao": "Cadeira para escritório com regulagem de altura",
  "unidade_medida": "unidade",
  "quantidade": 10,
  "valor_estimado": "450.00",
  "data_prevista": "2027-03-15",
  "prioridade": "media",
  "justificativa_necessidade": "Substituição de cadeiras danificadas no setor",
  "indicacao_orcamentaria": "Recursos Próprios"
}
```
* **Payload (Vinculado ao Catálogo)**: Basta incluir `"item_catalogo": 5`. O valor total é calculado automaticamente no servidor (`quantidade` × `valor_estimado`).

### 5.2. Editar / Corrigir Item Devolvido
* **Rota**: `PATCH /api/itens/{item_id}/`
* **Regra**: Permitido para itens em `rascunho` ou `devolvida`.
* **Payload de Ajuste**:
```json
{
  "quantidade": 12,
  "justificativa_necessidade": "Ajustado a pedido do validador para 12 unidades."
}
```

### 5.3. Reenviar Item Corrigido Individualmente
* **Rota**: `POST /api/itens/{item_id}/reenviar/`
* **Finalidade**: Altera o status do item de `devolvida` para `aguardando_validacao`, permitindo que o administrador analise novamente o item corrigido.

---

## ⚖️ 6. Fila de Validação e Pareceres (`/api/validacoes/`)

Espaço de trabalho dos Administradores de Grupo / Administradores Master.

### 6.1. Listar Itens Pendentes de Análise
* **Rota**: `GET /api/validacoes/`
* **Retorno**: Lista de itens com status `aguardando_validacao`.

### 6.2. Tomar Decisão (Validar ou Devolver)
* **Rota**: `POST /api/validacoes/`
* **Payload de Validação (Aprovação)**:
```json
{
  "item_demanda": 15,
  "acao": "validado",
  "comentario": "Item de acordo com as especificações da UFPI."
}
```
* **Payload de Devolução (Comentário Obrigatório)**:
```json
{
  "item_demanda": 15,
  "acao": "devolvido",
  "comentario": "Favor detalhar a especificação técnica e ajustar o preço estimado."
}
```

---

## 🏛️ 7. Consolidação e DFDs (`/api/consolidacoes/` e `/api/dfds/`)

Processo de aglutinar demandas validadas em Documentos de Formalização da Demanda.

### 7.1. Listar Itens Elegíveis para Consolidação
* **Rota**: `GET /api/consolidacoes/itens-elegiveis/?ciclo_pac_id=2`
* **Retorno**: Retorna itens com status `validada` que ainda não possuem DFD, agrupados por item de catálogo com as quantidades totais e por unidade solicitante.

### 7.2. Consolidar e Gerar DFD
* **Rota**: `POST /api/dfds/consolidar/`
* **Payload**:
```json
{
  "numero_dfd": "DFD-2027/001",
  "ciclo_pac_id": 2,
  "item_ids": [15, 18, 22]
}
```
* **Efeito**: Cria o DFD e atualiza automaticamente os itens associados para o status `vinculada_dfd`.

---

## 📊 8. Dashboard e Indicadores (`/api/dashboard/stats/`)

* **Rota**: `GET /api/dashboard/stats/`
* **Retorno Didático**:
```json
{
  "total_demandas": 12,
  "total_itens": 45,
  "valor_total_estimado": "154200.00",
  "itens_por_status": {
    "rascunho": 5,
    "aguardando_validacao": 10,
    "validada": 15,
    "devolvida": 3,
    "vinculada_dfd": 12
  }
}
```

---

## 💻 9. Tutorial de Consumo em JavaScript (Front-end Fetch API)

Abaixo um exemplo didático em JavaScript para efetuar login, buscar CSRF e criar um item:

```javascript
// 1. Obter cookie CSRF
await fetch('/api/auth/csrf/', { method: 'GET' });

// 2. Função auxiliar para obter valor do cookie CSRF
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// 3. Fazer Login
const responseLogin = await fetch('/api/auth/login/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken')
  },
  body: JSON.stringify({
    username: 'usuario_teste',
    password: 'senha_segura'
  })
});

const usuario = await responseLogin.json();
console.log('Logado com sucesso:', usuario.nome_completo);

// 4. Adicionar Item na Demanda #1
const responseItem = await fetch('/api/demandas/1/itens/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken')
  },
  body: JSON.stringify({
    tipo: 'material',
    nome: 'Projetor Multimídia',
    descricao: 'Projetor 4K 4000 lumens',
    unidade_medida: 'unidade',
    quantidade: 2,
    valor_estimado: '3500.00',
    data_prevista: '2027-05-10',
    prioridade: 'alta',
    justificativa_prioridade: 'Necessário para auditório principal',
    justificativa_necessidade: 'Substituição de equipamento queimado',
    indicacao_orcamentaria: 'Recursos do Centro'
  })
});

const itemCriado = await responseItem.json();
console.log('Item adicionado:', itemCriado.id, 'Valor Total:', itemCriado.valor_total);
```
