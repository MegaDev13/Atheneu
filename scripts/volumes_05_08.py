# Conteúdo dos volumes 5–8 da Investigação Crítica.
from __future__ import annotations

COVER = "public/covers"


def vol05():
    return {
        "volume": 5,
        "slug": "investigacao-05-correntes-e-revolucao-russa",
        "title": "Correntes socialistas e a Revolução Russa",
        "subtitle": "Marx, Bakunin, Kropotkin, Bernstein, Lênin — e a Rússia de 1905 a 1924, sob narrativas rivais.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "História",
        "cover": f"{COVER}/inv-05-russia.jpg",
        "cover_public": "covers/inv-05-russia.jpg",
        "blurb": "O socialismo antes de 1917 não era um bloco. Este volume mapeia as divergências e reconstruí 1917–1924 com a narrativa bolchevique, as críticas menchevique, anarquista, liberal e a historiografia recente.",
        "chapters": [
            {
                "title": "Um mapa de correntes — não uma seita só",
                "blocks": [
                    ("p", "Antes de outubro de 1917 coexistiam, pelo menos: socialismo utópico residual; marxismo da Segunda Internacional; revisionismo (Bernstein); austromarxismo; social-democracia parlamentar; sindicalismo revolucionário; anarquismo coletivista (Bakunin); anarco-comunismo (Kropotkin); mutualismo proudhoniano; blanquismo; populismo russo (naródniki); menchevismo e bolchevismo como frações da social-democracia russa."),
                    ("h2", "Marx × Bakunin"),
                    ("p", "A cisão da Primeira Internacional (Haia, 1872) opôs a prioridade da conquista política do Estado (Marx) à destruição imediata do Estado e à federação de comunas e sindicatos (Bakunin). Bakunin previu que um Estado “operário” reproduziria uma nova classe de mandatários. Marx acusou o anarquismo de ignorar as condições econômicas e a necessidade de transição. A experiência do século XX deu munição a ambos: Estados socialistas geraram nomenclaturas; revoluções sem aparato sucumbiram à repressão ou à guerra."),
                    ("h2", "Kropotkin, Bernstein, Lênin"),
                    ("p", "Kropotkin (A conquista do pão; Ajuda mútua) desloca a ênfase da luta para a cooperação biológica e comunal, e rejeita tanto o Estado quanto o capitalismo. Bernstein (Os pressupostos do socialismo, 1899) argumenta que a polarização prevista por Marx não se confirma, que o sufrágio e as reformas são via possível, e que o movimento é tudo. Lênin (Que fazer?, 1902) responde ao “economicismo” com o partido de vanguarda profissional; em O imperialismo (1916) descreve o capital financeiro e a partilha do mundo; em O Estado e a revolução (1917) radicaliza a destruição da máquina estatal burguesa. São estratégias incompatíveis, não nuances."),
                    ("box", "Divergência nuclear", [
                        "Bernstein: democracia parlamentar + sindicatos + reformas graduais.",
                        "Lênin: ruptura revolucionária + partido centralizado + Estado de transição.",
                        "Bakunin/Kropotkin: recusa do Estado mesmo “operário”; federação desde baixo.",
                        "Marx histórico: mais próximo da conquista política de classe do que do anarquismo; menos institucionalizado do que a social-democracia posterior.",
                    ]),
                ],
            },
            {
                "title": "O Império Russo até 1914",
                "blocks": [
                    ("p", "A Rússia de 1861 aboliu a servidão com resgate e comuna camponesa (mir). Permaneceu um império agrário, com industrialização tardia e concentrada (São Petersburgo, Moscou, Donbass, Baku), financiada em parte por capital francês e belga. O atraso relativo perante a Alemanha e a Grã-Bretanha é consenso; o “atraso absoluto” é exagero: havia crescimento industrial rápido nas décadas de 1890 e 1900 (Witte)."),
                    ("p", "A Revolução de 1905 — domingo sangrento, sovietes, outubro, Manifesto do czar — criou a Duma e revelou a fragilidade do autocracia. A repressão Stolypin e a reforma agrária tentaram criar um campesinato proprietário. A Primeira Guerra Mundial desorganizou transportes, abastecimento e o exército. Sem a guerra, 1917 é contrafactual aberto; com a guerra, o colapso do czarismo torna-se altamente provável."),
                    ("src", "Nível 2: Orlando Figes, A People's Tragedy; Sheila Fitzpatrick, The Russian Revolution; Leopold Haimson sobre a instabilidade pré-1914."),
                ],
            },
            {
                "title": "Fevereiro, dualidade de poderes, Outubro",
                "blocks": [
                    ("p", "Fevereiro de 1917 (calendário juliano) derrubou Nicolau II por greves, motins de guarnição e defecção de elites. O Governo Provisório (liberais e socialistas moderados) conviveu com o Soviete de Petrogrado — dualidade de poderes. As Teses de Abril de Lênin recusam apoio ao Provisório e pedem “todo o poder aos sovietes”. A tentativa de golpe de Kornilov e o desgaste da guerra deslocaram os sovietes para a esquerda."),
                    ("p", "Outubro/novembro: o Comitê Militar Revolucionário, sob Trotsky na prática organizacional, tomou pontos-chave de Petrogrado com pouca resistência imediata. A narrativa bolchevique fala de insurreição popular. A narrativa liberal e menchevique fala de golpe de um partido minoritário. A historiografia contemporânea (Figes, Fitzpatrick, Smith, Rabinowitch) descreve um processo híbrido: apoio real em Petrogrado e nas guarnições, fraqueza do Provisório, e um partido que dissolveu em janeiro de 1918 a Assembleia Constituinte na qual não tinha maioria."),
                    ("h2", "Três (na verdade cinco) narrativas"),
                    ("p", "Bolchevique: o partido expressa a vontade operário-camponesa e interrompe a carnificina. Menchevique/social-democrata: a Rússia não estava madura; o atalho produz despotismo. Liberal/conservadora: golpe contra a democracia nascente. Anarquista (Makhno, Kronstadt em 1921): os bolcheviques traíram os sovietes e esmagaram a auto-organização. Revisionista recente: contingência da guerra civil, improvisação e radicalização recíproca — menos plano onisciente, mais luta pela sobrevivência do regime."),
                ],
            },
            {
                "title": "Guerra civil, comunismo de guerra, NEP",
                "blocks": [
                    ("p", "A guerra civil (1918–1921) opôs vermelhos, brancos, verdes, nacionalidades e intervenções estrangeiras limitadas. O Terror Vermelho e o Terror Branco mataram dezenas ou centenas de milhares (estimativas variam; não há censo confiável de execuções). O comunismo de guerra — requisição de grãos, nacionalizações, fim do comércio privado — foi apresentado como necessidade militar e, por alguns bolcheviques, como atalho ao comunismo. A fome de 1921–22 matou da ordem de 5 milhões (estimativa clássica; a margem de erro é ampla)."),
                    ("p", "Kronstadt (março de 1921): marinheiros que haviam sido base bolchevique exigiram sovietes livres de partido único. A repressão é fato. A NEP (1921) restaurou o comércio camponês e pequenas empresas, mantendo o “alto comando” estatal. Lênin chamou-a de recuo. Morreu em 1924. A URSS fora proclamada em 1922. Nada disso é ainda o stalinismo dos anos 1930, mas o monopólio político do partido já está consolidado."),
                    ("box", "Confiança", [
                        "Alta confiança: a Constituinte foi dissolvida; o partido único se impôs; a NEP recuou na economia e não na política.",
                        "Provável: sem a guerra mundial, o cenário de 1917 muda radicalmente.",
                        "Controverso: se Outubro foi sobretudo popular ou sobretudo golpe; o peso da intervenção estrangeira.",
                        "Não sabemos: o número preciso de mortos da guerra civil e do terror (intervalos largos).",
                    ]),
                ],
            },
        ],
    }


