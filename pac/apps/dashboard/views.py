from django.shortcuts import render


def home(request):
    """Página inicial — redireciona para o dashboard."""
    return render(request, 'home.html')
