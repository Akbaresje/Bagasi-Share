import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Plane, ShieldCheck, ShoppingBag, Store, User as UserIcon, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { UserRole, useAuth, roleLabels } from "../auth/AuthContext";

const roleOptions: { id: UserRole; label: string; tag: string; desc: string; icon: typeof Plane }[] = [
  { id: "customer", label: "Customer", tag: "Pengirim / Penitip", desc: "Kirim barang personal atau belanja dari merchant.", icon: ShoppingBag },
  { id: "traveler", label: "Traveler", tag: "Penyedia Bagasi", desc: "Jual sisa kapasitas bagasi penerbanganmu.", icon: Plane },
  { id: "reseller", label: "Merchant", tag: "Penjual Apa Pun", desc: "Jual stok massal atau barang pribadi satuan.", icon: Store },
  { id: "admin", label: "Admin", tag: "Operasional", desc: "Kelola escrow, sengketa & gudang.", icon: ShieldCheck },
];

interface Props {
  onBack: () => void;
  initialMode?: "login" | "register";
  initialRole?: UserRole | null | undefined;
}

export default function AuthPage({ onBack, initialMode = "login", initialRole }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [step, setStep] = useState<"role" | "form">(initialRole ? "form" : "role");
  const [role, setRole] = useState<UserRole>(initialRole ?? "customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (!/.+@.+\..+/.test(email)) return setError("Format email tidak valid.");
    if (password.length < 6) return setError("Password minimal 6 karakter.");
    setLoading(true);
    try {
      if (mode === "register") await register(name.trim(), email.trim(), password, role);
      else await login(email.trim(), password, role);
    } catch { setError("Terjadi kesalahan, coba lagi."); }
    finally { setLoading(false); }
  }

  const active = roleOptions.find((r) => r.id === role)!;

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <div className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
        {/* LEFT — brand panel */}
        <aside className="relative hidden overflow-hidden border-r border-[var(--line)] bg-[var(--ink)] p-12 text-[var(--cream)] lg:flex lg:flex-col lg:justify-between lg:p-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.06]" style={{ backgroundImage: "linear-gradient(var(--cream) 1px, transparent 1px), linear-gradient(90deg, var(--cream) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(214,138,48,.22) 0%, transparent 60%)" }} />

          <button onClick={onBack} className="relative z-10 inline-flex w-fit items-center gap-2 mono-sm text-[var(--cream)]/60 transition hover:text-[var(--accent)]">
            <ArrowLeft size={14} /> Kembali
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] pulse-dot" />
              <span className="font-display text-[22px] tracking-[.02em]">BagasiShare</span>
            </div>
            <p className="mt-14 eyebrow-mono !text-[var(--accent)]">Empat Peran, Satu Platform</p>
            <h1 className="mt-5 font-display font-display-lg text-[var(--cream)]">
              Masuk Sesuai<br />Peranmu.
            </h1>
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-[var(--cream)]/60">
              Tiap peran punya dashboard sendiri. Data tersimpan di perangkat ini — mode demo, tidak butuh backend.
            </p>

            <div className="mt-10 space-y-2">
              {roleOptions.map((r, i) => (
                <div key={r.id} className="flex items-baseline gap-4 border-b border-[var(--cream)]/10 py-3">
                  <span className="mono-xs text-[var(--cream)]/40">0{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-display font-display-sm text-[var(--cream)]">{r.label}</p>
                    <p className="mono-xs mt-1 text-[var(--cream)]/45">{r.tag}</p>
                  </div>
                  {role === r.id && step === "form" && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 mono-xs text-[var(--cream)]/35">© 2026 · Escrow-secured P2P</p>
        </aside>

        {/* RIGHT — form */}
        <section className="flex flex-col p-6 sm:p-10 lg:p-16">
          <div className="mb-8 flex items-center justify-between">
            <button onClick={onBack} className="inline-flex items-center gap-2 mono-sm text-[var(--ink-mute)] transition hover:text-[var(--ink)] lg:hidden">
              <ArrowLeft size={14} /> Kembali
            </button>
            <div className="ml-auto flex items-center gap-1 rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] p-1">
              {(["login", "register"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); }} className={`mono-xs rounded-sm px-4 py-2 transition ${mode === m ? "bg-[var(--ink)] text-[var(--cream)]" : "text-[var(--ink-mute)] hover:text-[var(--ink)]"}`}>
                  {m === "login" ? "Masuk" : "Daftar"}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
            <AnimatePresence mode="wait">
              {step === "role" ? (
                <motion.div key="role" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .35 }}>
                  <p className="eyebrow-mono">Pilih Peran</p>
                  <h2 className="mt-4 font-display font-display-lg">Siapa Kamu?</h2>
                  <p className="mt-4 body-md">Tiap peran membuka dashboard berbeda. Bisa ganti nanti.</p>

                  <div className="mt-10 space-y-3">
                    {roleOptions.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { setRole(r.id); setStep("form"); }}
                        className="group flex w-full items-center gap-4 border border-[var(--line)] bg-[var(--paper)] p-4 text-left transition hover:border-[var(--ink)] hover:bg-[var(--paper-2)]"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center border border-[var(--line-strong)] bg-[var(--cream)] text-[var(--ink)] transition group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                          <r.icon size={18} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <p className="font-display font-display-sm">{r.label}</p>
                            <span className="mono-xs text-[var(--ink-mute)]">/ {r.tag}</span>
                          </div>
                          <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">{r.desc}</p>
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-[var(--ink-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .35 }} onSubmit={handleSubmit} noValidate>
                  <button type="button" onClick={() => setStep("role")} className="mb-6 inline-flex items-center gap-2 mono-xs text-[var(--ink-mute)] transition hover:text-[var(--accent)]">
                    <ArrowLeft size={12} /> Ganti peran
                  </button>

                  {/* role banner */}
                  <div className="flex items-center gap-3 border border-[var(--line-strong)] border-l-[3px] border-l-[var(--accent)] bg-[var(--paper)] p-4">
                    <span className="grid h-9 w-9 place-items-center bg-[var(--cream)] text-[var(--ink)]"><active.icon size={16} strokeWidth={1.75} /></span>
                    <div>
                      <p className="mono-xs text-[var(--ink-mute)]">Masuk sebagai</p>
                      <p className="font-display font-display-sm">{roleLabels[role]}</p>
                    </div>
                  </div>

                  <p className="mt-8 eyebrow-mono">{mode === "login" ? "Selamat Datang" : "Buat Akun"}</p>
                  <h2 className="mt-3 font-display font-display-lg">
                    {mode === "login" ? "Masuk Dulu." : "Daftar Cepat."}
                  </h2>
                  <p className="mt-3 body-md">{mode === "login" ? "Lanjut ke dashboard kamu." : "Kurang dari satu menit, tanpa kartu kredit."}</p>

                  <div className="mt-8 space-y-6">
                    {mode === "register" && (
                      <div>
                        <label className="mono-xs text-[var(--ink-mute)]">Nama Lengkap</label>
                        <div className="relative mt-2">
                          <UserIcon size={16} className="pointer-events-none absolute left-1 top-3.5 text-[var(--ink-mute)]" />
                          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="auth-input !pl-7" placeholder="Nama yang tampil di profil" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="mono-xs text-[var(--ink-mute)]">Email</label>
                      <div className="relative mt-2">
                        <Mail size={16} className="pointer-events-none absolute left-1 top-3.5 text-[var(--ink-mute)]" />
                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="auth-input !pl-7" placeholder="nama@email.com" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="mono-xs text-[var(--ink-mute)]">Password</label>
                        {mode === "login" && <button type="button" className="mono-xs text-[var(--accent)] hover:underline">Lupa?</button>}
                      </div>
                      <div className="relative mt-2">
                        <Lock size={16} className="pointer-events-none absolute left-1 top-3.5 text-[var(--ink-mute)]" />
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} className="auth-input !pl-7 !pr-10" placeholder="Minimal 6 karakter" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-3.5 text-[var(--ink-mute)] transition hover:text-[var(--accent)]">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-start gap-2.5 border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--accent-2)]">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
                    </motion.p>
                  )}

                  <button disabled={loading} type="submit" className="btn-accent mt-8 w-full !py-4 disabled:opacity-60">
                    {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--ink)]" /> : <>{mode === "login" ? "Masuk ke Dashboard" : "Buat Akun"} <ArrowRight size={15} /></>}
                  </button>

                  <p className="mt-6 text-center text-[13px] text-[var(--ink-mute)]">
                    {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
                    <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-bold text-[var(--accent)] hover:underline">
                      {mode === "login" ? "Daftar sekarang" : "Masuk"}
                    </button>
                  </p>

                  <div className="mt-8 flex items-start gap-3 border-t border-[var(--line)] pt-6">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--green)]" />
                    <p className="text-[12px] leading-relaxed text-[var(--ink-mute)]">
                      Mode demo — isi apa saja untuk lanjut. Data sesi tersimpan di perangkat ini saja.
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  );
}
