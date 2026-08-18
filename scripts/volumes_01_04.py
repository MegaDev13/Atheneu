# Conteúdo dos volumes 1–4 da Investigação Crítica.
from __future__ import annotations

COVER = "public/covers"


def vol01():
    return {
        "volume": 1,
        "slug": "investigacao-01-raizes-e-mapa-das-ideias",
        "title": "Raízes e mapa das ideias",
        "subtitle": "Das comunidades arcaicas aos socialistas utópicos — continuidade, ruptura e o que não deve ser chamado de comunismo.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "História",
        "cover": f"{COVER}/inv-01-raizes.jpg",
        "cover_public": "covers/inv-01-raizes.jpg",
        "blurb": "Primeiro volume da investigação: reconstrução das raízes intelectuais anteriores ao marxismo, sem projetar o vocabulário do século XX sobre Platão, More ou Müntzer. Fontes primárias, historiografia e o que permanece incerto.",
        "chapters": [
            {
                "title": "Como esta investigação foi feita",
                "blocks": [
                    ("p", "Esta série não pergunta se o comunismo é “bom” ou se o capitalismo é “mau”. Pergunta de onde vieram as ideias, quais problemas pretendiam resolver, quais previsões fizeram, como foram implementadas, quais resultados produziram, quais custos tiveram, quais críticas a experiência confirmou ou enfraqueceu, e o que permanece em disputa acadêmica."),
                    ("p", "A metodologia segue uma cadeia deliberada: fonte primária (o que o autor ou o Estado realmente escreveu) → historiografia especializada → interpretação contemporânea. Wikipedia, blogs e vídeos serviram, quando muito, para localizar referências — nunca como evidência. Cada afirmação controversa traz a estimativa, a fonte e o grau de consenso."),
                    ("h2", "Classificação das fontes"),
                    ("p", "Nível 1 — fonte primária: documento produzido no acontecimento ou pelo próprio autor (manifestos, cartas, constituições, censos, relatórios). Nível 2 — livro ou artigo de especialista com método historiográfico ou econômico. Nível 3 — universidade, arquivo, organismo internacional. Nível 4 — jornalismo. Nível 5 — ensaio não acadêmico. Níveis 4 e 5 nunca equivalem a 1 ou 2."),
                    ("h2", "Controle contra viés"),
                    ("p", "Para cada tese do tipo “X causou Y” procuramos também “X não causou Y” e “X contribuiu parcialmente para Y”. Evitamos cherry-picking de exemplos extremos, anacronismos (chamar Platão de comunista), equivalência falsa entre regimes distintos e tanto a demonização quanto a romantização."),
                    ("box", "O que este volume estabelece como método", [
                        "Alta confiança: as tradições igualitárias anteriores a 1848 existem e são documentáveis; não formam uma linhagem única.",
                        "Provável: várias delas influenciaram o vocabulário posterior do socialismo, por via indireta (More, Babeuf, Owen).",
                        "Controverso: se existe um “comunismo primitivo” como estágio universal da história.",
                        "Não sabemos: a vida cotidiana interna da maior parte das comunidades milenaristas, por falta de arquivos próprios.",
                    ]),
                ],
            },
            {
                "title": "Comunidades, propriedade e o perigo do anacronismo",
                "blocks": [
                    ("p", "A etnografia e a arqueologia documentam, em sociedades de pequena escala, formas de uso coletivo da terra, partilha de caça e obrigações recíprocas. Isso não autoriza transformá-las em “comunismo”. Comunismo, no sentido moderno, é um projeto político nascido no século XIX: abolição da propriedade privada dos meios de produção, em sociedade industrial, com teoria da história e pretensão universal."),
                    ("p", "Lewis Henry Morgan (Ancient Society, 1877) descreveu a gens iroquesa e a propriedade coletiva do clã. Engels leu Morgan e, em A origem da família, da propriedade privada e do Estado (1884), transformou essas observações num estágio (“comunismo primitivo”) que precederia a propriedade privada e o Estado. A leitura é uma interpretação do século XIX, não um consenso antropológico atual."),
                    ("h2", "Perspectivas em conflito"),
                    ("p", "Perspectiva A (marxista clássica): a propriedade privada e o Estado são produtos históricos da luta de classes; sociedades sem classes teriam existido e poderão existir de novo. Perspectiva B (crítica liberal e antropológica contemporânea): a diversidade de regimes de propriedade é enorme; “comunismo primitivo” homogeneíza povos distintos e serve a uma teleologia. Perspectiva C (revisionista): havia comuns e obrigações coletivas, mas também hierarquia, guerra, escravidão e exclusão — a história não é uma escada de estágios."),
                    ("p", "O consenso atual em antropologia econômica (Polanyi, Sahlins, e a crítica posterior a ambos) é que mercados, dádivas e redistribuição coexistiram em combinações locais. Não há evidência sólida de um estágio universal sem propriedade e sem autoridade."),
                    ("src", "Nível 1: Engels, A origem da família… (1884), a partir de Morgan. Nível 2: Karl Polanyi, A grande transformação (1944); Marshall Sahlins, Stone Age Economics (1972). Nível 3: debates posteriores em antropologia econômica (anos 1980–2000)."),
                ],
            },
            {
                "title": "Pensamento grego, estoicismo e religião comunitária",
                "blocks": [
                    ("p", "Na República, Platão descreve para os guardiões a comunhão de bens, refeições comuns e a abolição da família nuclear da classe dirigente. Não é um programa para toda a cidade, nem uma teoria da exploração do trabalho. Aristóteles, na Política, rejeita essa comunhão: o que é de todos é de ninguém, e o cuidado diminui sem afeição particular. A objeção aristotélica reaparece, com outra roupagem, nas críticas modernas aos incentivos do socialismo."),
                    ("quote", "A história de toda a sociedade até hoje existente é a história da luta de classes.", "Karl Marx e Friedrich Engels, Manifesto do Partido Comunista, 1848. Nível 1 — marxists.org."),
                    ("p", "A frase acima, escrita dois milênios depois de Platão, ilustra a ruptura: Marx não reivindica a República como manual. O estoicismo (Epicteto, Sêneca, Marco Aurélio) fala de cosmópolis e de dever comum, não de abolição da propriedade. Tradições religiosas — Atos dos Apóstolos 2,24–45 (partilha dos bens entre os fiéis de Jerusalém), mosteiros beneditinos, ordens mendicantes — praticaram vida comum sob voto, não sob Estado."),
                    ("h2", "Continuidade e ruptura"),
                    ("p", "Há continuidade de imagens: refeição comum, recusa do luxo, suspeita da avareza. Há ruptura de escala e de sujeito: o mosteiro é voluntário e limitado; o programa moderno pretende reorganizar a sociedade inteira. Classificar São Francisco ou os essênios como “comunistas” é anacronismo."),
                    ("box", "Graus de confiança", [
                        "Alta confiança: a República não é um manifesto comunista; Aristóteles formula uma crítica de incentivos ainda reconhecível.",
                        "Provável: imagens cristãs de partilha alimentaram vocabulário radical posterior (camponeses, anabatistas).",
                        "Controverso: o peso real de Atos 2 na prática das primeiras comunidades — o texto é teológico, não um censo.",
                        "Não sabemos: a economia cotidiana da maior parte dos mosteiros medievais em detalhe comparável.",
                    ]),
                ],
            },
            {
                "title": "Revoltas camponesas, milenarismo e iguais",
                "blocks": [
                    ("p", "As guerras camponesas e os movimentos milenaristas misturam fome, fiscalidade, religião e, às vezes, igualitarismo. Não são “ensaios de socialismo”. A Revolta de Wat Tyler (Inglaterra, 1381) protestou contra a poll tax e a servidão residual. A Guerra dos Camponeses alemã (1524–1525) uniu queixas agrárias à Reforma. Thomas Müntzer pregou um reino de Deus dos eleitos e foi executado após Frankenhausen."),
                    ("p", "Gerrard Winstanley e os Diggers (1649) ocuparam terras comuns em St. George’s Hill, sustentando que a terra era tesouro comum após a criação. O texto The True Levellers Standard Advanced é fonte primária de um comunalismo agrário cristão, não de ditadura do proletariado. François-Noël Babeuf, na Conjuração dos Iguais (1796), já fala de igualdade real, armazéns comuns e fim da herança — aqui o vocabulário se aproxima do comunismo político moderno."),
                    ("h2", "Causas das revoltas — não reduzir a ideologia"),
                    ("p", "Fome, guerra, impostos, quebra de costumes agrários e pregação religiosa combinam-se. A historiografia de Norman Cohn (The Pursuit of the Millennium) enfatiza o milenarismo; historiadores sociais enfatizam renda e direito costumeiro. A evidência favorece a combinação, não o monocausalismo."),
                    ("src", "Nível 1: Doze Artigos dos camponeses (1525); Winstanley, 1649; documentos do processo Babeuf. Nível 2: Norman Cohn (1957); Peter Blickle sobre a Guerra dos Camponeses."),
                ],
            },
            {
                "title": "Utopistas: More, Saint-Simon, Fourier, Owen, Cabet",
                "blocks": [
                    ("p", "A Utopia de Thomas More (1516) é sátira humanista e espelho da Inglaterra dos cercamentos, não um partido. Descreve propriedade comum, trabalho obrigatório e tolerância religiosa numa ilha imaginária. Engels, em Do socialismo utópico ao socialismo científico (1880), batizou de “utópicos” os reformadores que, segundo ele, desenhariam a sociedade ideal sem analisar as leis do capital."),
                    ("p", "Claude-Henri de Saint-Simon propôs uma sociedade dirigida por industriais e sábios, não a abolição das classes no sentido marxista. Charles Fourier imaginou falanstérios e atração passional — crítica da família e do comércio, com detalhe quase novelístico. Robert Owen, industrial em New Lanark, reduziu jornadas, criou escola infantil e tentou comunidades (New Harmony, 1825) que fracassaram por conflito interno e subcapitalização. Étienne Cabet, em Viagem a Icária (1840), descreveu um comunismo icariano; colônias nos EUA também se desfizeram."),
                    ("h2", "O que o rótulo “utópico” esconde"),
                    ("p", "Owen era fabricante prático; Fourier era visionário sistemático; Saint-Simon era teórico da indústria. Agrupá-los só como precursores “ingénuos” de Marx distorce a evidência. Eles responderam à desorganização social da primeira industrialização com experimentos locais, não com tomada do Estado."),
                    ("box", "Mapa de continuidade", [
                        "More → linguagem da propriedade comum e da crítica moral à ganância.",
                        "Babeuf → igualdade substantiva e conspiração política (ponte para Blanqui e, indiretamente, para correntes jacobinas do século XIX).",
                        "Owen/Fourier → cooperativa, educação e crítica da fábrica — absorvidos pelo socialismo associacionista e, depois, pelo cooperativismo.",
                        "Ruptura marxista: análise do valor, da mais-valia e da história como luta de classes; recusa do desenho prévio da sociedade futura.",
                    ]),
                ],
            },
            {
                "title": "Rousseau, a propriedade e o contrato",
                "blocks": [
                    ("p", "Jean-Jacques Rousseau, no Discurso sobre a origem da desigualdade (1755), narra o primeiro que cercou um terreno e disse “isto é meu”. Não é um tratado de abolição da propriedade: no Contrato social, a propriedade é mediada pela vontade geral. A leitura socialista posterior radicalizou o mito da cerca; a leitura liberal retém o contrato e a liberdade civil."),
                    ("p", "A influência é real e indireta: a Revolução Francesa, Babeuf e os jacobinos beberam de um clima rousseauniano de virtude e igualdade. Isso não faz de Rousseau um comunista. A classificação adequada é republicanismo democrático radical, com tensão interna entre liberdade e igualdade."),
                    ("box", "Síntese do volume", [
                        "Alta confiança: há tradições comunitárias e igualitárias longas; o comunismo moderno é ruptura oitocentista.",
                        "Provável: Owen e Babeuf são os elos mais próximos do vocabulário posterior.",
                        "Controverso: o “comunismo primitivo” como estágio universal.",
                        "Não sabemos: quantas experiências comunitárias menores desapareceram sem arquivo.",
                    ]),
                ],
            },
        ],
    }


