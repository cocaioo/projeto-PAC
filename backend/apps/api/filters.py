import django_filters
from django.db.models import Q, Sum
from apps.demandas.models import Demanda, StatusDemanda
from apps.validacoes.models import TipoAcao, Validacao
from apps.api.views import itens_no_escopo_do_usuario
from apps.demandas.models import ItemDemanda

class DemandaFilterSet(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=StatusDemanda.choices)
    unidade = django_filters.NumberFilter(field_name='unidade_id')
    grupo_contratacao = django_filters.NumberFilter(method='filter_grupo_contratacao')
    valor_min = django_filters.NumberFilter(method='filter_valor_min')
    valor_max = django_filters.NumberFilter(method='filter_valor_max')
    data_inicio = django_filters.DateFilter(method='filter_data_inicio')
    data_fim = django_filters.DateFilter(method='filter_data_fim')
    aguardando_minha_acao = django_filters.BooleanFilter(method='filter_aguardando_minha_acao')

    class Meta:
        model = Demanda
        fields = []

    def filter_grupo_contratacao(self, queryset, name, value):
        return queryset.filter(itens__item_catalogo__grupo_id=value).distinct()

    def _annotate_valor(self, queryset):
        user = self.request.user
        if user.is_admin_master_user:
            return queryset.annotate(valor_total_filtro=Sum('itens__valor_total'))
        elif user.is_admin_user:
            escopo = user.filtro_grupos_administrados('itens__item_catalogo__grupo')
            if user.unidade_id:
                escopo |= Q(itens__item_catalogo__isnull=True, unidade_id=user.unidade_id)
            return queryset.annotate(valor_total_filtro=Sum('itens__valor_total', filter=escopo))
        else:
            # Para usuarios comuns, apenas os proprios itens entram na conta (mas a demanda ja os isola)
            return queryset.annotate(valor_total_filtro=Sum('itens__valor_total'))

    def filter_valor_min(self, queryset, name, value):
        qs = self._annotate_valor(queryset)
        return qs.filter(valor_total_filtro__gte=value)

    def filter_valor_max(self, queryset, name, value):
        qs = self._annotate_valor(queryset)
        return qs.filter(valor_total_filtro__lte=value)

    def filter_data_inicio(self, queryset, name, value):
        return queryset.filter(itens__data_prevista__gte=value).distinct()

    def filter_data_fim(self, queryset, name, value):
        return queryset.filter(itens__data_prevista__lte=value).distinct()

    def filter_aguardando_minha_acao(self, queryset, name, value):
        if str(value).lower() not in ['true', '1', 'sim']:
            return queryset
        user = self.request.user
        if user.is_admin_master_user or user.is_admin_user:
            escopo = user.filtro_grupos_administrados('itens__item_catalogo__grupo')
            if user.unidade_id:
                escopo |= Q(itens__item_catalogo__isnull=True, unidade_id=user.unidade_id)
            return queryset.filter(
                escopo & Q(itens__status='aguardando_validacao')
            ).distinct()
        return queryset.filter(usuario=user, itens__status='devolvida').distinct()