def vol06():
    return {
        "volume": 6,
        "slug": "investigacao-06-stalin-urss-e-o-bloco",
        "title": "Stálin, a URSS e o bloco europeu",
        "subtitle": "Coletivização, planos, fome, terror, guerra, crescimento e vida cotidiana — com intervalos de estimativa, não com um único número sagrado.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "História",
        "cover": f"{COVER}/inv-06-urss.jpg",
        "cover_public": "covers/inv-06-urss.jpg",
        "blurb": "Industrialização e fome, Gulag e alfabetização, vitória em 1945 e estagnação tardia. Cada cifra controversa vem com autor, método e disputa.",
        "chapters": [
            {
                "title": "Coletivização, fome e Holodomor",
                "blocks": [
                    ("p", "A coletivização forçada (1929–33) liquidou a camada rotulada de “kulaks”, concentrou a terra em kolkhozes e sovkhozes e acompanhou a extração de grãos para exportação e para as cidades industriais. Houve resistência, matança de gado pelos camponeses e colapso da produtividade pecuária. Isso é consenso documental após a abertura parcial dos arquivos."),
                    ("h2", "Mortos da fome de 1931–33"),
                    ("p", "Conquest (1986) popularizou cerca de 7 milhões no conjunto da URSS. Davies e Wheatcroft, com arquivos, estimam 5,5 a 6,5 milhões. Ellman cita ordens de grandeza de cerca de 8,5 milhões incluindo repressão de 1930–33. A Duma russa, em 2008, falou em 7 milhões. Para a Ucrânia, Meslé et al. estimam cerca de 2,6 milhões; Rudnytskyi et al., até 3,9 milhões; Snyder trabalha com ordem de 3,3 milhões de mortes por fome e doença na Ucrânia. Intervalo responsável para a Ucrânia: cerca de 2,5 a 4 milhões. Intervalo responsável para a URSS: cerca de 5 a 8 milhões. Números de 10–20 milhões para a Ucrânia isolada não têm base demográfica séria (crítica de Snyder e Wheatcroft)."),
                    ("h2", "Genocídio? Três posições"),
                    ("p", "Perspectiva A (Conquest, parte da historiografia ucraniana, Graziosi em versões fortes): a fome foi usada ou dirigida contra a nação ucraniana — Holodomor como genocídio. Perspectiva B (Davies e Wheatcroft): política brutal, erros, ideologia anti-camponesa e extração, sem prova de um decreto de extermínio étnico; o Cazaquistão também foi devastado. Perspectiva C (Naumenko e trabalhos recentes de economia histórica): a URSS produziu comida suficiente em 1932 para evitar a fome; a mortalidade correlaciona com a participação étnica ucraniana para além da produtividade — o que fortalece a tese de viés político, sem encerrar a qualificação jurídica de genocídio. Não há documento do tipo “Stálin ordena matar os ucranianos”; há um padrão de requisição, bloqueio de movimento e punição que tornou a fome letal e desigualmente distribuída."),
                    ("src", "Nível 2: Conquest, The Harvest of Sorrow; Davies & Wheatcroft, The Years of Hunger; Snyder, Bloodlands; Naumenko, NBER w29089. Nível 3: Instituto de Demografia da Ucrânia (Libanova e equipe)."),
                ],
            },
            {
                "title": "Planos, industrialização, Gulag, Grande Terror",
                "blocks": [
                    ("p", "Os planos quinquenais (a partir de 1928) priorizaram indústria pesada, aço, carvão, máquinas e depois armamentos. O crescimento da produção física de aço e eletricidade é inegável. A qualidade, o desperdício e o custo humano são o outro lado da mesma série estatística. Estimativas ocidentais clássicas (Bergson, Maddison) revisam para baixo as taxas oficiais soviéticas, mas mantêm um crescimento rápido até os anos 1960–70 e desaceleração posterior."),
                    ("p", "O Gulag: sistema de campos documentado por arquivos (Applebaum; Khlevniuk). A população nos campos oscilou; mortes por fome, frio e trabalho foram massivas sobretudo em 1932–33 e 1941–43. O Grande Terror de 1937–38 (ordens do NKVD, quotas de fuzilamento) matou da ordem de 700 mil pessoas executadas — cifra de arquivos hoje relativamente estável, distinta das mortes por fome da década. O culto à personalidade, os processos de Moscou e a destruição da velha guarda bolchevique são fatos."),
                    ("p", "Educação e mobilidade: alfabetização cresceu de forma acentuada em relação ao Império. Mulheres entraram em massa no ensino e na indústria. Ciência teve picos (física, matemática) e desastres ideológicos (lysenkismo). A vida cotidiana das cidades industriais melhorou em consumo básico após a morte de Stálin, a partir do Degelo, sem convergir com o Ocidente em variedade e qualidade."),
                ],
            },
            {
                "title": "Guerra, pós-guerra e o custo do sistema",
                "blocks": [
                    ("p", "A URSS suportou o grosso terrestre da guerra contra a Alemanha nazista e sofreu cerca de 24–27 milhões de mortes (intervalo usual; inclui civis). A vitória consolidou o regime e o império exterior na Europa oriental. O prestígio de 1945 não apaga 1933 nem 1937; também não é propaganda o fato de que o Exército Vermelho destruiu a Wehrmacht no Leste."),
                    ("p", "Após 1953: XX Congresso, Relatório Secreto de Kruschev, repressão menor em escala, mas Hungria 1956 e Tchecoslováquia 1968 mostram os limites da soberania no bloco. A estagnação brejnevista, o atraso tecnológico civil e a queda da expectativa de vida masculina nos anos 1970–80 (álcool, sistema de saúde saturado) antecedem 1991. A dissolução da URSS teve causas econômicas, nacionais e políticas entrelaçadas — não um único “fracasso da ideia” nem um único “complô externo”."),
                    ("box", "Confiança", [
                        "Alta confiança: coletivização forçada, fome de milhões, Terror de 1937–38, Gulag, industrialização acelerada, alfabetização em massa.",
                        "Provável: o crescimento per capita soviético superou o czarista e, em alguns recortes, o de vários países pobres; não alcançou o nível de vida norte-americano.",
                        "Controverso: Holodomor como genocídio no sentido da Convenção de 1948; o PIB soviético comparado (PPP vs. taxas oficiais).",
                        "Não sabemos: o bem-estar subjetivo da maioria silenciosa em 1960–80 com a precisão de surveys modernos.",
                    ]),
                ],
            },
            {
                "title": "O bloco: RDA, Polônia, Tchecoslováquia, Hungria, Romênia, Iugoslávia, Albânia",
                "blocks": [
                    ("p", "Não foram sistemas idênticos. A RDA foi a economia de planejamento mais industrializada do bloco, com Stasi onipresente e nível de consumo inferior à RFA — o muro (1961) é evidência de preferência revelada: saía quem podia. A Polônia manteve agricultura privada significativa e uma Igreja forte; Solidariedade (1980) foi sindicato contra o “Estado operário”. A Tchecoslováquia combinou indústria avançada e Primavera de Praga. A Hungria, após 1956, evoluiu para um “comunismo de gulache” mais tolerante no consumo. A Romênia de Ceaușescu uniu culto dinástico e austeridade dos anos 1980. A Iugoslávia de Tito: autogestão, não-alinhamento, mercado parcial, dívida externa e, depois, fragmentação nacional. A Albânia de Hoxha: isolamento extremo."),
                    ("p", "Em todos: partido hegemônico, polícia política, censura, educação e saúde universais de qualidade variável, industrialização, igualdade formal de gênero maior que em vários vizinhos capitalistas da mesma renda, e crise de legitimidade nos anos 1980. 1989 não se explica só por rádio Ocidental: filas, dívida, nacionalismo e a recusa de Gorbachev de mandar tanques importam em conjunto."),
                ],
            },
        ],
    }


