import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/PageHeader";
import { Badge, Card, LoadingState, ProgressSummary } from "../components/ui";

const ROLE_LABELS = {
  usuario: "Usuario",
  admin: "Admin",
  admin_master: "Admin Master",
};

function formatDateTime(value) {
  if (!value) return "Nao informado";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatRole(user) {
  return user?.perfil_display || ROLE_LABELS[user?.perfil] || user?.perfil || "Nao informado";
}

function scopeLabel(user) {
  if (user?.escopo_administrativo_global) return "Global";
  if ((user?.grupos_administrados || []).length > 0) return "Por unidade administradora";
  return "Sem escopo administrativo";
}

export default function Profile() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState label="Carregando sua conta..." />;
  if (!user) return null;

  const unidade = user.unidade_detalhe;
  const gruposAdministrados = Array.isArray(user.grupos_administrados)
    ? user.grupos_administrados
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Minha conta"
        title={user.nome_completo || user.username}
        description="Consulte os dados institucionais e o escopo de autorizacao carregado diretamente do backend."
      />

      <ProgressSummary
        items={[
          { label: "Perfil", value: formatRole(user) },
          {
            label: "Status",
            value: (
              <Badge variant={user.is_active ? "success" : "danger"}>
                {user.status_conta === "ativa" ? "Conta ativa" : "Conta inativa"}
              </Badge>
            ),
          },
          {
            label: "Unidade",
            value: unidade?.sigla || "Nao informada",
            description: unidade?.nome || "Sem vinculo de unidade",
          },
          { label: "Escopo", value: scopeLabel(user) },
        ]}
      />

      <div className="profile-grid">
        <Card title="Dados da conta" className="profile-card">
          <dl className="profile-meta">
            <div>
              <dt>Login</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>E-mail institucional</dt>
              <dd>{user.email || "Nao informado"}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{formatRole(user)}</dd>
            </div>
            <div>
              <dt>SIAPE</dt>
              <dd>{user.siape || "Nao informado"}</dd>
            </div>
            <div>
              <dt>Criada em</dt>
              <dd>{formatDateTime(user.date_joined)}</dd>
            </div>
            <div>
              <dt>Ultimo acesso</dt>
              <dd>{formatDateTime(user.last_login)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Vinculo institucional" className="profile-card">
          <dl className="profile-meta">
            <div>
              <dt>Unidade</dt>
              <dd>{unidade?.nome || "Nao informada"}</dd>
            </div>
            <div>
              <dt>Sigla</dt>
              <dd>{unidade?.sigla || "Nao informada"}</dd>
            </div>
            <div>
              <dt>Codigo</dt>
              <dd>{unidade?.codigo || "Nao informado"}</dd>
            </div>
            <div>
              <dt>Status da unidade</dt>
              <dd>{unidade ? (unidade.ativo ? "Ativa" : "Inativa") : "Nao informado"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card title="Escopo de autorizacao">
        {user.escopo_administrativo_global ? (
          <div className="profile-scope-banner">
            <Badge variant="primary" icon="bi-shield-lock">
              Escopo administrativo global
            </Badge>
            <p className="mb-0">
              Esta conta possui permissao para supervisionar todos os grupos de contratacao.
            </p>
          </div>
        ) : gruposAdministrados.length > 0 ? (
          <div className="profile-groups">
            <p className="mb-0">
              O escopo administrativo desta conta e derivado da unidade vinculada no backend.
            </p>
            <ul className="profile-groups__list">
              {gruposAdministrados.map((grupo) => (
                <li key={grupo.id}>
                  <div className="profile-groups__name">
                    <strong>{grupo.nome}</strong>
                    <Badge variant={grupo.ativo ? "info" : "warning"}>
                      {grupo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <span>
                    Unidade administradora: {grupo.unidade_admin_sigla || grupo.unidade_admin}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mb-0">
            Esta conta nao possui grupos de contratacao sob administracao.
          </p>
        )}
      </Card>
    </div>
  );
}
