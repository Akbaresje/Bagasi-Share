import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastKind = "ok" | "err" | "info";
interface ToastItem { id: number; msg: string; kind: ToastKind; }
interface ToastCtx { push: (msg: string, kind?: ToastKind) => void; }

const Ctx = createContext<ToastCtx | null>(null);
let counter = 0;

const KIND_META: Record<ToastKind, { color: string; tag: string; Icon: typeof CheckCircle2 }> = {
  ok: { color: "var(--green)", tag: "OK", Icon: CheckCircle2 },
  err: { color: "#B23A48", tag: "ERR", Icon: AlertCircle },
  info: { color: "var(--accent-2)", tag: "INFO", Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = ++counter;
    setItems((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => {
            const { color, tag, Icon } = KIND_META[t.kind];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: .96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className="pointer-events-auto flex items-start gap-3 border border-[var(--line-strong)] bg-[var(--paper)] p-4 shadow-[0_20px_40px_-20px_rgba(22,35,59,.45)]"
                style={{ borderLeftWidth: 3, borderLeftColor: color }}
              >
                <Icon size={17} className="mt-0.5 shrink-0" style={{ color }} />
                <div className="min-w-0 flex-1">
                  <p className="mono-xs" style={{ color }}>{tag}</p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--ink)]">{t.msg}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