def vol07():
    return {
        "volume": 7,
        "slug": "investigacao-07-china-cuba-e-outras-experiencias",
        "title": "China, Cuba e as outras experiências",
        "subtitle": "Mao, o Grande Salto, Deng, o híbrido contemporâneo — e os casos de Cuba, Vietnã, Coreia do Norte e mais, sem fundi-los num só regime.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "História",
        "cover": f"{COVER}/inv-07-china.jpg",
        "cover_public": "covers/inv-07-china.jpg",
        "blurb": "A pergunta central sobre a China de hoje — comunista, socialista, capitalista de Estado ou híbrido — recebe várias respostas acadêmicas. Cuba, Vietnã e a Coreia do Norte são tratados à parte.",
        "chapters": [
            {
                "title": "Maoísmo, Grande Salto e Revolução Cultural",
                "blocks": [
                    ("p", "A Revolução Chinesa (1949) foi sobretudo camponesa e militar, não uma insurreição operária de tipo 1917. A reforma agrária e a guerra da Coreia consolidaram o PCC. As comunas populares e o Grande Salto Adiante (1958–1962) tentaram industrializar por mobilização (fornos caseiros, metas irreais, retirada de mão de obra do campo)."),
                    ("h2", "A fome de 1959–1961 — intervalos, não um totem"),
                    ("p", "Estimativas de mortes excedentes: Peng ~23 milhões; Coale ~27; Ashton et al. e Banister ~30; Cao Shuji ~32,5; Yang Jisheng ~36; Dikötter ~45 (mínimo, com crítica metodológica de Ó Gráda, Wemheuer e Walder); Yu Xiguang chega a 55. O intervalo que a demografia especializada mais sustenta está grosso modo entre 18 e 40 milhões, com 30 milhões como ordem de grandeza frequentemente citada. Dikötter soma uma majoração sobre Cao e enfatiza violência direta (espancamentos, execuções). Yang Jisheng, jornalista do PCC com arquivos internos, trabalha com ~36 milhões. Há consenso de que foram dezenas de milhões e de que a política estatal foi causa central; não há consenso no decimal."),
                    ("p", "A Revolução Cultural (1966–76) não foi principalmente uma fome: foi expurgo, guerra de facções, destruição cultural, envio de jovens ao campo e paralisia institucional. Mortes na casa das centenas de milhares a alguns milhões, conforme a definição (violência direta vs. excesso de mortalidade). Mao permaneceu o eixo simbólico; o Partido sobreviveu a Mao."),
                    ("src", "Nível 2: Yang Jisheng, Tombstone; Frank Dikötter, Mao's Great Famine (e críticas de Ó Gráda e Wemheuer); Banister (1987); Cao Shuji (2005)."),
                ],
            },
            {
                "title": "Deng e a pergunta: o que é a China agora?",
                "blocks": [
                    ("p", "A partir de 1978: descoletivização agrícola (sistema de responsabilidade familiar), zonas econômicas especiais, investimento estrangeiro, depois corporatização e um setor privado amplo, com “alturas dominantes” estatais (energia, banca, telecom, defesa). O Banco Mundial: crescimento médio acima de 9% ao ano por décadas e cerca de 800 milhões de pessoas saídas da pobreza extrema segundo a linha internacional. A China declara ter eliminado a pobreza extrema rural em 2020. Críticos (Ravallion e outros) lembram que linhas oficiais mudaram e que linhas relativas contam outra história; a direção da queda absoluta é, contudo, robusta."),
                    ("p", "O Gini chinês subiu para patamares comparáveis aos de alguns países latino-americanos e aos EUA (ordem de 0,45 ou mais, conforme a série). Autoritarismo político: monopólio do PCC, censura, Xinjiang, Hong Kong, vigilância digital. Isso não é a China de 1960 nem os EUA de 1990."),
                    ("h2", "Quatro classificações acadêmicas"),
                    ("p", "A — socialista de mercado / socialismo com características chinesas (discurso oficial e parte da esquerda desenvolvimentista): o Partido comanda, a propriedade pública estratégica permanece, o mercado é instrumento. B — capitalismo de Estado (Bremmer e vários economistas políticos): o Estado é o acionista-empresário dominante num ambiente de lucro e integração global. C — capitalismo simplesmente, com Partido-Leviatã (parte da literatura liberal): propriedade privada efetiva, trabalho assalariado, integração às cadeias globais — o adjetivo “socialista” é legitimação. D — híbrido sui generis (muitos sinólogos): categorias oitocentistas não cabem; há mercado, planejamento seletivo, nacionalismo e leninismo organizacional. A evidência empírica (preços, lucro, IDE, mercado de trabalho) afasta a China atual do comunismo de comando maoísta. Se “socialismo” exige propriedade social efetiva e poder popular, a classificação oficial é fraca. Se “capitalismo” exige primazia jurídica da propriedade privada e Estado liberal, também é incompleta. O termo mais honesto, no estado atual do debate, é híbrido autoritário com mercado e setor estatal estratégico."),
                ],
            },
            {
                "title": "Cuba, Vietnã, Coreia do Norte, Laos",
                "blocks": [
                    ("p", "Cuba (1959): revolução nacionalista e anti-Batista que se declarou socialista em 1961. Saúde e educação: indicadores de mortalidade infantil e alfabetização comparáveis aos de países bem mais ricos da América Latina — consenso relativo, com ressalvas sobre dados oficiais e sobre o peso do embargo e do subsidio soviético até 1991. Crescimento e consumo: fracos; êxodo persistente; sistema unipartidário; períodos de escassez (Período Especial). Não é a URSS, não é a Suécia, não é Haiti."),
                    ("p", "Vietnã: guerra de independência e unificação, depois Đổi Mới (1986) — reforma de mercado sob Partido Comunista, analogia parcial com Deng. Crescimento e queda de pobreza significativos; autoritarismo persistente. Laos: reforma gradual, baixo desenvolvimento, partido único. Coreia do Norte: economia de comando militarizada, culto dinástico, fome dos anos 1990 (estimativas de 600 mil a 1 milhão de mortos), isolamento. A comparação com a Coreia do Sul — mesma península, mesma língua, partição em 1945 — é uma das mais próximas que a história oferece de um “experimento natural”. O PIB per capita, a altura média, a luz noturna de satélite e a preferência revelada de desertores apontam uma divergência extrema a favor do Sul. Isso não prova que “todo capitalismo vence todo socialismo”: o Sul teve aliança americana, reforma agrária, Estado desenvolvimentista e, só depois, democracia. Prová, sim, que aquele socialismo dinástico falhou catastroficamente em desenvolvimento."),
                    ("box", "Não fundir os casos", [
                        "Mao 1958 ≠ Deng 1992 ≠ Xi 2020.",
                        "Cuba ≠ Coreia do Norte ≠ Vietnã.",
                        "Iugoslávia de Tito ≠ Albânia de Hoxha.",
                        "Cada um exige modelo político, propriedade, mercado e repressão descritos à parte.",
                    ]),
                ],
            },
        ],
    }


