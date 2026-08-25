"""Definições fictícias e determinísticas da massa de homologação do PAC."""

from decimal import Decimal


ANO_REFERENCIA = 2099
SEED_NAMESPACE = "[SEED:HML-MASSA]"
VALIDATION_NAMESPACE = "[SEED:HML-VAL]"


UNIDADES = (
    ("sti", "STI", "STI — Superintendência de Tecnologia da Informação"),
    ("prad", "PRAD", "PRAD — Pró-Reitoria de Administração"),
    ("preuni", "PREUNI", "PREUNI — Prefeitura Universitária"),
    ("biblioteca", "BCCB", "BCCB — Biblioteca Comunitária Carlos Castello Branco"),
    ("cmpp", "CMPP", "CMPP — Campus Ministro Petrônio Portella (Teresina)"),
    ("cce", "CCE", "CCE — Centro de Ciências da Educação"),
    ("ccn", "CCN", "CCN — Centro de Ciências da Natureza"),
    ("ct", "CT", "CT — Centro de Tecnologia"),
    ("parnaiba", "CPAR", "CPAR — Campus de Parnaíba (Histórico UFPI)"),
    ("picos", "CSHNB", "CSHNB — Campus Senador Helvídio Nunes de Barros (Picos)"),
    ("floriano", "CAFS", "CAFS — Campus Amílcar Ferreira Sobral (Floriano)"),
    ("computacao", "CCN-DC", "CCN — Departamento de Computação"),
    ("enfermagem", "CCS-DENF", "CCS — Departamento de Enfermagem"),
    ("administracao", "CCHL-CADM", "CCHL — Coordenação do Curso de Administração"),
    ("matematica", "CCN-DMAT", "CCN — Departamento de Matemática"),
    ("fisica", "CCN-DFIS", "CCN — Departamento de Física"),
    ("letras", "CCHL-DLET", "CCHL — Departamento de Letras"),
    ("preg", "PREG", "PREG — Pró-Reitoria de Ensino de Graduação"),
    ("prpg", "PRPG", "PRPG — Pró-Reitoria de Ensino de Pós-Graduação"),
    ("proplan", "PROPLAN", "PROPLAN — Pró-Reitoria de Planejamento e Orçamento"),
    ("praec", "PRAEC", "PRAEC — Pró-Reitoria de Assuntos Estudantis e Comunitários"),
    ("prex", "PREX", "PREX — Pró-Reitoria de Extensão e Cultura"),
    ("propesqi", "PROPESQI", "PROPESQI — Pró-Reitoria de Pesquisa e Inovação"),
    ("cchl", "CCHL", "CCHL — Centro de Ciências Humanas e Letras"),
    ("ccs", "CCS", "CCS — Centro de Ciências da Saúde"),
    ("cca", "CCA", "CCA — Centro de Ciências Agrárias"),
    ("cpce", "CPCE", "CPCE — Campus Professora Cinobelina Elvas (Bom Jesus)"),
    ("ctf", "CTF", "CTF — Colégio Técnico de Floriano"),
    ("ctt", "CTT", "CTT — Colégio Técnico de Teresina"),
    ("ctbj", "CTBJ", "CTBJ — Colégio Técnico de Bom Jesus"),
)


GRUPOS = (
    (
        "tic",
        "TIC Homologação",
        "Bens, licenças e serviços de tecnologia da informação.",
        "sti",
    ),
    (
        "infraestrutura",
        "Infraestrutura Homologação",
        "Obras, manutenção predial e adequações de infraestrutura.",
        "preuni",
    ),
    (
        "almoxarifado",
        "Almoxarifado Homologação",
        "Materiais de consumo e suprimentos administrativos.",
        "prad",
    ),
    (
        "servicos",
        "Serviços Homologação",
        "Serviços continuados e apoio às atividades institucionais.",
        "prad",
    ),
    (
        "permanentes",
        "Equipamentos Permanentes Homologação",
        "Equipamentos permanentes não classificados como TIC.",
        "prad",
    ),
)


USUARIOS_BASE = (
    ("usuario_teste", "Joara", "Solicitante", "usuario", "ccn", False),
    ("usuario_sem_demanda", "Lia", "Sem Demanda", "usuario", "letras", False),
    ("admin_teste", "Gestor", "TIC", "admin", "sti", True),
    ("admin_outro_grupo", "Gestora", "Infraestrutura", "admin", "preuni", True),
    ("admin_almoxarifado", "Gestor", "Almoxarifado", "admin", "prad", True),
    ("admin_servicos", "Gestora", "Serviços", "admin", "prad", True),
    ("admin_permanentes", "Gestor", "Permanentes", "admin", "prad", True),
    ("admin_master_teste", "Gestora", "Master", "admin_master", "sti", True),
)



