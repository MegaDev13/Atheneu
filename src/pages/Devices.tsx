import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Bot, Pencil, Trash2, Power, Terminal } from 'lucide-react';
import { backend } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button, Card, Modal, Field, Input, Skeleton } from '../components/ui';
import { relTime } from '../lib/utils';
import type { TtsWorker } from '../lib/types';

const ONLINE_WINDOW_MS = 120_000; // §11: considerado online se visto há < 2 min

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'android') return <Smartphone size={19} />;
  if (platform === 'demo') return <Bot size={19} />;
  return <Monitor size={19} />;
}

export default function Devices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<TtsWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<TtsWorker | null>(null);
  const [newName, setNewName] = useState('');

  async function load() {
    if (!user) return;
    try {
      setWorkers(await backend.listWorkers(user.id));
    } catch {
      toast('Não foi possível carregar seus dispositivos.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [user?.id]);

  function isOnline(w: TtsWorker) {
    return w.active && Date.now() - w.lastSeen < ONLINE_WINDOW_MS;
  }

  return (
    <div className="mx-auto w-[min(900px,94%)] py-6 md:py-8">
      <div className="mb-6">
        <p className="smallcaps">processamento de áudio</p>
        <h1 className="font-display text-[30px] text-ink">Meus dispositivos</h1>
        <p className="mt-1 max-w-xl text-[14px] text-mute">
          Qualquer computador ou celular seu pode virar um Worker: ele busca trabalhos na fila,
          gera o áudio localmente (Kokoro/Piper) e envia para sua biblioteca.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : (
        <div className="space-y-3">
          {workers.length === 0 && (
            <Card className="p-10 text-center">
              <Monitor size={30} className="mx-auto mb-3 text-gold" />
              <p className="font-display text-xl text-ink">Nenhum Worker conectado.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-mute">
                Instale o Worker no Windows ou num celular Android antigo, entre com esta mesma conta
                e o dispositivo aparecerá aqui.
              </p>
            </Card>
          )}

          {workers.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-wine-light text-wine">
                  <PlatformIcon platform={w.platform} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-display text-[17px] text-ink">
                    {w.deviceName}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-sans font-semibold uppercase tracking-wider ${
                      isOnline(w) ? 'bg-pine/10 text-pine' : w.active ? 'bg-card2 text-faint' : 'bg-card2 text-faint'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isOnline(w) ? 'bg-pine' : 'bg-faint'}`} />
                      {isOnline(w) ? 'online' : w.active ? 'offline' : 'desativado'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-mute">
                    {w.engine || 'Sem engine'}{w.engineVersion ? ` · ${w.engineVersion}` : ''} · {w.platform}
                    {w.battery !== null ? ` · 🔋 ${w.battery}%` : ''}
                  </p>
                  <p className="text-[11.5px] text-faint">Último acesso: {relTime(w.lastSeen)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setRenaming(w); setNewName(w.deviceName); }}
                    title="Renomear" aria-label={`Renomear ${w.deviceName}`}
                    className="rounded-lg p-2 text-faint transition-colors hover:bg-wine-light hover:text-ink"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={async () => {
                      await backend.updateWorker(user!.id, w.id, { active: !w.active } as any);
                      toast(w.active ? 'Processamento desativado neste dispositivo.' : 'Processamento reativado.', 'info');
                      load();
                    }}
                    title={w.active ? 'Desativar processamento' : 'Ativar processamento'}
                    aria-pressed={!w.active}
                    className={`rounded-lg p-2 transition-colors ${w.active ? 'text-faint hover:bg-wine-light hover:text-ink' : 'bg-pine/10 text-pine'}`}
                  >
                    <Power size={15} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Revogar o dispositivo "${w.deviceName}"?`)) return;
                      await backend.deleteWorker(user!.id, w.id);
                      toast('Dispositivo revogado.', 'info');
                      load();
                    }}
                    title="Revogar dispositivo" aria-label={`Revogar ${w.deviceName}`}
                    className="rounded-lg p-2 text-faint transition-colors hover:bg-wine-light hover:text-wine"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Como conectar */}
      <Card className="noise mt-6 p-6">
        <p className="smallcaps mb-3 flex items-center gap-1.5"><Terminal size={13} /> como conectar um worker</p>
        <ol className="list-inside list-decimal space-y-1.5 text-[13.5px] leading-relaxed text-mute">
          <li><strong className="text-ink">Windows/Linux/macOS:</strong> <code className="rounded bg-card2 px-1.5 py-0.5 text-[12px]">npm run worker:build && npm run worker</code> e entre com esta conta.</li>
          <li><strong className="text-ink">Android:</strong> instale o app Atheneu Worker, entre com esta conta e toque em “Iniciar”.</li>
          <li>Instale um engine local: <strong className="text-ink">Kokoro</strong> (recomendado) ou <strong className="text-ink">Piper</strong> como fallback.</li>
          <li>O dispositivo passa a buscar trabalhos da fila automaticamente — com heartbeat, retomada e upload.</li>
        </ol>
        <p className="mt-3 text-[12px] text-faint">
          O Worker opera apenas com as permissões da sua conta (nunca com chaves administrativas) e só
          processa trabalhos seus. Instruções completas em <code className="rounded bg-card2 px-1.5 py-0.5 text-[11px]">docs/TTS_WORKERS.md</code>.
        </p>
      </Card>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Renomear dispositivo">
        <div className="space-y-4">
          <Field label="Nome do dispositivo">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: PC do escritório" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancelar</Button>
            <Button
              disabled={newName.trim().length < 2}
              onClick={async () => {
                await backend.updateWorker(user!.id, renaming!.id, { deviceName: newName.trim() } as any);
                setRenaming(null);
                toast('Dispositivo renomeado.');
                load();
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
