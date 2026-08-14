import { forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// ─── Botões ───
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export function Button({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...rest }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-sans font-medium transition-all duration-200 active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none select-none';
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' };
  const variants = {
    primary: 'bg-wine text-[#f7f0e2] hover:brightness-110 shadow-card',
    outline: 'border border-line bg-transparent text-ink hover:bg-wine-light',
    ghost: 'text-ink hover:bg-wine-light',
    gold: 'border border-gold/50 text-gold hover:bg-gold/10',
    danger: 'border border-wine/40 text-wine hover:bg-wine-light',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  );
}

// ─── Campos ───
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-xl border bg-card2/60 px-3.5 text-[15px] text-ink placeholder:text-faint transition-colors focus:border-gold focus:outline-none ${
          invalid ? 'border-wine' : 'border-line'
        } ${className}`}
        {...rest}
      />
    );
  }
);

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-mute">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 flex items-center gap-1 text-[12.5px] text-wine">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12.5px] text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Select({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-11 w-full appearance-none rounded-xl border border-line bg-card2/60 px-3.5 text-[15px] text-ink focus:border-gold focus:outline-none ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

// ─── Cartão ───
export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card relative overflow-hidden ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ─── Progresso ───
export function ProgressBar({ value, className = '', tone = 'wine' }: { value: number; className?: string; tone?: 'wine' | 'pine' | 'gold' }) {
  const tones = { wine: 'bg-wine', pine: 'bg-pine', gold: 'bg-gold' };
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line/60 ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tones[tone]} transition-[width] duration-700 ease-out`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 84, stroke = 7, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--wine)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <span className="absolute font-display text-lg text-ink">{label ?? `${Math.round(value * 100)}%`}</span>
    </div>
  );
}

// ─── Modal / Drawer ───
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-6 sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
            initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl text-ink">{title}</h2>
                <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink">
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, title, children, side = 'right' }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; side?: 'right' | 'left' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65] bg-black/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside
            role="dialog" aria-label={title}
            className={`absolute top-0 h-full w-full max-w-md overflow-y-auto border-line bg-card p-5 shadow-deep ${side === 'right' ? 'right-0 border-l' : 'left-0 border-r'}`}
            initial={{ x: side === 'right' ? '100%' : '-100%' }} animate={{ x: 0 }} exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">{title}</h2>
                <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-mute hover:bg-wine-light hover:text-ink">
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Estados ───
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="text-gold">{icon}</div>
      <p className="font-display text-xl text-ink">{title}</p>
      {subtitle && <p className="max-w-sm text-sm text-mute">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}

export function Tag({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'wine' | 'pine' | 'gold' }) {
  const tones = {
    default: 'bg-card2 text-mute border-line',
    wine: 'bg-wine-light text-wine border-wine/25',
    pine: 'bg-pine/10 text-pine border-pine/25',
    gold: 'bg-gold/10 text-gold border-gold/30',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`hairline ${className}`} />;
}