def _catalogo(codigo, tipo, nome, descricao, grupo, unidade, valor, ativo=True):
    return {
        "codigo": codigo,
        "tipo": tipo,
        "nome": nome,
        "descricao": descricao,
        "grupo": grupo,
        "unidade_medida": unidade,
        "valor_estimado": Decimal(valor),
        "ativo": ativo,
    }


CATALOGO = (
    _catalogo("HML-CAT-001", "material", "Notebook Administrativo", "Notebook corporativo com 16 GB de memória, SSD e garantia de três anos.", "tic", "unidade", "5200.00"),
    _catalogo("HML-CAT-002", "material", "Monitor 24 polegadas", "Monitor IPS Full HD com conexões HDMI e DisplayPort.", "tic", "unidade", "1150.00"),
    _catalogo("HML-CAT-003", "material", "Switch 24 portas", "Switch gerenciável Gigabit com suporte a VLAN e empilhamento.", "tic", "unidade", "3900.00"),
    _catalogo("HML-CAT-004", "material", "Nobreak", "Nobreak senoidal de 1500 VA para estações e equipamentos de rede.", "tic", "unidade", "2300.00"),
    _catalogo("HML-SER-001", "servico", "Ponto de rede cabeada", "Instalação certificada de ponto lógico categoria 6.", "tic", "ponto", "480.00"),
    _catalogo("HML-CAT-999", "material", "Computador legado descontinuado", "Modelo mantido inativo para validar filtros administrativos.", "tic", "unidade", "2800.00", False),
    _catalogo("HML-TIC-005", "material", "Computador Intermediário", "Estação para atividades administrativas com processador intermediário e SSD.", "tic", "unidade", "4600.00"),
    _catalogo("HML-TIC-006", "material", "Computador Avançado", "Estação de alto desempenho para laboratórios e processamento científico.", "tic", "unidade", "9800.00"),
    _catalogo("HML-TIC-007", "material", "Notebook de Alto Desempenho", "Notebook para desenvolvimento, geoprocessamento e produção audiovisual.", "tic", "unidade", "11200.00"),
    _catalogo("HML-TIC-008", "material", "Monitor 27 polegadas", "Monitor IPS QHD com ajuste de altura.", "tic", "unidade", "2100.00"),
    _catalogo("HML-TIC-009", "material", "Projetor Multimídia", "Projetor de 4.000 lúmens para salas de aula e auditórios.", "tic", "unidade", "7200.00"),
    _catalogo("HML-TIC-010", "material", "Equipamento de Videoconferência", "Kit institucional com câmera PTZ, microfone e caixa de som.", "tic", "kit", "14500.00"),
    _catalogo("HML-TIC-011", "material", "Webcam Full HD", "Webcam 1080p com microfone integrado e proteção de lente.", "tic", "unidade", "430.00"),
    _catalogo("HML-TIC-012", "material", "Scanner de Mesa", "Scanner duplex com alimentador automático de documentos.", "tic", "unidade", "3600.00"),
    _catalogo("HML-TIC-013", "material", "Telefone IP", "Telefone IP corporativo com PoE e duas contas SIP.", "tic", "unidade", "690.00"),
    _catalogo("HML-TIC-014", "servico", "Certificado Digital e-CPF", "Emissão de certificado ICP-Brasil para pessoa física, validade de três anos.", "tic", "certificado", "260.00"),
    _catalogo("HML-TIC-015", "servico", "Certificado Digital e-CNPJ", "Emissão de certificado ICP-Brasil para pessoa jurídica, validade de três anos.", "tic", "certificado", "390.00"),
    _catalogo("HML-TIC-016", "servico", "Licença Microsoft 365", "Assinatura anual de produtividade e colaboração institucional.", "tic", "licença/ano", "980.00"),
    _catalogo("HML-TIC-017", "servico", "Licença Adobe Creative Cloud", "Assinatura anual para produção gráfica e audiovisual.", "tic", "licença/ano", "4200.00"),
    _catalogo("HML-TIC-018", "servico", "Licença antivírus corporativo", "Proteção anual de endpoint com gerenciamento centralizado.", "tic", "licença/ano", "180.00"),
    _catalogo("HML-TIC-019", "material", "Roteador corporativo", "Roteador para enlaces institucionais com suporte a VPN.", "tic", "unidade", "6400.00"),
    _catalogo("HML-TIC-020", "material", "Access Point Wi-Fi", "Ponto de acesso Wi-Fi 6 com gerenciamento centralizado.", "tic", "unidade", "2750.00"),
    _catalogo("HML-TIC-021", "material", "SSD 1 TB", "Unidade de armazenamento SSD NVMe de 1 TB.", "tic", "unidade", "620.00"),
    _catalogo("HML-TIC-022", "material", "HD externo 2 TB", "Disco externo USB 3.0 para cópias de segurança locais.", "tic", "unidade", "590.00"),
    _catalogo("HML-TIC-023", "material", "Mouse", "Mouse óptico USB ambidestro para uso administrativo.", "tic", "unidade", "65.00"),
    _catalogo("HML-TIC-024", "material", "Teclado", "Teclado USB padrão ABNT2 resistente a líquidos.", "tic", "unidade", "120.00"),
    _catalogo("HML-TIC-025", "material", "Headset", "Headset USB com cancelamento de ruído no microfone.", "tic", "unidade", "310.00"),
    _catalogo("HML-TIC-026", "servico", "Consultoria em sistemas SIG/UFRN", "Serviço especializado de evolução e integração dos sistemas SIG.", "tic", "hora técnica", "240.00"),
    _catalogo("HML-TIC-998", "servico", "Antivírus legado", "Licença descontinuada mantida inativa para teste.", "tic", "licença/ano", "90.00", False),
    _catalogo("HML-INF-001", "servico", "Adequação de sala acadêmica", "Adequação elétrica, lógica e de acessibilidade em ambiente acadêmico.", "infraestrutura", "serviço", "48000.00"),
    _catalogo("HML-INF-002", "servico", "Manutenção elétrica predial", "Manutenção preventiva e corretiva de instalações elétricas.", "infraestrutura", "serviço", "18500.00"),
    _catalogo("HML-INF-003", "servico", "Instalação de climatização", "Instalação completa de equipamento de climatização.", "infraestrutura", "serviço", "3200.00"),
    _catalogo("HML-ALM-001", "material", "Papel A4", "Resma de papel A4 branco 75 g/m².", "almoxarifado", "resma", "31.00"),
    _catalogo("HML-ALM-002", "material", "Toner para impressora", "Cartucho de toner de alto rendimento compatível com parque institucional.", "almoxarifado", "unidade", "490.00"),
    _catalogo("HML-ALM-999", "material", "Toner de modelo descontinuado", "Suprimento inativo para validar filtros de catálogo.", "almoxarifado", "unidade", "350.00", False),
    _catalogo("HML-SRV-001", "servico", "Serviço de limpeza técnica", "Limpeza especializada de laboratórios e ambientes com equipamentos.", "servicos", "mês", "9800.00"),
    _catalogo("HML-SRV-002", "servico", "Apoio a eventos acadêmicos", "Equipe de apoio operacional para eventos institucionais.", "servicos", "diária", "1450.00"),
    _catalogo("HML-SRV-003", "servico", "Digitalização de acervo", "Digitalização, indexação e tratamento de documentos.", "servicos", "milheiro", "2300.00"),
    _catalogo("HML-EQP-001", "material", "Ar-condicionado 24.000 BTU", "Equipamento inverter para laboratórios e salas de aula.", "permanentes", "unidade", "6700.00"),
    _catalogo("HML-EQP-002", "material", "Mesa para laboratório", "Mesa reforçada com tratamento anticorrosivo.", "permanentes", "unidade", "1850.00"),
    _catalogo("HML-EQP-003", "material", "Armário de aço", "Armário alto com portas e quatro prateleiras reguláveis.", "permanentes", "unidade", "2100.00"),
)


CENARIOS = (
    ("rascunho", 5),
    ("aguardando", 8),
    ("parcial", 5),
    ("devolvida", 5),
    ("reenviada", 5),
    ("validada", 5),
    ("consolidada", 5),
    ("cancelada", 3),
)


JUSTIFICATIVAS = (
    "Necessário para renovação do parque computacional da unidade.",
    "Equipamentos atuais apresentam falhas recorrentes e baixo desempenho.",
    "Demanda necessária para atividades acadêmicas em laboratório.",
    "Aquisição prevista para atender novos servidores da unidade.",
    "Solução necessária para videoconferências institucionais.",
)


MOTIVOS_DEVOLUCAO = (
    "Pedido precisa de melhor detalhamento técnico.",
    "Quantidade solicitada incompatível com o histórico da unidade.",
    "Item deve ser padronizado conforme catálogo institucional.",
)
