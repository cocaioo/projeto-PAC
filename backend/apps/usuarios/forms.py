from django import forms
from django.contrib.auth.forms import UserCreationForm

from .models import Usuario


class UsuarioCreateForm(UserCreationForm):
    class Meta:
        model = Usuario
        fields = (
            "username",
            "first_name",
            "last_name",
            "email",
            "siape",
            "perfil",
            "unidade",
        )

        widgets = {
            "username": forms.TextInput(attrs={"class": "form-control"}),
            "first_name": forms.TextInput(attrs={"class": "form-control"}),
            "last_name": forms.TextInput(attrs={"class": "form-control"}),
            "email": forms.EmailInput(attrs={"class": "form-control"}),
            "siape": forms.TextInput(attrs={"class": "form-control"}),
            "perfil": forms.Select(attrs={"class": "form-select"}),
            "unidade": forms.Select(attrs={"class": "form-select"}),
        }


class UsuarioUpdateForm(forms.ModelForm):
    class Meta:
        model = Usuario
        fields = (
            "first_name",
            "last_name",
            "email",
            "siape",
            "perfil",
            "unidade",
            "is_active",
        )

        widgets = {
            "first_name": forms.TextInput(attrs={"class": "form-control"}),
            "last_name": forms.TextInput(attrs={"class": "form-control"}),
            "email": forms.EmailInput(attrs={"class": "form-control"}),
            "siape": forms.TextInput(attrs={"class": "form-control"}),
            "perfil": forms.Select(attrs={"class": "form-select"}),
            "unidade": forms.Select(attrs={"class": "form-select"}),
        }