def vol02():
    return {
        "volume": 2,
        "slug": "investigacao-02-revolucao-industrial-e-socialismo",
        "title": "A fábrica e o século XIX",
        "subtitle": "Revolução Industrial, formação do proletariado e o nascimento do socialismo moderno — sem assumir de antemão a narrativa socialista nem a liberal.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "História",
        "cover": f"{COVER}/inv-02-industria.jpg",
        "cover_public": "covers/inv-02-industria.jpg",
        "blurb": "Como a fábrica, a cidade e o trabalho infantil do século XIX tornaram pensável um socialismo de classe operária. Confronta Engels, historiadores sociais britânicos e revisionistas da Revolução Industrial.",
        "chapters": [
            {
                "title": "O que foi a Revolução Industrial — e o que não foi",
                "blocks": [
                    ("p", "Entre meados do século XVIII e o último terço do XIX, a Grã-Bretanha — depois a Europa ocidental e os Estados Unidos — passou de uma economia orgânica (energia muscular, madeira, água) a uma economia mineral (carvão, vapor, ferro). A produtividade do algodão, do ferro e dos transportes cresceu de forma inédita na história conhecida. Isso não significa que o nível de vida de todos tenha subido ao mesmo tempo, nem que a fábrica tenha sido o único destino do trabalho."),
                    ("p", "A historiografia se divide. A tese pessimista (Engels, A situação da classe trabalhadora na Inglaterra, 1845; depois Hobsbawm) enfatiza superlotação, jornadas de 12–16 horas, trabalho infantil e mortalidade urbana. A tese otimista (Clapham, Ashton, e a cliometria de Lindert, Williamson, Crafts, Feinstein) mostra que salários reais, após estagnação nas primeiras décadas, sobem na segunda metade do século, e que a altura média e a expectativa de vida acabam melhorando."),
                    ("h2", "Três leituras"),
                    ("p", "Perspectiva A: a industrialização foi um processo de pauperização relativa e absoluta que só a organização operária e, mais tarde, o Estado social reverteram. Perspectiva B: o mercado e o crescimento técnico elevaram o nível de vida; as denúncias contemporâneas misturam moralismo vitoriano e amostragem das piores cidades. Perspectiva C (hoje majoritária entre historiadores econômicos): houve um “vale” de sofrimento urbano nas primeiras gerações, com ganhos posteriores desiguais por região, sexo e ofício."),
                    ("src", "Nível 1: relatórios das Factory Commissions (1833); Poor Law Commission. Nível 2: E. P. Thompson, The Making of the English Working Class (1963); C. Feinstein sobre salários reais; R. C. Allen sobre a Revolução Industrial britânica."),
                ],
            },
            {
                "title": "Trabalho, crianças, jornada e cidade",
                "blocks": [
                    ("p", "Os relatórios parlamentares britânicos dos anos 1830–1840 documentam crianças de 8–12 anos em teares e minas, jornadas noturnas e acidentes. As Factory Acts (1833, 1844, 1847 — a “lei das dez horas”) restringiram progressivamente o trabalho infantil e feminino na grande indústria têxtil, não em toda a economia. A legislação é evidência simultânea de crueldade e de capacidade política de reforma dentro do capitalismo."),
                    ("p", "Manchester, Lille, Essen e o East End londrino cresceram sem saneamento adequado. A cólera e a tuberculose eram doenças de densidade e pobreza. Engels descreveu Manchester com olho de militante e de observador; historiadores posteriores confirmaram a gravidade sanitária, mas corrigiram generalizações (nem toda a classe operária vivia no mesmo inferno; ofícios qualificados tinham trajetórias distintas)."),
                    ("p", "O trabalho infantil não nasceu com o vapor: era comum no campo e no artesanato. A novidade foi a concentração, a disciplina do relógio e a visibilidade política. A abolição gradual do trabalho infantil industrial no Ocidente ocorreu por lei, inspeção, educação obrigatória e, mais tarde, por renda familiar mais alta — combinação de Estado, mercado e movimento operário."),
                ],
            },
            {
                "title": "Burguesia, capital e sindicatos",
                "blocks": [
                    ("p", "A “burguesia industrial” não é uma seita: é o conjunto de proprietários de fábricas, bancos e comércio de longa distância que se tornou classe politicamente dominante em vários Estados europeus após 1830–1870. A concentração de capital no algodão e no ferro era real; o mito do monopolista único, não. Havia falências em massa, ciclos e concorrência feroz."),
                    ("p", "Associações operárias, mutualidades e sindicatos enfrentaram leis anticonspiração (Combination Acts britânicas, até 1824–25). O cartismo (1838–1848) uniu sufrágio e questão social. Greves e cooperativas cresceram com a legalização parcial. O movimento operário não é um apêndice do marxismo: predates e excede Marx (trade unions britânicas, proudhonianos franceses, lassalleanos alemães)."),
                    ("box", "O que as condições do século XIX explicam", [
                        "Alta confiança: miséria urbana, jornada extrema e ausência de seguro social tornaram plausível um socialismo de classe.",
                        "Provável: sem a fábrica concentrada, o sujeito “proletariado” do Manifesto não teria a mesma força retórica.",
                        "Controverso: se o nível de vida caiu em termos absolutos entre 1790 e 1840 (debate dos salários reais).",
                        "Não sabemos: a renda real de trabalhadores informais e rurais com a mesma precisão dos operários têxteis.",
                    ]),
                ],
            },
            {
                "title": "1848, a Comuna e o repertório revolucionário",
                "blocks": [
                    ("p", "As revoluções de 1848 misturaram liberalismo nacional, questão agrária e, em Paris, oficinas nacionais e conflito de junho entre operários e a República burguesa. Marx leu 1848 como ensaio da luta de classes moderna (As lutas de classes na França; O 18 de brumário). Historiadores como Jonathan Sperber enfatizam a diversidade nacional: em muito da Europa central, 1848 foi mais camponês e nacional do que proletário."),
                    ("p", "A Comuna de Paris (1871) durou 72 dias. Medidas: separação Igreja-Estado, educação laica, teto de salário de funcionários, gestão de oficinas abandonadas. A repressão de Versalhes matou, segundo estimativas correntes, da ordem de 10 a 20 mil communards (o número exato é controverso). Marx, em A guerra civil na França, viu na Comuna a forma enfim descoberta da emancipação — leitura política, não crônica neutra. Anarquistas (Bakunin) e republicanos deixaram relatos rivais."),
                    ("src", "Nível 1: Marx, A guerra civil na França (1871); proclamações da Comuna. Nível 2: Jacques Rougerie; Robert Tombs (números da Semana Sangrenta)."),
                ],
            },
        ],
    }


