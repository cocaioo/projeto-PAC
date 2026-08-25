import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ApiErrorMessage from "../components/ApiErrorMessage";
import { Button, Card, Input } from "../components/ui";

const EMPTY_FORM = {
  currentPassword: "",
  newPassword: "",
  passwordConfirmation: "",
};

const API_FIELD_NAMES = {
  currentPassword: ["current_password", "senha_atual", "old_password"],
  newPassword: ["new_password", "nova_senha"],
  passwordConfirmation: [
    "new_password_confirmation",
    "new_password_confirm",
    "confirm_password",
    "confirmacao",
    "confirmacao_senha",
  ],
};

function firstError(messages) {
  if (Array.isArray(messages)) return messages[0];
  return messages || "";
}

function errorsFromApi(error) {
  const apiErrors = error?.fieldErrors || {};
  return Object.fromEntries(
    Object.entries(API_FIELD_NAMES).map(([field, names]) => [
      field,
      firstError(names.map((name) => apiErrors[name]).find(Boolean)),
    ])
  );
}

function validate(form) {
  const errors = {};

  if (!form.currentPassword) errors.currentPassword = "Informe sua senha atual.";
  if (!form.newPassword) errors.newPassword = "Informe a nova senha.";
  if (!form.passwordConfirmation) {
    errors.passwordConfirmation = "Confirme a nova senha.";
  } else if (form.newPassword && form.newPassword !== form.passwordConfirmation) {
    errors.passwordConfirmation = "As senhas não conferem.";
  }

  return errors;
}

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [navigate, successMessage]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setGeneralError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setGeneralError("");
    setSuccessMessage("");

    const validationErrors = validate(form);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await changePassword({
        senha_atual: form.currentPassword,
        nova_senha: form.newPassword,
        confirmacao_senha: form.passwordConfirmation,
      });
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setSuccessMessage("Senha alterada com sucesso. Redirecionando...");
    } catch (error) {
      setFieldErrors(errorsFromApi(error));
      setGeneralError(error?.message || "Não foi possível alterar sua senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="standalone-page">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <Card className="mt-4">
            <h1 className="h4 mb-3 text-center">Troque sua senha</h1>
            <p className="text-muted mb-4">
              Por segurança, você precisa definir uma nova senha antes de continuar usando a plataforma.
            </p>

            {successMessage && (
              <div className="alert alert-success" role="status" aria-live="polite">
                {successMessage}
              </div>
            )}
            <ApiErrorMessage error={generalError} title="Não foi possível alterar a senha" />

            <form onSubmit={handleSubmit} noValidate>
              <Input
                id="current-password"
                type="password"
                label="Senha atual"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) => updateField("currentPassword", event.target.value)}
                error={fieldErrors.currentPassword}
                required
              />
              <Input
                id="new-password"
                type="password"
                label="Nova senha"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(event) => updateField("newPassword", event.target.value)}
                error={fieldErrors.newPassword}
                required
              />
              <Input
                id="password-confirmation"
                type="password"
                label="Confirme a nova senha"
                autoComplete="new-password"
                value={form.passwordConfirmation}
                onChange={(event) => updateField("passwordConfirmation", event.target.value)}
                error={fieldErrors.passwordConfirmation}
                required
              />
              <Button type="submit" className="w-100" loading={submitting}>
                {submitting ? "Alterando..." : "Alterar senha"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
