import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Keep the diagnostic available to the host application's error reporter.
    console.error("Unexpected PAC interface error", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="container py-5" role="alert">
        <div className="alert alert-danger" role="alert">
          <h1 className="h4">Nao foi possivel carregar esta tela</h1>
          <p className="mb-3">Ocorreu um erro inesperado na aplicacao. Recarregue a pagina para tentar novamente.</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Recarregar aplicacao
          </button>
        </div>
      </main>
    );
  }
}
