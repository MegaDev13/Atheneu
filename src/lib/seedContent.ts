// Conteúdo de demonstração: livros curtos (texto original) para que o leitor,
// as anotações, os destaques e as estatísticas tenham vida no modo demo.

export const SEED_TEXTS: Record<string, { title: string; chapters: { title: string; text: string }[] }> = {
  casmurro: {
    title: 'Dom Casmurro',
    chapters: [
      {
        title: 'I · Do título',
        text: 'Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da Lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos pode ser que não fossem inteiramente maus. Sucedeu, porém, que, como eu estava cansado, fechei os olhos três ou quatro vezes; tanto bastou para que ele interrompesse a leitura e metesse os versos no bolso.\n\n— Continue, disse eu acordando.\n\n— Já acabei, murmurou ele.\n\n— São muito bonitos.\n\nVi-lhe fazer um gesto para tirá-los outra vez do bolso, mas não passou do gesto; estava amuado. No dia seguinte entrou a dizer de mim nomes feios, e acabou alcunhando-me Dom Casmurro. Os vizinhos, que não gostam dos meus hábitos reclusos e calados, deram curso à alcunha, que afinal pegou.\n\nNão consultes dicionários. Casmurro não está aqui no sentido que eles lhe dão, mas no que lhe pôs o vulgo de homem calado e metido consigo. Dom veio por ironia, para atribuir-me fumos de fidalgo. Tudo por estar cochilando! Também não achei melhor título para a minha narração; se não tiver outro daqui até ao fim do livro, vai este mesmo.',
      },
      {
        title: 'II · Do livro',
        text: 'Agora que expliquei o título, passo a escrever o livro. Antes disso, porém, digamos os motivos que me põem a pena na mão. Vivo só, com um criado. A casa em que estou não é propriamente minha; fiz uma singeleza particular, um ar de casa velha, cópia da antiga casa de Matacavalos. Os meus olhos, posto cansados, ainda assim distinguem bem os retratos da parede: os velhos, os meus antepassados, e também os dois retratos de minha mãe e do meu pai.\n\nTudo isto me lembra a minha vida, que foi das mais singulares deste mundo. E porque a memória é fraca, e os sucessos muitos, resolvi escrever as minhas memórias, ou, para usar de termo mais humilde, esta narração, em que contarei as coisas da minha mocidade, e principalmente uma criatura que amei acima de todas, e que me deu o ciúme mais amargo da minha vida.\n\nHá de ver o leitor que não escrevo para divertir, mas para me defender. Se a narração me sair viva, talvez alguém me entenda; e entender é, às vezes, absolver.',
      },
      {
        title: 'III · O muro e os olhos de ressaca',
        text: 'Ao canto do quintal havia um muro, e junto ao muro uma velha árvore. Foi ali que Capitu, ainda menina, me disse as primeiras palavras que me ficaram para sempre gravadas. Falávamos do seminário, da minha mãe, do futuro, e ela, com aqueles olhos que eu definiria de ressaca — olhos de onda que se retém e puxa, olhos de maré cheia — me perguntou se eu teria ânimo de ser padre.\n\nRespondi que não, que me faltava vocação. Ela sorriu de um modo que não sei descrever, meio riso, meio segredo, e disse que também não me queria padre. Havia entre nós um jurimento de criança e uma promessa de gente grande, e o muro, que nos separava do mundo, parecia naquela hora o limite do universo.\n\nDesde esse dia aprendi que a memória dos lugares guarda o que as palavras perdem. Voltei àquele muro muitas vezes na imaginação, e em todas elas os olhos de Capitu vinham comigo, como uma onda que não acaba.',
      },
    ],
  },
  meditacoes: {
    title: 'Meditações',
    chapters: [
      {
        title: 'Livro II',
        text: 'Ao despertar, dize a ti mesmo: encontrarei hoje um indiscreto, um ingrato, um insolente, um astuto, um invejoso, um egoísta. Tudo isso lhes advém por ignorância do bem e do mal. Eu, porém, que contemplei a natureza do bem e vi que é bela, e a do mal, que é feia, e a natureza do próprio pecador, que é minha parente — não por sangue, mas pela participação na inteligência e numa parcela da divindade —, nenhum deles pode me causar dano.\n\nNenhum deles pode me envolver em torpeza, e não posso irar-me com um parente nem odiá-lo, pois nascemos para cooperar, como os pés, as mãos, as pálpebras, as fileiras de dentes superiores e inferiores. Agir em oposição uns aos outros é contrário à natureza.\n\nRealiza cada ação da vida como se fosse a última. A morte não é um mistério: a natureza não tem nada que ela não produza ou que ela não dissolva. Concentra-te, portanto, no presente; cada momento é suficiente para quem age segundo a razão.',
      },
      {
        title: 'Livro IV',
        text: 'As pessoas buscam retiros no campo, à beira-mar, nas montanhas; e também tu costumas desejar isso. Mas isso é prova de pouca filosofia, pois te é dado, a qualquer hora, retirar-te para dentro de ti mesmo. Em parte alguma encontra o homem retiro mais tranquilo e mais sereno do que em sua própria alma.\n\nSobretudo aquele que traz dentro de si princípios tais que, ao se recolher um instante, se encontra em plena serenidade. Nada é mais meu do que a minha faculdade de julgar. Retira-te, pois, continuamente, para esse pequeno campo, e renova-te.\n\nSe te afliges por algo exterior, não é a coisa em si que te perturba, mas o juízo que fazes dela; e esse juízo está em teu poder apagar. Se te aflige a tua própria disposição, quem te impede de corrigir o princípio? Sê semelhante ao rochedo contra o qual as ondas se quebram sem cessar: ele permanece firme, e as águas adormecem ao seu redor.',
      },
      {
        title: 'Livro VII',
        text: 'Elimina a imaginação, e dirás: tu não és mais que um juízo, e está em teu poder não julgar. A vida é curta; o único fruto dela é a disposição piedosa e as ações em prol do bem comum. Tudo que é belo é belo por si mesmo e termina em si, sem que o louvor tenha parte nele.\n\nObserva como os médicos, depois de terem tomado o pulso, dizem com rosto grave: lembramo-nos dele. E os astrólogos, depois de anunciarem a morte: os astros assim o pediam. Lembra-te sempre de quantos Hipócrates morreram depois de haverem curado tantos, e quantos astrólogos depois de anunciarem tantas mortes.\n\nEm tudo isso, mantém a serenidade: espera a morte com o rosto alegre, como aquele que se retira quando o espetáculo termina. E lembra-te: nada é mais precioso do que uma alma que se contenta com pouco e serve ao todo.',
      },
    ],
  },
  crime: {
    title: 'Crime e Castigo',
    chapters: [
      {
        title: 'Primeira parte · I',
        text: 'No começo de julho, num calor extremo, ao entardecer, um jovem saiu do cubículo que alugava e caminhou devagar, como que hesitante, em direção à ponte. Evitou felizmente encontrar-se com a patroa na escada. Seu cubículo ficava sob o teto de um grande edifício de cinco andares e parecia mais um armário do que um quarto.\n\nEstava esmagado pela pobreza, mas ultimamente até se envergonhava daquela irritação constante. Absorto em si mesmo, isolado de todos, temia qualquer encontro. Tinha chegado a tal ponto de miséria que, embora a patroa tivesse deixado de servir-lhe refeições, nem sequer pensava em reclamar.\n\nMas o que o atormentava não era a miséria: era uma ideia que há meses lhe fermentava na cabeça, como num ovo, e que agora exigia realização. A cada passo sentia mais forte o peso dessa ideia, e no entanto caminhava, porque precisava pôr à prova, pela última vez, aquilo que há muito concebera. Não era um simples ensaio: era o primeiro passo.',
      },
      {
        title: 'Primeira parte · II',
        text: 'O calor sufocante da cidade, a poeira, os andaimes, os tijolos, o cheiro de cal e de tinta, e todo aquele ambiente peculiar de verão que conhece tão bem quem não pode alugar uma dacha — tudo isso abalou de uma vez os já combalidos nervos do jovem. O cheiro insuportável das tavernas, numerosíssimas naquele bairro, e os bêbados que encontrava a cada instante completavam o quadro repulsivo.\n\nSentimento de profunda repugnância passou-lhe pelo rosto, e ele se envergonhou: não era vaidade demais para quem vivia naquela miséria? E contudo, ao aproximar-se da casa alta da velha agiota, percebeu que suas pernas tremiam e a mão buscou o machado sob o casaco.\n\nQue é isso em mim?, pensou. Se tremo agora, que tremerei depois? A dúvida, porém, durou pouco: como uma resposta a todas as suas dúvidas, ouviu a voz da velha do outro lado da porta, e o coração gelou-lhe. Precisou reunir toda a força que lhe restava para não desmaiar ali mesmo.',
      },
      {
        title: 'Primeira parte · III',
        text: 'Depois do que se passou, dias inteiros se confundiram num único torpor. Raskólnikov ora dormia, ora se levantava sem saber se era dia ou noite. A comida que Razumikhin lhe trazia ficava intocada; os amigos que vinham vê-lo eram expulsos com grosseria, exceto um, o único que ele tolerava em silêncio.\n\nO peso não estava no medo de ser descoberto — a polícia nem o olhava —, mas em algo pior: a constatação de que o ato não o tornara maior, apenas menor. Onde imaginava uma prova de vontade, encontrou apenas náusea. A ideia que o sustentara revelou-se mais frágil que a mão que a executou.\n\nNuma dessas noites febris, recebeu um bilhete: a família o chamava. Mãe e irmã vinham a Petersburgo. Leu duas vezes e não entendeu; depois entendeu demais. Havia pessoas que ainda o amavam, e esse amor, agora, parecia-lhe o tribunal mais severo de todos.',
      },
    ],
  },
  sisifo: {
    title: 'O Mito de Sísifo',
    chapters: [
      {
        title: 'Um raciocínio absurdo',
        text: 'Só existe um problema filosófico verdadeiramente sério: é o suicídio. Julgar se a vida vale ou não a pena ser vivida é responder à questão fundamental da filosofia. O resto — se o mundo tem três dimensões, se o espírito tem nove ou doze categorias — vem depois.\n\nNão digo que isso seja urgente. Mas antes de tudo é preciso responder. E se é verdade, como Nietzsche quer, que um filósofo, para ser digno de respeito, deve pregar com o exemplo, percebe-se a importância dessa resposta. O homem honesto joga limpo.\n\nO absurdo nasce desse confronto: de um lado, o apelo humano; de outro, o silêncio irracional do mundo. O absurdo não está no homem nem no mundo, mas na presença conjunta dos dois. Reconhecê-lo é o começo; viver com ele, sem apelo e sem consolo, é a disciplina do espírito livre.',
      },
      {
        title: 'O homem absurdo',
        text: 'Que significa essa regra de vida: esgotar o presente antes de passar adiante? A esperança de outra vida deve ser compensada pela impostura dos que a inventam. O homem absurdo sabe que a quantidade não substitui a qualidade, mas sabe também que não há hierarquia de experiências: há a lucidez de vivê-las todas.\n\nDon Juan, o ator, o conquistador: figuras de uma vida sem apelo. Não porque desprezem, mas porque escolhem permanecer no tempo, conscientes de que toda grandeza é passageira e que a consciência desse limite é justamente o que dá à vida a sua intensidade.\n\nO que importa não é viver mais, é viver mais. E viver mais exige, antes de tudo, não fugir: recusar o consolo, recusar o salto, recusar o álibi. Permanecer, com o espírito acordado, diante do que não tem resposta.',
      },
      {
        title: 'Sísifo',
        text: 'Os deuses condenaram Sísifo a rolar sem cessar uma pedra até o alto de uma montanha, de onde a pedra voltava a cair por seu próprio peso. Pensaram, com razão, que não há castigo mais terrível do que o trabalho inútil e sem esperança.\n\nÉ nesse retorno, nessa pausa, que me interessa Sísifo. Seu rosto, que se esforça tão perto das pedras, é já a própria alegria. Cada um dos grãos daquela montanha, cada fragmento mineral daquela noite cheia de montanhas, forma, só por si, um mundo. A própria luta para chegar aos cumes é suficiente para encher um coração de homem.\n\nDeixo Sísifo no sopé da montanha. Sempre se reencontra o seu fardo. Mas Sísifo ensina a fidelidade superior que nega os deuses e levanta as pedras. Ele também acha que está tudo bem. Esse universo sem dono não lhe parece nem estéril nem fútil. É preciso imaginar Sísifo feliz.',
      },
    ],
  },
  liberdade: {
    title: 'Sobre a Liberdade',
    chapters: [
      {
        title: 'Introdução',
        text: 'O objetivo deste ensaio é afirmar um princípio muito simples, destinado a regular de modo absoluto as relações da sociedade com o indivíduo nos métodos de controle e coerção. O princípio é este: o único fim pelo qual a humanidade está autorizada a interferir na liberdade de ação de um de seus membros é proteger a si mesma.\n\nA única finalidade legítima para exercer poder sobre qualquer membro de uma comunidade civilizada, contra a sua vontade, é impedir que ele cause dano a outros. O próprio bem dessa pessoa, físico ou moral, não é justificativa suficiente. Não se pode legitimamente obrigar alguém a fazer ou deixar de fazer algo porque seria melhor para ele.\n\nSobre si mesmo, sobre o seu corpo e o seu espírito, o indivíduo é soberano. A sociedade pode, e deve, ajudar a convencer; mas coagir somente quando há dano a terceiros.',
      },
      {
        title: 'Da liberdade de pensamento e discussão',
        text: 'A época em que a nudez da defesa pela liberdade de opinião era uma necessidade de combate pode ser considerada terminada; mas o perigo não mudou de forma: agora é a tendência da sociedade, mais do que a do governo, a punir a divergência.\n\nSe toda a humanidade menos um fosse de uma opinião, e apenas um indivíduo fosse da opinião contrária, a humanidade não teria mais direito de silenciar esse indivíduo do que ele, se pudesse, teria de silenciar a humanidade. Toda opinião silenciada pode ser verdadeira; e mesmo quando é falsa, a sua refutação pública vivifica a verdade, impedindo que ela se transforme em dogma morto.\n\nA verdade ganha mais com o erro que a desafia do que com a repetição que a adormece.',
      },
    ],
  },
  riqueza: {
    title: 'A Riqueza das Nações',
    chapters: [
      {
        title: 'Da divisão do trabalho',
        text: 'O maior progresso no poder produtivo do trabalho, e a maior parte da habilidade, destreza e bom senso com que ele é aplicado, parecem ter sido efeito da divisão do trabalho. Tomemos o exemplo de uma manufatura muito pequena: a fabricação de alfinetes.\n\nUm operário não treinado para esse ofício, mesmo que trabalhe com toda diligência, dificilmente fará um alfinete por dia. Mas na forma como esse ofício é hoje conduzido, ele é dividido em cerca de dezoito operações distintas: um operário estira o arame, outro o endireita, um terceiro o corta, um quarto lhe faz a ponta, um quinto o esfia para receber a cabeça.\n\nVi uma pequena manufatura que empregava dez operários e produzia por dia mais de quarenta e oito mil alfinetes. Cada operário, portanto, podia ser considerado como produzindo diariamente quatro mil e oitocentos alfinetes. Tal é o efeito da divisão do trabalho.',
      },
      {
        title: 'Do princípio que ocasiona a divisão do trabalho',
        text: 'A divisão do trabalho, da qual derivam tantas vantagens, não é, em sua origem, efeito de qualquer sabedoria humana que preveja a opulência geral. É consequência necessária, embora muito lenta e gradual, de certa propensão da natureza humana: a propensão a trocar, permutar e negociar uma coisa por outra.\n\nNão é da benevolência do açougueiro, do cervejeiro ou do padeiro que esperamos o nosso jantar, mas da consideração que eles têm pelo próprio interesse. Dirigimo-nos não à sua humanidade, mas ao seu amor-próprio, e nunca lhes falamos das nossas necessidades, mas das vantagens deles.\n\nCada homem, procurando empregar o seu capital da maneira mais vantajosa, é levado por uma mão invisível a promover um fim que não fazia parte das suas intenções. Ao buscar o próprio interesse, frequentemente promove o da sociedade de maneira mais eficaz do que quando realmente intenta promovê-lo.',
      },
    ],
  },
};

export const CATEGORIES = [
  'Filosofia',
  'Literatura',
  'História',
  'Ciência',
  'Direito',
  'Economia',
  'Tecnologia',
  'Psicologia',
  'Política',
  'Biografias',
  'Ficção',
  'Outros',
];

export const QUOTES = [
  { text: 'Um livro é um machado para o mar congelado dentro de nós.', author: 'Franz Kafka' },
  { text: 'A leitura é uma amizade que não cansa.', author: 'Marcel Proust' },
  { text: 'Quem lê vive muitas vidas antes de morrer.', author: 'George R. R. Martin' },
  { text: 'A literatura é a memória de um povo.', author: 'Machado de Assis (apócrifo)' },
  { text: 'Nada é mais meu do que a minha faculdade de julgar.', author: 'Marco Aurélio' },
];