def vol08():
    return {
        "volume": 8,
        "slug": "investigacao-08-comparacoes-contradicões-e-sintese",
        "title": "Comparações, contradições e o que a evidência sustenta",
        "subtitle": "Cálculo econômico, propaganda, números lado a lado, revoltas de 1789 a 1991 e uma síntese sem veredito pré-escrito.",
        "author": "Investigação Crítica — Atheneu",
        "genre": "Economia",
        "cover": f"{COVER}/inv-08-sintese.jpg",
        "cover_public": "covers/inv-08-sintese.jpg",
        "blurb": "O volume final confronta Mises e Lange, propaganda dos dois lados, tabelas de PIB, vida e alfabetização, e responde à pergunta da série: o que sabemos, o que é provável, o que é controverso e o que não sabemos.",
        "chapters": [
            {
                "title": "Falhas do socialismo de Estado — o dossiê",
                "blocks": [
                    ("h2", "Cálculo e conhecimento"),
                    ("p", "Mises (1920): sem preços de mercado dos fatores, o planejador não compara usos alternativos do aço, do cimento ou do tempo de engenheiro. Hayek (1945): o conhecimento é tácito, local e mutável; o preço é um sinal, não uma estatística. Lange-Lerner: o escritório central pode ajustar preços por tentativa e erro, imitando o mercado. A história do planejamento clássico — filas, estoques podres, “torres” de aço e falta de sabão — deu razão prática a Mises/Hayek. Computadores não resolveram o problema da revelação de preferências nem o do incentivo a mentir para cima na cadeia de metas. Isso não implica que todo serviço público (vacina, farol, defesa) seja inviável: bens públicos e externalidades são exatamente onde o mercado falha."),
                    ("h2", "Incentivos, burocracia, poder"),
                    ("p", "Sem rivalidade e sem falência, a firma estatal enfrenta o problema do “orçamento mole” (Kornai). A informação sobe deformada. A centralização política que o planejamento pede concentra poder; a concentração de poder favorece autoritarismo, mesmo quando o projeto inicial era emancipatório — aqui a previsão de Bakunin e a sociologia de Michels (lei de ferro da oligarquia) encontram a evidência do século XX. Anarquistas, social-democratas e marxistas heterodoxos (Kautsky tardio, Luxemburgo contra a burocracia, a Nova Esquerda) formularam essa crítica por dentro da família socialista."),
                    ("p", "Inovação: a URSS foi capaz de priorizar o nuclear e o espacial; falhou em consumir variedade e em microeletrônica civil. Sem concorrência e sem direito de apropriação do lucro residual, o incentivo a inovar no cotidiano é fraco. Corrupção e captura do Estado existiram nos dois sistemas; no socialismo de partido único faltou imprensa livre e oposição legal para denunciá-las."),
                ],
            },
            {
                "title": "Falhas do capitalismo — e o que o próprio sistema tentou",
                "blocks": [
                    ("p", "Já mapeadas no volume 4: crises, desigualdade, monopólio, externalidades, assimetria de informação, bens públicos, captura. As respostas internas — banco central, antitruste, imposto progressivo, welfare, sindicatos, regulação ambiental — alteram resultados sem abolir a propriedade privada dos meios de produção. Países com essas instituições (Europa do Norte, por exemplo) exibem, em média, alta renda, alta expectativa de vida e Gini menor que o dos EUA. Isso é evidência a favor de um capitalismo institucionalizado, não a favor de um mercado sem regras nem a favor do socialismo de comando."),
                    ("p", "A crítica marxista da exploração permanece filosoficamente viva e empiricamente traduzível em poder de barganha. A crítica ecológica é a mais fortalecida desde 1980. A crítica da alienação é a mais difícil de mensurar. Nenhuma delas, isolada, dita o regime de propriedade ótimo."),
                ],
            },
            {
                "title": "Comparações quantitativas — com ressalvas",
                "blocks": [
                    ("p", "Regra: não comparar a URSS de 1930 com os EUA de 2010, nem Cuba com a Noruega, sem dizer o ponto de partida, a guerra, o embargo e a demografia. Comparações menos ruins: as duas Alemanhas; as duas Coreias; Áustria e Tchecoslováquia no entreguerras vs. pós-1948; China pré e pós-1978; Rússia 1913 vs. 1940 vs. 1989 vs. 2000."),
                    ("h2", "Ordens de grandeza (fontes e limites)"),
                    ("p", "Pobreza extrema mundial: ~75% em 1820 (Moatsos / OWID) → <10% no limiar recente do Banco Mundial. Método: linhas absolutas em PPP; limitações: subestima pobreza relativa e serviços. China 1978–2020: ~800 milhões fora da pobreza extrema (Banco Mundial); limitações: linha baixa, mudança institucional simultânea (mercado + Estado + comércio mundial)."),
                    ("p", "PIB per capita URSS/EUA: Maddison e revisões posteriores situam a URSS, no fim dos anos 1980, grosso modo entre um terço e a metade do nível americano, conforme a métrica — bem acima do Império em termos industriais, bem abaixo em consumo. Expectativa de vida: ganhos rápidos na URSS até os anos 1960, estagnação masculina depois; ganhos contínuos no Ocidente. Alfabetização: convergência forte do bloco socialista, a partir de bases baixas. Mortalidade infantil em Cuba: entre as menores da América Latina nas últimas décadas do século XX (dado oficial + avaliações internacionais, com debate sobre registro). Coreia do Norte vs. Sul: divergência extrema de renda e de luz noturna; mortalidade infantil nortista várias vezes a do Sul."),
                    ("p", "Desigualdade: socialismos de Estado comprimiriam a distribuição oficial de salários (Gini baixo), com privilégios não monetários da nomenclatura (dachas, lojas especiais) mal captados pelo Gini. Capitalismos ricos variam: EUA mais desiguais que Dinamarca. Fonte: WID, OCDE, séries nacionais. Limitação: renda vs. riqueza vs. consumo vs. acesso a bens de partido."),
                    ("src", "Nível 2–3: Maddison Project (Groningen); Banco Mundial; Our World in Data; World Inequality Database (Chancel & Piketty, 2021); UN DESA (mortalidade). Sempre: período + país + método + limite."),
                ],
            },
            {
                "title": "Revoltas: causas misturadas, não um espírito do mundo",
                "blocks": [
                    ("p", "1789: fiscalidade, crise de subsistência, crise de legitimidade do Antigo Regime, ideias ilustradas. Babeuf: igualdade substantiva na ressaca da Revolução. 1848: liberalismo, nação, oficina e campo. Comuna: derrota militar e questão social parisiense. 1917: guerra, terra, pão, dualidade de poderes. 1918 alemã: derrota e conselhos. 1949 chinesa: invasão japonesa, guerra civil, campesinato. 1959 cubana: ditadura, açúcar, nacionalismo. Maio de 1968: prosperidade, universidade, crítica cultural — não fome. Primavera de Praga e Solidariedade: autoritarismo do “socialismo real” + reivindicação nacional e sindical. 1989: economia, nacionalismo, efeito-demonstração, recuo soviético. Nenhuma dessas revoltas tem uma única causa. Ideologia organiza; fome, guerra e humilhação inflamam."),
                    ("h2", "Propaganda — dos dois lados"),
                    ("p", "Estados comunistas usaram cartaz, cinema, escola, culto, inimigo interno e reescrita de manuais. Estados capitalistas e ditaduras anticomunistas usaram o mesmo arsenal com outro sinal (macarthismo, ditaduras latino-americanas, cinema de guerra fria). A existência de propaganda não prova que o conteúdo denunciado seja falso: o Gulag existiu; o Holodomor existiu; o trabalho infantil de Manchester existiu; o consumo de massa do pós-guerra existiu. A regra é a mesma: confrontar o cartaz com o arquivo e o censo."),
                ],
            },
            {
                "title": "Síntese comparativa — sem veredito teológico",
                "blocks": [
                    ("p", "As ideias socialistas e comunistas nasceram de problemas reais: jornada, insegurança, hierarquia da fábrica, crises, colonialismo. Marx ofereceu o mapa mais influente desses problemas e previu, em parte, concentração e crises; errou o lugar da revolução e a pauperização absoluta no núcleo industrial. O socialismo de Estado do século XX industrializou à força, comprimiu certas desigualdades, universalizou escola e, em vários casos, saúde básica — e produziu fomes políticas, polícia secreta, partido único e, no cálculo cotidiano, escassez. O capitalismo de mercado, especialmente quando regulado, gerou a maior alta conhecida de produtividade e a queda da pobreza extrema, e reproduziu crises, concentração de riqueza e danos ambientais."),
                    ("p", "A social-democracia e o Estado de bem-estar não “refutam” Marx por inteiro (ele descreveu tendências, não um destino de um só país), mas enfraquecem a tese de que só a ruptura resolve miséria absoluta no centro. O colapso de 1989–91 não “refuta” toda crítica ao capital; refuta a pretensão de que o modelo soviético era o futuro universal. A China pós-1978 enfraquece tanto o maoísmo econômico quanto a tese de que só democracias liberais crescem."),
                    ("box", "O que a evidência permite dizer", [
                        "Alta confiança: planejamento central clássico falha no cálculo cotidiano; mercados geram crescimento e crises; fomes de 1931–33 e 1959–61 tiveram causa política central; pobreza extrema global caiu de forma inédita desde o século XIX, acelerando após 1980 na Ásia.",
                        "Provável: instituições (direito, democracia, Estado social, abertura comercial) explicam mais do que o rótulo “capitalismo vs. socialismo”; partidos únicos tendem a persistir mesmo quando a economia se liberaliza.",
                        "Controverso: Holodomor como genocídio; magnitude exata das fomes; se a China é capitalista de Estado ou socialista de mercado; magnitude da alta do 1% nos EUA (Piketty vs. Auten-Splinter).",
                        "Não sabemos: se um socialismo democrático de mercado (cooperativas + preços + pluralismo) é estável em escala nacional; como descarbonizar sem aprofundar desigualdade; o juízo contrafactual de um Marx vivo em 1933 ou 1978.",
                    ]),
                    ("p", "A pergunta útil daqui em diante não é “qual bandeira é pura”. É: quais mecanismos — preços, propriedade, sufrágio, sindicatos, ciência, limite ao poder — resolvem quais problemas, a que custo, e com que risco de captura. Essa é uma pergunta de evidência, não de fé."),
                ],
            },
            {
                "title": "Bibliografia seletiva e banco de fontes primárias",
                "blocks": [
                    ("h2", "Fontes primárias (nível 1)"),
                    ("p", "Marx e Engels: Manifesto (1848); A ideologia alemã; Manuscritos de 1844; Contribuição à crítica da economia política (prefácio de 1859); O capital I (1867); Crítica do programa de Gotha (1875); A guerra civil na França (1871). Engels: Anti-Dühring; Do socialismo utópico ao socialismo científico; A origem da família…. Lênin: Que fazer?; O imperialismo; O Estado e a revolução; textos sobre a NEP. Bakunin: Estatismo e anarquia. Kropotkin: A conquista do pão; Ajuda mútua. Bernstein: Os pressupostos do socialismo. Smith: A riqueza das nações. Ricardo: Princípios. Mill: Sobre a liberdade; Princípios de economia política. Mises: Economic Calculation in the Socialist Commonwealth (1920). Hayek: The Use of Knowledge in Society (1945); O caminho da servidão. Keynes: Teoria geral. Schumpeter: Capitalismo, socialismo e democracia. Constituições soviéticas (1918, 1936, 1977); planos quinquenais; relatórios das Factory Commissions britânicas; Atos dos Apóstolos 2; More, Utopia; Winstanley, 1649."),
                    ("h2", "Historiografia e economia (nível 2–3)"),
                    ("p", "E. P. Thompson; Eric Hobsbawm; Sheila Fitzpatrick; Orlando Figes; R. W. Davies e Stephen Wheatcroft; Robert Conquest; Timothy Snyder; Anne Applebaum; Oleg Khlevniuk; Frank Dikötter; Yang Jisheng; Cormac Ó Gráda; Felix Wemheuer; Angus Maddison / Maddison Project; Abram Bergson; János Kornai; Thomas Piketty e Lucas Chancel (WID); Banco Mundial; Our World in Data; OCDE, How Was Life?; Michail Moatsos (2021); Naumenko (NBER)."),
                    ("h2", "Como continuar"),
                    ("p", "Leia o Manifesto e a Crítica de Gotha no original (há traduções confiáveis). Depois leia um crítico austro (Mises/Hayek) e um historiador de arquivo (Fitzpatrick ou Davies/Wheatcroft), não um compilado de redes sociais. A biblioteca desta série existe para tornar esse percurso possível, não para substituí-lo."),
                    ("box", "Nota editorial", [
                        "Textos de autores estrangeiros foram lidos e reescritos em português brasileiro nesta investigação; citações curtas foram traduzidas a partir das edições de referência.",
                        "Nada neste volume autoriza violência política nem a negação de crimes documentados.",
                        "Onde a evidência é fraca, está escrito que é fraca.",
                    ]),
                ],
            },
        ],
    }
