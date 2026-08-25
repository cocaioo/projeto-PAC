import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/PageHeader";
import { ActionCard, Card } from "../components/ui";

export default function Home() {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return (
      <div>
        <PageHeader
          title="Plano Anual de Contratações"
          description="Gerencie demandas e documentos do PAC em um único ambiente."
          actions={(
            <Link to="/login" className="pac-button pac-button--primary">
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
              Entrar
            </Link>
          )}
        />
        <Card title="PAC UFPI">
          <p className="mb-0">
            Sistema de Gestão do Plano Anual de Contratações da UFPI.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Meu PAC agora"
        title={`Bem-vindo(a), ${user.nome_completo || user.username}`}
        description="Plano Anual de Contratações da UFPI. Comece pela ação que precisa da sua atenção neste momento."
      />

      <div className="pac-action-grid">
        {!isAdmin && (
          <>
            <ActionCard
              title="Criar nova demanda"
              description="Registre os itens que sua unidade precisa contratar."
              to="/demandas/nova"
              icon="bi-plus-circle"
              actionLabel="Criar demanda"
              priority="possible"
            />
            <ActionCard
              title="Corrigir itens devolvidos"
              description="Abra suas demandas e resolva pendências apontadas pela validação."
              to="/demandas"
              icon="bi-arrow-return-left"
              actionLabel="Ver pendências"
              priority="required"
            />
            <ActionCard
              title="Demandas"
              description="Veja status, próxima ação e histórico das solicitações."
              to="/demandas"
              icon="bi-file-earmark-text"
              actionLabel="Acompanhar"
            />
          </>
        )}
        
        {isAdmin && (
          <>
            <ActionCard
              title="Demandas aguardando validação"
              description="Analise itens enviados pelas unidades solicitantes."
              to="/validacoes"
              icon="bi-check2-square"
              actionLabel="Validar agora"
              priority="required"
            />
            <ActionCard
              title="Consolidar DFD"
              description="Selecione itens validados e revise o vínculo do documento."
              to="/dfds/consolidar"
              icon="bi-diagram-3"
              actionLabel="Consolidar"
              priority="possible"
            />
            <ActionCard
              title="Consultar documentos DFD"
              description="Confira os documentos vinculados aos itens consolidados."
              to="/dfds"
              icon="bi-collection"
              actionLabel="Consultar"
            />
          </>
        )}
        
        <ActionCard
          title="Consultar catálogo"
          description="Pesquise itens e serviços antes de preencher uma demanda."
          to="/catalogo"
          icon="bi-search"
          actionLabel="Buscar"
        />
        <ActionCard
          title="Indicadores"
          description="Acompanhe os números gerais do PAC."
          to="/dashboard"
          icon="bi-bar-chart"
          actionLabel="Ver indicadores"
        />
      </div>
    </div>
  );
}
