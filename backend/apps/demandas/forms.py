# Forms para o app demandas
from decimal import Decimal

from django import forms

from .models import Demanda, ItemDemanda


class DemandaForm(forms.ModelForm):
    class Meta:
        model = Demanda
        fields = ["ano_referencia", "observacao"]
        widgets = {
            "ano_referencia": forms.NumberInput(attrs={"class": "form-control"}),
            "observacao": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 3,
                    "placeholder": "Observações gerais da demanda",
                }
            ),
        }


class ItemDemandaForm(forms.ModelForm):
    class Meta:
        model = ItemDemanda
        exclude = ["demanda", "valor_total", "status"]
        widgets = {
            "item_catalogo": forms.Select(attrs={"class": "form-select"}),
            "tipo": forms.Select(attrs={"class": "form-select"}),
            "nome": forms.TextInput(attrs={"class": "form-control"}),
            "descricao": forms.Textarea(attrs={"class": "form-control", "rows": 3}),
            "unidade_medida": forms.TextInput(attrs={"class": "form-control"}),
            "quantidade": forms.NumberInput(attrs={"class": "form-control", "min": 1}),
            "valor_estimado": forms.NumberInput(
                attrs={"class": "form-control", "step": "0.01", "min": "0.01"}
            ),
            "data_prevista": forms.DateInput(
                attrs={"class": "form-control", "type": "date"}
            ),
            "prioridade": forms.Select(attrs={"class": "form-select"}),
            "justificativa_prioridade": forms.Textarea(
                attrs={"class": "form-control", "rows": 3}
            ),
            "justificativa_necessidade": forms.Textarea(
                attrs={"class": "form-control", "rows": 3}
            ),
            "indicacao_orcamentaria": forms.TextInput(attrs={"class": "form-control"}),
        }

    def clean(self):
        cleaned = super().clean()

        quantidade = cleaned.get("quantidade")
        valor_estimado = cleaned.get("valor_estimado")

        if quantidade is not None and quantidade <= 0:
            self.add_error("quantidade", "A quantidade deve ser maior que zero.")

        if valor_estimado is not None and valor_estimado <= Decimal("0"):
            self.add_error(
                "valor_estimado",
                "O valor estimado deve ser maior que zero.",
            )

        return cleaned
