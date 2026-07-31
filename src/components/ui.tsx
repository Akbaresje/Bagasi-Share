import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, LucideIcon } from "lucide-react";

export const idr = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/* ============ PILL ============ */
export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="mono-xs inline-flex w-fit items-center whitespace-nowrap border px-2.5 py-1"
      style={{ borderColor: color, color, background: `${color}12` }}
    >
      {children}
    </span>
  );
}

/* ============ STAT CARD ============ */
export function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon?: LucideIcon; color: string }) {
  return (
    <div className="paper-card p-6">
      <div className="flex items-start justify-between">
        <p className="mono-xs text-[var(--ink-mute)]">{label}</p>
        {Icon && <Icon size={16} strokeWidth={1.5} style={{ color }} />}
      </div>
      <p className="mt-5 font-display text-[36px] leading-none tracking-[.01em] tabular-nums text-[var(--ink)]">{value}</p>
      {sub && <p className="mt-2 text-[12px] text-[var(--ink-mute)]">{sub}</p>}
    </div>
  );
}

/* ============ MODAL ============ */
export function Modal({ open, onClose, title, children, maxW = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; maxW?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[var(--ink)]/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: .97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .97, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${maxW} border border-[var(--line-strong)] bg-[var(--paper)] shadow-[0_32px_64px_-24px_rgba(22,35,59,.5)]`}
          >
            <div className="flex items-start justify-between border-b border-[var(--line)] p-6 sm:p-7">
              <h3 className="font-display text-[22px] tracking-[.01em] text-[var(--ink)]">{title}</h3>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center border border-transparent text-[var(--ink-mute)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"><X size={16} /></button>
            </div>
            <div className="p-6 sm:p-7">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============ FIELD & INPUTS ============ */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mono-xs text-[var(--ink-mute)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const baseInputCls =
  "w-full border border-[var(--line-strong)] bg-[var(--cream)] px-3.5 py-3 text-[14px] font-medium text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInputCls} ${props.className ?? ""}`} />;
}

export function SelectInput({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInputCls} appearance-none`}>{children}</select>;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={props.rows ?? 3} className={`${baseInputCls} min-h-[80px]`} />;
}

/* ============ EMPTY STATE ============ */
export function EmptyState({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="paper-card grid place-items-center p-14 text-center">
      <Icon size={36} className="text-[var(--ink-faint)]" strokeWidth={1.25} />
      <p className="mt-5 font-display text-[20px] tracking-[.01em] text-[var(--ink)]">{title}</p>
      {desc && <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[var(--ink-mute)]">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ============ BUTTONS ============ */
export function PrimaryBtn({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[13px] font-bold text-[var(--cream)] transition hover:bg-[var(--ink-2)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 border border-[var(--line-strong)] bg-transparent px-4 py-2.5 text-[12px] font-bold text-[var(--ink)] transition hover:border-[var(--ink)] hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/* ============ SECTION CARD ============ */
export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="paper-card">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
        <h3 className="font-display text-[18px] tracking-[.01em] text-[var(--ink)]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