def vol03():
    return {
        "volume": 3,
        "slug": "investigacao-03-marx-e-engels",
        "title": "O que Marx e Engels escreveram",
        "subtitle": "Conceitos, textos e a linha que separa o autor das políticas posteriores de Lênin, Stálin e Mao.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "Filosofia",
        "cover": f"{COVER}/inv-03-marx.jpg",
        "cover_public": "covers/inv-03-marx.jpg",
        "blurb": "Leitura direta do Manifesto, de O capital, da Ideologia alemã, da Crítica do programa de Gotha e de textos de Engels. Distingue o escrito das interpretações do século XX.",
        "chapters": [
            {
                "title": "Materialismo histórico — o que o texto diz",
                "blocks": [
                    ("p", "Na Ideologia alemã (1845–46, publicada tardiamente) e no prefácio de 1859 à Contribuição à crítica da economia política, Marx formula o materialismo histórico: o modo como os homens produzem sua vida material condiciona a superestrutura jurídica, política e ideológica. Não está escrito ali um determinismo mecânico de “economia = tudo”. O próprio Marx, em cartas tardias (a Annenkov, a redação da Otechestvennye Zapiski), recusa transformar o esboço numa filosofia da história obrigatória para todos os povos."),
                    ("p", "“Materialismo dialético” como sistema escolar é construção posterior (Plekhanov, depois o diamat soviético). Engels, no Anti-Dühring e em Ludwig Feuerbach, aproxima dialética e ciências naturais; Marx não deixou um tratado equivalente. Atribuir a Marx o manual stalinista de 1938 (Sobre o materialismo dialético e o materialismo histórico) é anacronismo."),
                    ("h2", "Luta de classes"),
                    ("p", "O Manifesto abre com a tese de que a história é luta de classes. No 18 de brumário, a análise se complica: campesinato, lumpen, frações da burguesia, aparato estatal. A luta de classes, em Marx, é ferramenta analítica, não um apelo moral a odiar indivíduos. A redução a um dualismo eterno burguesia/proletariado é mais do Manifesto de combate do que de O capital."),
                ],
            },
            {
                "title": "Alienação, mercadoria e mais-valia",
                "blocks": [
                    ("p", "Os Manuscritos econômico-filosóficos de 1844 descrevem quatro faces da alienação: do produto, da atividade, da essência genérica e dos outros homens. O vocabulário é hegeliano-feuerbachiano. Em O capital, livro I (1867), o centro se desloca para o fetichismo da mercadoria: relações sociais entre pessoas aparecem como relações entre coisas."),
                    ("p", "A mais-valia: o trabalhador vende força de trabalho, mercadoria cujo valor é o das mercadorias necessárias à sua reprodução. O uso dessa mercadoria, durante a jornada, cria valor maior. A diferença é mais-valia, apropriada pelo capitalista. Exploração, neste léxico, não exige chicote: é uma relação de troca “justa” no mercado que, no processo de produção, gera trabalho não pago. Críticos (Böhm-Bawerk, 1896) argumentam que a teoria do valor-trabalho não explica preços e que o juro remunera tempo e espera. O debate não está encerrado na teoria pura; empiricamente, a distribuição entre salários e lucros varia com instituições, tecnologia e poder de barganha."),
                    ("quote", "Entre a sociedade capitalista e a comunista situa-se o período de transformação revolucionária de uma na outra. A ele corresponde também um período político de transição, cujo Estado não pode ser senão a ditadura revolucionária do proletariado.", "Karl Marx, Crítica do programa de Gotha, 1875. Nível 1."),
                    ("p", "A frase é de Marx. O que ela não diz: partido único, polícia secreta, coletivização forçada, culto ao líder. “Ditadura” no século XIX alemão evoca a ditadura romana temporária e o conteúdo de classe (quem manda), não necessariamente o despotismo de um homem. A Comuna é o exemplo que Marx aponta em 1871. Lênin, em O Estado e a revolução (1917), radicaliza e operacionaliza o conceito para a tomada bolchevique. São camadas distintas."),
                ],
            },
            {
                "title": "Capital, crises, concentração",
                "blocks": [
                    ("p", "Capital, em Marx, não é “dinheiro” nem “máquinas”: é valor que se valoriza (D–M–D'). A acumulação implica reprodução ampliada. A concentração (crescimento da firma) e a centralização (fusões) são tendências, não leis sem exceção. Crises: desproporção entre departamentos, queda tendencial da taxa de lucro (livro III, incompleto e editado por Engels), superprodução relativa. Marx não deixou uma teoria única e fechada das crises; deixou cadernos e hipóteses."),
                    ("p", "Previsões: pauperização do proletariado, polarização em duas classes, crises cada vez mais gerais, revolução nos países mais avançados. O que a história posterior confirmou parcialmente: ciclos, concentração em setores, crises financeiras. O que enfraqueceu a previsão: expansão de classes médias assalariadas, sufrágio e welfare state, revoluções em países agrários (Rússia, China), não na Inglaterra industrial. Marx, nas cartas tardias sobre a comuna rural russa (obchtchina), admitiu caminhos não lineares."),
                ],
            },
            {
                "title": "Socialismo, comunismo e o Estado que desaparece",
                "blocks": [
                    ("p", "Na Crítica do programa de Gotha, Marx distingue uma fase inferior — “a cada um segundo o seu trabalho”, ainda com direito burguês — e uma fase superior: “de cada um segundo sua capacidade, a cada um segundo suas necessidades”, quando o trabalho deixar de ser apenas meio de vida. Engels, em Anti-Dühring e no folheto Do socialismo utópico ao socialismo científico, fala da extinção do Estado como Estado, restando a administração das coisas."),
                    ("p", "Marx não redigiu uma constituição do socialismo. Recusou receitas de cozinha para o futuro. Por isso é incorreto atribuir-lhe os planos quinquenais, o Gulag ou o Grande Salto. É correto dizer que ele defendeu a expropriação dos expropriadores, a centralização do crédito e dos transportes (Manifesto, medidas transitórias de 1848 — depois relativizadas) e um poder político de classe. A tensão entre emancipação e centralização está no próprio corpus."),
                    ("box", "Linha divisória obrigatória", [
                        "De Marx: crítica da economia política, mais-valia, fetichismo, ditadura do proletariado como transição, comunismo como fase sem Estado de classe.",
                        "De Engels: popularização, dialética da natureza, papel do Estado na origem da família.",
                        "De Lênin: partido de vanguarda, Estado dual, NEP como recuo tático, Cheka.",
                        "De Stálin / Mao: socialismo num só país operacionalizado, planos, culto, expurgos, comunas — não são páginas de O capital.",
                    ]),
                ],
            },
            {
                "title": "O que permanece controverso no próprio Marx",
                "blocks": [
                    ("p", "Há um Marx “humanista” dos Manuscritos e um Marx “científico” de O capital? A tese da ruptura (Althusser) é contestada por quem vê continuidade da alienação sob outra linguagem (Avineri, Mészáros). Há um Marx democrata radical (a Comuna, sufrágio) e um Marx jacobino-blanquista em textos de 1848–50. A evidência textual sustenta os dois polos; a escolha de um só é política."),
                    ("p", "A transformação dos valores em preços (o “problema da transformação”) nunca foi resolvida de modo consensual. Economistas sraffianos, analíticos e austromarxistas divergem. Isso não anula a pergunta sociológica sobre exploração e poder; anula a pretensão de que O capital seja um sistema fechado à prova de crítica interna."),
                    ("box", "Confiança", [
                        "Alta confiança: o texto de Gotha e o Manifesto dizem o que citamos; Stálin não é Marx.",
                        "Provável: Marx esperava revolução no Ocidente industrial e subestimou o campesinato e o nacionalismo.",
                        "Controverso: determinismo vs. abertura da história no próprio Marx.",
                        "Não sabemos: como Marx teria julgado 1917 — qualquer resposta é contrafactual.",
                    ]),
                ],
            },
        ],
    }


