import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Renderiza um componente de página dentro de um Router com uma rota
// (opcionalmente parametrizada) e uma rota de destino para navegações.
export function renderWithRouter(
  ui,
  { route = "/", path = "/", extraRoutes = [] } = {}
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
        {extraRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}
