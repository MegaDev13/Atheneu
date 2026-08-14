# Fatiador/upload da compilação "Filosofia Antiga" para a conta do usuário (privado).
# Retomável: reusa livros já criados, pula capítulos já inseridos.
import io, json, re, unicodedata, urllib.request, urllib.parse, uuid
from pypdf import PdfReader, PdfWriter

env = dict(l.split('=', 1) for l in open('.env') if '=' in l)
URL, KEY = env['VITE_SUPABASE_URL'].strip(), env['VITE_SUPABASE_ANON_KEY'].strip()
r = urllib.request.urlopen(urllib.request.Request(
    URL + "/auth/v1/token?grant_type=password",
    headers={"apikey": KEY, "Content-Type": "application/json"},
    data=json.dumps({"email": "tmegasr@gmail.com", "password": "Thiago1#"}).encode()), timeout=30)
d = json.loads(r.read())
TOK, UID = d['access_token'], d['user']['id']

def H(ct=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {TOK}", "Prefer": "return=representation"}
    if ct:
        h["Content-Type"] = ct
    return h

def api(path, method="GET", body=None, raw=None, ct="application/json"):
    req = urllib.request.Request(URL + path, headers=H(ct), method=method,
                                 data=raw if raw is not None else (json.dumps(body).encode() if body is not None else None))
    try:
        t = urllib.request.urlopen(req, timeout=300).read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path[:90]} -> {e.code}: {e.read()[:400]}")
    return json.loads(t) if t.strip() else None

TOC = [
    (4, "Heráclito", "Fragmentos"), (31, "Parmênides", "Poema"), (50, "Anaximandro", "Fragmentos"),
    (59, "Anaxímenes", "Fragmentos"), (73, "Empédocles", "Sobre a Natureza"), (110, "Demócrito", "Fragmentos"),
    (125, "Pitágoras", "Fragmentos e Testemunhos"), (137, "Xenófanes", "Fragmentos"), (156, "Protágoras", "Fragmentos"),
    (161, "Górgias", "Elogio de Helena"), (165, "Górgias", "Sobre o Não-Ser"), (169, "Platão", "Apologia de Sócrates"),
    (198, "Platão", "Eutífron"), (213, "Platão", "Críton"), (227, "Platão", "Íon"), (239, "Platão", "Lísis"),
    (260, "Platão", "Laques"), (279, "Platão", "Cármides"), (311, "Platão", "Protágoras"), (350, "Platão", "Mênon"),
    (386, "Platão", "Eutidemo"), (420, "Platão", "Górgias"), (499, "Platão", "Menéxeno"), (513, "Platão", "Hípias Maior"),
    (565, "Platão", "Hípias Menor"), (581, "Platão", "Crátilo"), (657, "Platão", "Banquete"), (693, "Platão", "Fédon"),
    (753, "Platão", "Fedro"), (803, "Platão", "República"), (1115, "Platão", "Teeteto"), (1193, "Platão", "Parmênides"),
    (1256, "Platão", "Sofista"), (1329, "Platão", "Político"), (1390, "Platão", "Filebo"), (1447, "Platão", "Timeu"),
    (1533, "Platão", "Crítias"), (1546, "Platão", "Leis"),
]
TOTAL = 1851

def slug(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = re.sub(r'[\u0300-\u036f]', '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

reader = PdfReader("uploads/FILOSOFIA_ANTIGA_PRE_SOCRATICOS_SOCRATES_PLATAO.pdf")
ok = 0
for i, (start, autor, obra) in enumerate(TOC):
    end = TOC[i + 1][0] - 1 if i + 1 < len(TOC) else TOTAL
    existing = api("/rest/v1/books?select=id&user_id=eq." + UID +
                   "&author=eq." + urllib.parse.quote(autor) +
                   "&title=eq." + urllib.parse.quote(obra) + "&limit=1")
    if existing:
        bid = existing[0]["id"]
        nch = api(f"/rest/v1/book_chapters?select=id&book_id=eq.{bid}&limit=1")
        has_ch = len(nch or []) > 0
        book_has_file = api(f"/rest/v1/books?select=file_key&id=eq.{bid}")[0].get("file_key")
    else:
        book = api("/rest/v1/books", "POST", [{
            "id": str(uuid.uuid4()), "user_id": UID, "title": obra, "author": autor,
            "genre": "Filosofia", "format": "pdf", "pages": end - start + 1, "status": "want",
            "description": f"Da compilação 'Filosofia Antiga — Pré-Socráticos, Sócrates e Platão' (págs. {start}–{end}).",
        }])[0]
        bid = book["id"]
        has_ch = False
        book_has_file = None

    if not book_has_file:
        w = PdfWriter()
        for p in range(start - 1, end):
            w.add_page(reader.pages[p])
        buf = io.BytesIO()
        w.write(buf)
        pdf = buf.getvalue()
        key = f"{UID}/{bid}/{slug(autor)}-{slug(obra)}.pdf"
        api(f"/storage/v1/object/books/{key}", "POST", raw=pdf, ct="application/pdf")
        api(f"/rest/v1/books?id=eq.{bid}", "PATCH", {"file_key": key, "file_size": len(pdf)})

    if not has_ch:
        chs = []
        for p in range(start - 1, end):
            txt = (reader.pages[p].extract_text() or "").strip()
            # Postgres não aceita \u0000 em text; remove também outros controles
            txt = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', txt)
            chs.append({"id": str(uuid.uuid4()), "book_id": bid, "idx": p - (start - 1),
                        "title": f"Página {p + 1}", "content": txt})
            if len(chs) >= 100:
                api("/rest/v1/book_chapters", "POST", chs)
                chs = []
        if chs:
            api("/rest/v1/book_chapters", "POST", chs)
    ok += 1
    print(f"[{ok}/38] {autor} — {obra} · págs {start}–{end}", flush=True)

print("\n✅ DONE:", ok, "livros privados na conta", d['user']['email'])
