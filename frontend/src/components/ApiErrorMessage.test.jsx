import { useEffect, useState } from "react";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { api } from "../api/client";
import ApiErrorMessage from "./ApiErrorMessage";

const server = setupServer(
  http.get("*/api/restrito/", () => HttpResponse.json(
    { detail: "Mensagem interna de autorização." },
    { status: 403 }
  )),
  http.post("*/api/formulario/", () => HttpResponse.json(
    { nome: ["Este campo é obrigatório."] },
    { status: 400 }
  )),
  http.get("*/api/conteudo-malicioso/", () => HttpResponse.json(
    { nome: ['<img src=x onerror="window.__pacXssExecuted=true">'] },
    { status: 400 }
  ))
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function ErrorProbe({ action }) {
  const [error, setError] = useState(null);
  useEffect(() => {
    action().catch(setError);
  }, [action]);
  return <ApiErrorMessage error={error} />;
}

describe("ApiErrorMessage com MSW", () => {
  it("apresenta mensagem pública de permissão para erro 403", async () => {
    const action = () => api.get("/restrito/");
    render(<ErrorProbe action={action} />);
    expect(await screen.findByText(/não tem permissão/i)).toBeInTheDocument();
    expect(screen.queryByText(/mensagem interna/i)).not.toBeInTheDocument();
  });

  it("apresenta o erro do campo em resposta 400", async () => {
    const action = () => api.post("/formulario/", {});
    render(<ErrorProbe action={action} />);
    expect(await screen.findByText(/este campo é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/revise os dados/i)).toBeInTheDocument();
  });

  it("renderiza conteúdo textual da API sem criar ou executar HTML", async () => {
    const action = () => api.get("/conteudo-malicioso/");
    const { container } = render(<ErrorProbe action={action} />);

    expect(await screen.findByText(/<img src=x onerror=/i)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(window.__pacXssExecuted).toBeUndefined();
  });
});