def vol04():
    return {
        "volume": 4,
        "slug": "investigacao-04-capitalismo-defesas-e-criticas",
        "title": "Capitalismo: estruturas, defesas e críticas",
        "subtitle": "Smith, Ricardo, Mill, Schumpeter, Hayek, Friedman — e o dossiê das falhas, crises e desigualdades, com contra-argumentos.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "Economia",
        "cover": f"{COVER}/inv-04-capitalismo.jpg",
        "cover_public": "covers/inv-04-capitalismo.jpg",
        "blurb": "Nem catecismo de mercado nem libelo. Cada crítica ao capitalismo recebe argumento original, evidência, contra-argumento e o estado do consenso. Cada defesa recebe a mesma disciplina.",
        "chapters": [
            {
                "title": "O que se chama capitalismo",
                "blocks": [
                    ("p", "Não há uma essência única. Uso operacional: economia em que a maior parte dos meios de produção é de propriedade privada (ou societária), a alocação ocorre principalmente por preços e mercados, o trabalho assalariado é a forma dominante e o lucro é o sinal de sucesso da firma. Há capitalismos de laissez-faire, sociais de mercado, desenvolvimentistas e de Estado. Confundi-los é erro de método."),
                    ("p", "Adam Smith, em A riqueza das nações (1776), defende a divisão do trabalho, o mercado e a “mão invisível” — e também desconfia de mercadores que se reúnem, apoia educação pública e condena o monopólio colonial. David Ricardo formaliza vantagem comparativa e a tensão salário-lucro-renda da terra. John Stuart Mill aceita o mercado na produção e abre espaço à reforma da distribuição e a cooperativas. Reduzir o liberalismo clássico a um slogan de desregulação é distorção."),
                ],
            },
            {
                "title": "Argumentos em defesa — e suas críticas",
                "blocks": [
                    ("h2", "Preços, incentivos e conhecimento"),
                    ("p", "Hayek, em The Use of Knowledge in Society (1945), argumenta que o sistema de preços agrega informação dispersa que nenhum planejador possui. Mises, em 1920, sustentou que sem propriedade privada dos meios de produção não há preços genuínos de fatores e, portanto, não há cálculo econômico racional. A evidência do século XX — escassez crônica, filas e desperdício em economias de comando — deu força empírica à tese, sem provar que todo planejamento setorial seja impossível."),
                    ("h2", "Inovação e destruição criativa"),
                    ("p", "Schumpeter descreve o capitalismo como processo evolutivo em que empresários destroem posições estabelecidas. A evidência de produtividade e de tecnologia desde 1800 é esmagadora em economias de mercado (e híbridas). A crítica: inovação também ocorre em laboratórios públicos (DARPA, NIH, universidades) e a destruição criativa gera desemprego e regiões abandonadas."),
                    ("h2", "Pobreza extrema no longo prazo"),
                    ("p", "Michail Moatsos e Our World in Data estimam que cerca de três quartos da humanidade viviam em pobreza extrema em 1820, contra menos de 10% no limiar internacional recente. O Banco Mundial documenta a queda acelerada após 1990, em grande parte na Ásia. Perspectiva A: vitória do crescimento capitalista. Perspectiva B (Ortiz-Ospina / OWID, 2017): o mesmo período viu expansão inédita de gasto público e transferências — não foi só “livre mercado”. Perspectiva C: a linha de 2–3 dólares/dia é estreita; em limiares de 10 ou 30 dólares a pobreza permanece majoritária."),
                    ("src", "Nível 2–3: Moatsos (2021) em How Was Life? (OCDE); Our World in Data — Poverty; Banco Mundial, Poverty and Inequality Platform; Esteban Ortiz-Ospina (2017)."),
                ],
            },
            {
                "title": "Críticas ao capitalismo — dossiê ponto a ponto",
                "blocks": [
                    ("h2", "Desigualdade e concentração"),
                    ("p", "Argumento original: Marx (concentração/centralização); no século XXI, Piketty e o World Inequality Lab — o 1% global capturou fatia desproporcional do crescimento desde 1980. Evidência: relatórios WID; nos EUA, aumento da fatia do topo (magnitude contestada por Auten e Splinter, que encontram alta bem menor). Contra-argumento: desigualdade de renda não é o mesmo que pobreza absoluta; mobilidade e bens públicos importam. Consenso: a desigualdade intra-país subiu em várias economias ricas após 1980; a desigualdade entre países caiu com o crescimento asiático. A magnitude exata no topo americano permanece controversa."),
                    ("h2", "Exploração e poder de barganha"),
                    ("p", "Além da mais-valia, a assimetria contratual (monopsonio no mercado de trabalho) é hoje objeto de economia empírica (Card, Manning). Sindicatos e salário mínimo alteram o split. A evidência não exige a teoria do valor-trabalho para reconhecer poder desigual."),
                    ("h2", "Crises e financeirização"),
                    ("p", "1825, 1873, 1929, 2008: ciclos e pânicos são recorrentes. Minsky descreve instabilidade endógena. Kindleberger documenta manias. Contra-argumento: bancos centrais, seguro de depósitos e regulação prudencial reduziram a frequência de colapsos bancários clássicos — sem eliminar o risco. 2008 confirmou a crítica da instabilidade; a ausência de uma nova Grande Depressão no Atlântico Norte confirmou, em parte, o papel dos estabilizadores."),
                    ("h2", "Monopólio, captura e política"),
                    ("p", "Smith já temia conspirações de ofício. Antitruste (Sherman Act, 1890; autoridades europeias) é correção interna. A captura regulatória (Stigler) e o financiamento de campanhas são evidências de que o capital converte dinheiro em regras. Contra-argumento: Estados socialistas também geraram nomenclaturas e privilégios sem mercado de capitais. O problema é concentração de poder, não só a forma jurídica da propriedade."),
                    ("h2", "Externalidades e ambiente"),
                    ("p", "Pigou formalizou a divergência entre custo privado e social. A mudança climática é a externalidade de maior escala. Mercados sem preço do carbono superproduzem emissões. Soluções internas: imposto pigouviano, cap-and-trade, regulação. A evidência de desacoplamento parcial emissões/PIB em alguns países ricos existe; o orçamento de carbono global continua incompatível com o status quo."),
                    ("h2", "Alienação e precarização"),
                    ("p", "A queixa de sentido e de controle sobre o trabalho atravessa Marx, a sociologia de Braverman e a literatura recente sobre “gig economy”. Contra-argumento: o trabalho pré-industrial também era exaustivo e hierárquico; pesquisas de satisfação variam por ocupação e país. Consenso frágil: a precarização cresceu em segmentos, não em todo o emprego formal das social-democracias."),
                    ("box", "Leitura cruzada", [
                        "Críticas com forte evidência: ciclos financeiros, externalidades ambientais, poder de mercado em setores, desigualdade crescente em vários países ricos.",
                        "Críticas parcialmente enfraquecidas: pauperização absoluta de longo prazo no Ocidente; impossibilidade de reforma interna (o welfare state aconteceu).",
                        "Defesas com forte evidência: crescimento da produtividade, queda da pobreza extrema global, inovação tecnológica.",
                        "Defesas enfraquecidas: autorregulação financeira; “o mercado sozinho” como história da queda da pobreza.",
                    ]),
                ],
            },
            {
                "title": "Respostas internas: regulação, welfare, antitruste",
                "blocks": [
                    ("p", "O capitalismo realmente existente no Atlântico Norte após 1945 não é o de Manchester em 1840. Imposto progressivo, seguro-desemprego, saúde pública ou regulada, educação de massa, bancos centrais e lei antitruste alteram o sistema por dentro. A social-democracia escandinava e a economia social de mercado alemã são variantes capitalistas com Estado pesado, não socialismos de propriedade coletiva dos meios de produção."),
                    ("p", "Keynes argumentou que o mercado não garante demanda efetiva. Friedman enfatizou regras monetárias e liberdade de escolher. Sowell insiste em trade-offs e no conhecimento local. As críticas a esses autores (poder de mercado ignorado, subestimação de externalidades, otimismo sobre informação do consumidor) são parte do dossiê, não um adendo ideológico."),
                    ("box", "Confiança", [
                        "Alta confiança: mercados de fatores com propriedade privada calculam melhor do que o planejamento central clássico; o capitalismo gera crises e desigualdades.",
                        "Provável: instituições (direito, Estado, sindicatos) explicam tanta variação quanto “o mercado” em si.",
                        "Controverso: se a desigualdade atual ameaça a democracia de modo causal e mensurável.",
                        "Não sabemos: a trajetória climática e distributiva do século XXI sob tecnologias ainda não difundidas.",
                    ]),
                ],
            },
        ],
    }
