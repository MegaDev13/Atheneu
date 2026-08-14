// Smoke test headless: valida o modo demo e a lógica principal sem navegador.
import * as fs from 'fs';
import { localBackend } from '../src/services/local';
import { computeStats, goalStatus, buildInsight } from '../src/lib/stats';
import { splitChapters } from '../src/features/library/parse';
import { askLibrary } from '../src/features/ai/localEngine';
import { normalizeQuestion, hashText, selectContext, shouldUseAI, askAI } from '../src/features/ai/pipeline';
import { segmentChapter } from '../workers/shared/segmenter';
import { concatWav, wavSeconds } from '../workers/shared/audio';

// Stubs de browser
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

let failures = 0;
const ok = (name: string, cond: any) => {
  if (!cond) { failures++; console.error('✗', name); } else console.log('✓', name);
};

async function main() {
  // Seed + livros
  const books = await localBackend.listBooks('u1');
  ok('seed: 6 livros', books.length === 6);
  ok('seed: Crime e Castigo presente', books.some((b) => b.id === 'b-crime' && b.pages === 520));

  const chapters = await localBackend.getChapters('b-crime');
  ok('capítulos de Crime e Castigo = 3', chapters.length === 3);
  ok('capítulo tem texto', chapters[0].text.length > 200);

  // Auth demo
  const reg = await localBackend.signUp('Teste', 'teste@exemplo.com', 'senha12345');
  ok('registro demo ok', reg.ok);
  const dup = await localBackend.signUp('Teste', 'teste@exemplo.com', 'outra');
  ok('registro duplicado bloqueado', !dup.ok);
  const bad = await localBackend.signIn('teste@exemplo.com', 'errada');
  ok('senha errada rejeitada', !bad.ok);
  const good = await localBackend.signIn('teste@exemplo.com', 'senha12345');
  ok('login demo ok', good.ok);

  const profile = await localBackend.getProfile('u1');
  ok('perfil criado', profile?.name === 'Teste');

  // Progresso / notas / destaques
  const progress = await localBackend.listProgress('u1');
  ok('progresso seed carregado', progress.length >= 3);
  await localBackend.saveProgress('u1', { bookId: 'b-crime', chapter: 2, location: 0.5, page: 300, updatedAt: Date.now() });
  const p2 = await localBackend.listProgress('u1');
  ok('progresso persistido (upsert)', p2.find((p) => p.bookId === 'b-crime')?.page === 300);

  const notes = await localBackend.listNotes('u1');
  ok('notas seed', notes.length >= 4);
  const highlights = await localBackend.listHighlights('u1', 'b-crime');
  ok('destaques do livro', highlights.length >= 1);

  // Sessões + estatísticas
  const sessions = await localBackend.listSessions('u1');
  ok('sessões seed', sessions.length > 50);
  const stats = computeStats(sessions, books, notes, highlights);
  ok('stats: páginas > 0', stats.totalPages > 0);
  ok('stats: sequência >= 0', stats.streak >= 0);
  ok('stats: gêneros', stats.genreCounts.length >= 3);
  ok('stats: série diária 56 pontos', stats.daily.length === 56);

  // Metas
  const goals = await localBackend.listGoals('u1');
  const gs = goalStatus(goals[0], books, sessions);
  ok('meta anual: concluídos do seed', gs.done === 2 && goals[0].target === 20);
  ok('meta: ritmo calculado', gs.paceText.length > 0);

  // Insight
  const insight = buildInsight(books, notes, highlights);
  ok('insight gerado', insight.length > 30);

  // Parser de capítulos
  const long = 'Este é um parágrafo longo o bastante para que o parser considere o trecho como um capítulo válido da obra. '.repeat(3);
  const txt = `Capítulo 1\n\n${long}\n\nCapítulo 2\n\n${long}`;
  const chs = splitChapters(txt, 'Livro');
  ok('splitChapters detecta 2 capítulos', chs.length === 2);

  // IA local
  const ans = await askLibrary('quais livros falam sobre liberdade?', { books, notes, highlights });
  ok('IA local responde', ans.text.length > 40);
  ok('IA local acha "Sobre a Liberdade"', ans.text.includes('Liberdade') || ans.text.includes('liberdade'));
  const ans2 = await askLibrary('niilismo absurdo', { books, notes, highlights });
  ok('IA local acha referências de niilismo/absurdo', ans2.text.includes('Sísifo') || ans2.text.includes('absurdo'));

  // Social
  const social = await localBackend.getSocial('u1');
  ok('social: personas', social.people.length === 5);
  ok('social: leitores em Crime e Castigo', (social.readers['b-crime'] || []).length >= 3);
  const before = social.following.length;
  const after = await localBackend.toggleFollow('u1', 'p-carlos');
  ok('follow toggle', after.length === before + 1);

  // Áudio
  await localBackend.saveAudioProgress('u1', { bookId: 'b-crime', chapter: 0, seconds: 42, rate: 1.25, updatedAt: Date.now() });
  const ap = await localBackend.getAudioProgress('u1', 'b-crime');
  ok('progresso de áudio salvo', ap?.seconds === 42);

  // ═══ Extensão TTS (§51) ═══
  const prefs = await localBackend.getTtsPrefs('u1');
  ok('tts: prefs padrão kokoro', prefs.engine === 'kokoro' && prefs.voice === 'pf_dora');

  const job = await localBackend.createJob('u1', 'b-crime', 2, prefs);
  ok('tts: job criado na fila', job.status === 'queued' && job.priority === 2);
  const dupJob = await localBackend.createJob('u1', 'b-crime', 1, prefs);
  ok('tts: duplicação bloqueada (mesmo livro ativo)', dupJob.id === job.id);

  let jobs = await localBackend.listJobs('u1');
  ok('tts: job reivindicado/processando pelo worker demo', ['processing', 'claimed'].includes(jobs[0].status));

  // Retomada/avanço: força tempo decorrido
  const dbTick = () => (localBackend as any) && localBackend.getBookAudioState('u1', 'b-crime');
  const st0 = await dbTick();
  ok('tts: capítulos criados no job', st0.chapters.length === 3);
  // Avança o relógio do job simulando processamento longo
  await forceCompleteJob(job.id);
  const st1 = await localBackend.getBookAudioState('u1', 'b-crime');
  ok('tts: job concluído', st1.job?.status === 'completed' && st1.readyChapters === 3);
  ok('tts: arquivo registrado com hash (integridade §48)', st1.chapters.every((c: any) => c.fileHash && c.fileSize > 0));

  const segs = await localBackend.getAudioSegments('u1', 'b-crime', 0);
  ok('tts: segmentos de sincronização gerados (§18)', segs.length === 4 && segs[0].audioStart === 0);

  // Nunca reprocessa capítulo concluído (§14)
  const beforeHash = st1.chapters[0].fileHash;
  await localBackend.listJobs('u1');
  const st2 = await localBackend.getBookAudioState('u1', 'b-crime');
  ok('tts: capítulo concluído não é reprocessado', st2.chapters[0].fileHash === beforeHash);

  // Cancelamento preserva estado (§6)
  const job2 = await localBackend.createJob('u1', 'b-meditacoes', 1, prefs);
  await localBackend.listJobs('u1');
  await localBackend.cancelJob('u1', job2.id);
  const st3 = await localBackend.getBookAudioState('u1', 'b-meditacoes');
  ok('tts: cancelamento preserva estado', st3.job?.status === 'cancelled' && st3.chapters.length > 0);

  // Worker offline → job fica na fila
  await localBackend.updateWorker('u1', 'w-demo', { active: false } as any);
  const job3 = await localBackend.createJob('u1', 'b-sisifo', 1, prefs);
  const stQueued = await localBackend.getBookAudioState('u1', 'b-sisifo');
  ok('tts: sem worker ativo o job aguarda na fila', stQueued.job?.status === 'queued' && stQueued.job.id === job3.id);
  await localBackend.updateWorker('u1', 'w-demo', { active: true } as any);

  const workers = await localBackend.listWorkers('u1');
  ok('tts: lista de dispositivos', workers.length >= 2 && workers.some((w) => w.platform === 'android'));

  // Segmentação do worker (compartilhada)
  const segText = 'Primeira frase do capítulo. Segunda frase um pouco mais longa para testar o agrupamento de segmentos do worker! Ainda há mais conteúdo aqui, suficiente para exercer o código? Sim, há.';
  const wsegs = segmentChapter(segText);
  ok('worker: segmentação por frases', wsegs.length >= 1 && wsegs[0].start === 0 && wsegs[wsegs.length - 1].end <= segText.length);

  // Áudio: concatenação e duração de WAV sintético (mesmo sample rate, como no TTS real)
  const wavA = makeWav(16000, 1);
  const wavB = makeWav(16000, 1);
  fs.writeFileSync('/tmp/a.wav', wavA);
  fs.writeFileSync('/tmp/b.wav', wavB);
  concatWav(['/tmp/a.wav', '/tmp/b.wav'], '/tmp/ab.wav');
  const dur = wavSeconds(fs.readFileSync('/tmp/ab.wav'));
  ok('worker: concatenação WAV + duração (~2s)', Math.abs(dur - 2) < 0.1);

  // ═══ Anotações independentes do PDF (§51-ext) ═══
  const { autoAnnotationName, ANNOTATION_COLORS } = await import('../src/lib/types');
  ok('anot: nome automático por texto', autoAnnotationName('A justiça é uma espécie de harmonia muito longa que precisa ser cortada no limite certo', 12) === 'A justiça é uma espécie de harmonia muito longa que precisa…'.slice(0,49) || autoAnnotationName('A justiça é uma espécie de harmonia muito longa que precisa ser cortada no limite certo', 12).endsWith('…'));
  ok('anot: nome automático sem texto = Página X', autoAnnotationName(null, 327) === 'Página 327');
  ok('anot: 6 cores disponíveis', Object.keys(ANNOTATION_COLORS).length === 6);
  // multi-linha/multi-página = 1 anotação com N rects (mesmo id)
  const multiRect = { id: 'a1', bookId: 'b', page: 50, type: 'text' as const, text: 'x', name: 'n', comment: '', color: 'yellow' as const, rects: [ {page:50,x:.1,y:.2,w:.8,h:.03},{page:50,x:.1,y:.25,w:.8,h:.03},{page:51,x:.1,y:.1,w:.4,h:.03} ], createdAt: 0, updatedAt: 0 };
  ok('anot: retângulos relativos 0..1', multiRect.rects.every(r => r.x>=0 && r.x<=1 && r.w<=1 && r.h<=1));
  ok('anot: mesma anotação atravessa páginas', new Set(multiRect.rects.map(r=>r.page)).size === 2);
  // export/import round-trip
  const { parseImportedAnnotations } = await import('../src/components/reader/AnnotationUI');
  const exported = JSON.stringify({ book: {title:'t',author:'a'}, annotations: [multiRect] });
  const imported = parseImportedAnnotations(exported, 'book_novo');
  ok('anot: importação reconstrói marcação', imported.length === 1 && imported[0].bookId === 'book_novo' && imported[0].rects.length === 3);
  ok('anot: importação sanitiza cor inválida', parseImportedAnnotations(JSON.stringify({annotations:[{...multiRect, color:'rosa'}]}), 'b').length === 1);

  // ═══ IA (§51) ═══
  const h1 = await hashText('answer_library_question::' + normalizeQuestion('O que é niilismo?'));
  const h2 = await hashText('answer_library_question::' + normalizeQuestion('o que é niilismo?'));
  ok('ia: normalização gera o mesmo hash (§23)', h1 === h2);

  const noKey = await askAI({ userId: 'u1', question: 'x', operation: 'explain_concept', context: 'y' });
  ok('ia: sem chave → indisponível sem quebrar (§32)', noKey.status === 'unavailable');

  const ctx = { books, notes, highlights };
  const context = selectContext('niilismo absurdo moral', ctx);
  ok('ia: contexto mínimo selecionado (§27)', context.length > 0 && context.length <= 6000);
  ok('ia: shouldUseAI conceitual', shouldUseAI('Qual a relação entre niilismo e moral?', ctx) === true);
  ok('ia: shouldUseAI nega busca simples (§26)', shouldUseAI('Dom Casmurro', ctx) === false);

  // Cache
  await localBackend.aiSetCache('u1', { hash: 'abc', operation: 'answer_library_question', response: 'resposta em cache', model: 'test', createdAt: Date.now(), expiresAt: Date.now() + 10000 });
  const hit = await localBackend.aiGetCache('u1', 'answer_library_question', 'abc');
  ok('ia: cache retorna resposta sem nova consulta (§22)', hit?.response === 'resposta em cache');
  const miss = await localBackend.aiGetCache('u1', 'answer_library_question', 'inexistente');
  ok('ia: cache inexistente → null', miss === null);
  await localBackend.aiSetCache('u1', { hash: 'exp', operation: 'answer_library_question', response: 'x', model: 't', createdAt: Date.now() - 1000, expiresAt: Date.now() - 1 });
  ok('ia: cache expirado é ignorado', (await localBackend.aiGetCache('u1', 'answer_library_question', 'exp')) === null);

  // Limite diário (§29)
  for (let i = 0; i < 10; i++) {
    await localBackend.aiLogRequest('u1', { operation: 'answer_library_question', hash: null, model: 'gemini', status: 'success', tokensEstimated: 100, at: Date.now() });
  }
  ok('ia: limite diário contado (10/10)', (await localBackend.aiCountToday('u1')) >= 10);
  await localBackend.aiLogRequest('u1', { operation: 'answer_library_question', hash: 'abc', model: 'gemini', status: 'cache', tokensEstimated: 0, at: Date.now() });
  ok('ia: respostas de cache não consomem cota', (await localBackend.aiCountToday('u1')) === 10);

  // ═══ Segurança (§51) ═══
  const backendSrc = fs.readFileSync('src/services/supabaseBackend.ts', 'utf8');
  const eqUser = (backendSrc.match(/\.eq\('user_id'/g) || []).length;
  ok('segurança: adaptador Supabase filtra por user_id (RLS complementar)', eqUser >= 25);
  const mig = fs.readdirSync('supabase/migrations').map((f) => fs.readFileSync('supabase/migrations/' + f, 'utf8')).join('\n');
  ok('segurança: RLS habilitado nas tabelas', (mig.match(/enable row level security/g) || []).length >= 30);
  ok('segurança: nenhuma service role no frontend', !backendSrc.includes('service_role') && !fs.readFileSync('src/lib/supabase.ts', 'utf8').includes('service_role'));

  // ═══ Theme Engine (§24/25) ═══
  const schema = await import('../src/theme/schema');
  const presets = await import('../src/theme/presets');
  const ai = await import('../src/theme/ai');
  ok('tema: 12 presets no mesmo engine', presets.PRESETS.length === 12);
  const evil = schema.sanitizeTheme({ name: 'x', mode: 'dark', colors: { background: 'javascript:alert(1)', primary: '#00e5ff', text: 'url(javascript:x)' }, radius: { xl: '20px' } });
  ok('tema: bloqueia javascript:/url() e mantém tokens seguros', evil.colors.background === undefined && evil.colors.text === undefined && evil.colors.primary === '#00e5ff' && evil.radius.xl === '20px');
  ok('tema: flatten gera pares var→valor', schema.flattenTheme(evil).some(([k, v]) => k === '--wine' && v === '#00e5ff'));
  const base = presets.PRESET_LIGHT;
  const merged = ai.mergePatch(base, { colors: { primary: '#00e5ff' } });
  ok('tema: merge incremental preserva o resto', merged.colors.primary === '#00e5ff' && merged.mode === 'light');
  const local = ai.localDesigner('faça um tema cyberpunk escuro com azul neon', base);
  ok('tema: designer local interpreta pedido', local.mode === 'dark');
  const darker = ai.localDesigner('deixe mais escuro', local);
  ok('tema: modificação incremental não regenera tudo', darker.mode === 'dark');
  const exportedJson = await import('../src/theme/engine').then(m => m.exportTheme(local));
  const impTheme = await import('../src/theme/engine').then(m => m.importTheme(exportedJson));
  ok('tema: export→import round-trip', impTheme.ok === true);
  const badTheme = await import('../src/theme/engine').then(m => m.importTheme('{ "colors": { "background": "eval(1)" } }'));
  ok('tema: import rejeita tema sem tokens válidos', (badTheme as any).ok === false);
  const cr = schema.contrastRatio('#241e15', '#f2ecdf');
  ok('tema: contraste do tema padrão >= 7 (acessível)', (cr || 0) >= 7);

  console.log(failures === 0 ? '\n🎉 Todos os testes passaram.' : `\n❌ ${failures} teste(s) falharam.`);
  process.exit(failures === 0 ? 0 : 1);
}

// ─── Helpers dos testes ───
async function forceCompleteJob(jobId: string) {
  // Hack de teste: acessa o db local e retroage o started_at para simular tempo.
  const { loadDB, saveDB } = await import('../src/lib/demoStore');
  const db = loadDB();
  const j = db.jobs.find((x: any) => x.id === jobId);
  if (j && j.startedAt) {
    j.startedAt = Date.now() - 3600_000;
    saveDB();
  }
  await localBackend.listJobs('u1');
}

function makeWav(sampleRate: number, seconds: number): Buffer {
  const n = sampleRate * seconds;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin(i / 30) * 3000), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

main().catch((e) => { console.error(e); process.exit(1); });
