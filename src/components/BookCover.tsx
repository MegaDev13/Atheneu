import { coverPalette } from '../lib/utils';

// Capa procedural com estética de encadernação clássica. Se o livro tiver capa
// enviada pelo usuário, ela é exibida por cima.
export default function BookCover({
  title,
  author,
  cover,
  seed,
  className = '',
  compact = false,
}: {
  title: string;
  author: string;
  cover?: string | null;
  seed?: number;
  className?: string;
  compact?: boolean;
}) {
  const pal = coverPalette(title, seed);
  return (
    <div
      className={`relative overflow-hidden rounded-md ${className}`}
      style={
        cover
          ? undefined
          : { background: `linear-gradient(150deg, ${pal.a} 0%, ${pal.b} 85%)` }
      }
    >
      {cover ? (
        <img src={cover} alt={`Capa de ${title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-between p-[8%] text-center">
          <div className="w-full border-b opacity-40" style={{ borderColor: pal.ink }} />
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6%]">
            <span
              className={`font-display leading-tight ${compact ? 'text-[10px]' : 'text-[15px] md:text-[13px] lg:text-[15px]'}`}
              style={{ color: pal.ink }}
            >
              {title}
            </span>
            {!compact && (
              <span className="font-sans text-[8px] uppercase tracking-[0.18em] opacity-70" style={{ color: pal.ink }}>
                {author}
              </span>
            )}
          </div>
          <div className="w-full border-t opacity-40" style={{ borderColor: pal.ink }} />
        </div>
      )}
      {/* Lombada */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/35 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_0%,rgba(255,255,255,.14),transparent_55%)]" />
    </div>
  );
}
