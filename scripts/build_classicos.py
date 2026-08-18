#!/usr/bin/env python3
"""PDFs dos clássicos da estante da Shay (texto da biblioteca)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_engine import write_book

COVER = "/home/user/Atheneu/public/covers"

def book(slug, title, author, genre, cover, blurb, chapters, vol=0):
    return {
        "volume": vol, "slug": slug, "title": title, "subtitle": author,
        "author": author, "genre": genre, "blurb": blurb,
        "cover": f"{COVER}/{cover}", "cover_public": f"covers/{cover}",
        "chapters": [{"title": t, "blocks": [("p", p)]} for t, p in chapters],
    }

BOOKS = [
    book("crime-e-castigo", "Crime e Castigo", "Fiódor Dostoiévski", "Literatura", "crime-e-castigo.jpg",
         "Raskólnikov concebe um ato terrível para provar uma ideia.",
         [
             ("Primeira parte · I", "No começo de julho, num calor extremo, ao entardecer, um jovem saiu do cubículo que alugava e caminhou devagar, como que hesitante, em direção à ponte. Evitou felizmente encontrar-se com a patroa na escada. Seu cubículo ficava sob o teto de um grande edifício de cinco andares e parecia mais um armário do que um quarto. Estava esmagado pela pobreza, mas o que o atormentava não era a miséria: era uma ideia que há meses lhe fermentava na cabeça. Não era um simples ensaio: era o primeiro passo."),
             ("Primeira parte · II", "O calor sufocante da cidade, a poeira, os andaimes e o cheiro das tavernas abalaram os nervos do jovem. Ao aproximar-se da casa da velha agiota, as pernas tremiam e a mão buscou o machado sob o casaco. Que é isso em mim?, pensou. Se tremo agora, que tremerei depois?"),
             ("Primeira parte · III", "Depois do que se passou, dias inteiros se confundiram num único torpor. O ato não o tornara maior, apenas menor. Recebeu um bilhete: mãe e irmã vinham a Petersburgo. Havia pessoas que ainda o amavam, e esse amor pareceu-lhe o tribunal mais severo de todos."),
         ]),
    book("dom-casmurro", "Dom Casmurro", "Machado de Assis", "Literatura", "dom-casmurro.jpg",
         "Bento Santiago reconstrói a própria vida para responder se Capitu o traiu.",
         [
             ("I · Do título", "Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz que recitou versos. Como eu estava cansado, fechei os olhos. No dia seguinte alcunhou-me Dom Casmurro. Casmurro, no vulgo, é o homem calado e metido consigo. Dom veio por ironia."),
             ("II · Do livro", "Vivo só, com um criado. Resolvi escrever as minhas memórias, em que contarei as coisas da minha mocidade, e principalmente uma criatura que amei acima de todas, e que me deu o ciúme mais amargo da vida. Não escrevo para divertir, mas para me defender. Entender é, às vezes, absolver."),
             ("III · O muro e os olhos de ressaca", "Ao canto do quintal havia um muro. Foi ali que Capitu, com aqueles olhos de ressaca — olhos de onda que se retém e puxa — me perguntou se eu teria ânimo de ser padre. Desde esse dia aprendi que a memória dos lugares guarda o que as palavras perdem."),
         ]),
    book("meditacoes", "Meditações", "Marco Aurélio", "Filosofia", "meditacoes.jpg",
         "Anotações privadas do imperador: serenidade, dever e lucidez.",
         [
             ("Livro II", "Ao despertar, dize a ti mesmo: encontrarei hoje um indiscreto, um ingrato, um insolente. Tudo isso lhes advém por ignorância do bem e do mal. Nenhum deles pode me causar dano. Nascemos para cooperar. Realiza cada ação da vida como se fosse a última."),
             ("Livro IV", "As pessoas buscam retiros no campo e nas montanhas. Mas em parte alguma o homem encontra retiro mais sereno do que em sua própria alma. Se te afliges por algo exterior, não é a coisa que te perturba, mas o juízo que fazes dela. Sê semelhante ao rochedo contra o qual as ondas se quebram."),
             ("Livro VII", "A vida é curta; o único fruto dela é a disposição piedosa e as ações em prol do bem comum. Espera a morte com o rosto alegre. Nada é mais precioso do que uma alma que se contenta com pouco e serve ao todo."),
         ]),
    book("o-mito-de-sisifo", "O Mito de Sísifo", "Albert Camus", "Filosofia", "mito-de-sisifo.jpg",
         "Ensaio sobre o absurdo: é preciso imaginar Sísifo feliz.",
         [
             ("Um raciocínio absurdo", "Só existe um problema filosófico verdadeiramente sério: o suicídio. Julgar se a vida vale ou não a pena ser vivida é responder à questão fundamental da filosofia. O absurdo nasce do confronto entre o apelo humano e o silêncio irracional do mundo."),
             ("O homem absurdo", "O que importa não é viver mais tempo: é viver mais. Recusar o consolo, recusar o salto, permanecer acordado diante do que não tem resposta."),
             ("Sísifo", "Os deuses condenaram Sísifo a rolar uma pedra até o alto, de onde ela voltava a cair. A própria luta para chegar aos cumes é suficiente para encher um coração de homem. É preciso imaginar Sísifo feliz."),
         ]),
    book("sobre-a-liberdade", "Sobre a Liberdade", "John Stuart Mill", "Política", "sobre-a-liberdade.jpg",
         "O clássico ensaio sobre os limites do poder da sociedade sobre o indivíduo.",
         [
             ("Introdução", "O único fim pelo qual a humanidade está autorizada a interferir na liberdade de ação de um de seus membros é proteger a si mesma. Sobre si mesmo, sobre o seu corpo e o seu espírito, o indivíduo é soberano."),
             ("Da liberdade de pensamento e discussão", "Se toda a humanidade menos um fosse de uma opinião, a humanidade não teria mais direito de silenciar esse indivíduo do que ele teria de silenciar a humanidade. A verdade ganha mais com o erro que a desafia do que com a repetição que a adormece."),
         ]),
    book("a-riqueza-das-nacoes", "A Riqueza das Nações", "Adam Smith", "Economia", "riqueza-das-nacoes.jpg",
         "Divisão do trabalho, troca e a mão invisível.",
         [
             ("Da divisão do trabalho", "O maior progresso no poder produtivo do trabalho parece ter sido efeito da divisão do trabalho. Uma pequena manufatura de alfinetes, com o ofício dividido, produzia dezenas de milhares por dia."),
             ("Do princípio que ocasiona a divisão do trabalho", "Não é da benevolência do açougueiro, do cervejeiro ou do padeiro que esperamos o nosso jantar, mas da consideração que eles têm pelo próprio interesse. Cada homem é levado por uma mão invisível a promover um fim que não fazia parte das suas intenções."),
         ]),
]

if __name__ == "__main__":
    for spec in BOOKS:
        write_book(spec)
