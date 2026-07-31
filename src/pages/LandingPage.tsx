import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { UserRole } from "../auth/AuthContext";

interface Props {
  onAuth: (mode: "login" | "register", role?: UserRole) => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: .7, ease: "easeOut" as const },
};

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: .12 } },
  viewport: { once: true, margin: "-60px" },
};

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] pulse-dot" />
      <span className="font-display text-[22px] tracking-[.02em] text-[var(--ink)]">BagasiShare</span>
    </a>
  );
}

function Header({ onAuth }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--cream)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#peran" className="mono-sm text-[var(--ink-soft)] transition hover:text-[var(--ink)]">Peran</a>
          <a href="#skema" className="mono-sm text-[var(--ink-soft)] transition hover:text-[var(--ink)]">Skema</a>
          <a href="#bukti" className="mono-sm text-[var(--ink-soft)] transition hover:text-[var(--ink)]">Verifikasi</a>
        </nav>
        <div className="flex items-center gap-4">
          <button onClick={() => onAuth("login")} className="btn-ghost hidden sm:inline-flex">Masuk</button>
          <button onClick={() => onAuth("register")} className="btn-ink">Daftar</button>
        </div>
      </div>
    </header>
  );
}

function CheckoutReceipt() {
  const rows: [string, string][] = [
    ["Harga Barang", "Rp 265.000"],
    ["Fee Bagasi", "Rp 90.000"],
    ["Biaya Paxel (Rumah→Hub)", "Rp 18.000"],
    ["Biaya JNE (Hub→Kamu)", "Rp 27.000"],
    ["Platform Fee", "Rp 34.500"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, rotate: 6, y: 28 }}
      animate={{ opacity: 1, rotate: 2, y: 0 }}
      transition={{ duration: .9, ease: "easeOut" as const, delay: .25 }}
      whileHover={{ rotate: 0, y: -4 }}
      className="tilt-card relative mx-auto w-full max-w-[460px] p-7 sm:p-8"
    >
      <div className="flex items-start justify-between">
        <p className="mono-xs text-[var(--ink)]">Rincian Checkout</p>
        <span className="mono-xs rounded-full border border-[var(--line-strong)] bg-[var(--cream)] px-3 py-1 text-[var(--ink-soft)]">Skema Hub</span>
      </div>
      <div className="my-4 h-[1.5px] w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--ink) 0 6px, transparent 6px 12px)" }} />
      <ul className="space-y-2.5">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-baseline justify-between gap-3 mono-sm">
            <span className="text-[var(--ink-soft)]">{k}</span>
            <span className="text-[var(--ink)] tabular-nums">{v}</span>
          </li>
        ))}
      </ul>
      <div className="my-4 h-[1.5px] w-full bg-[var(--ink)]" />
      <div className="flex items-baseline justify-between">
        <p className="font-display font-display-sm text-[var(--ink)]">Total</p>
        <p className="font-display font-display-md text-[var(--accent)]">Rp 434.500</p>
      </div>
      <div className="pointer-events-none absolute -bottom-3 left-6 right-6 h-3 rounded-b bg-[var(--ink)]/10 blur-md" />
    </motion.div>
  );
}

function Hero({ onAuth }: Props) {
  return (
    <section className="relative overflow-hidden">
      {/* ambient grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.04]" style={{ backgroundImage: "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)", backgroundSize: "84px 84px" }} />
      <div className="relative mx-auto grid max-w-[1280px] gap-16 px-6 py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:gap-12 lg:px-12 lg:py-28">
        <motion.div {...fadeUp}>
          <p className="eyebrow-mono">Ekosistem Jastip Australia ⇄ Indonesia</p>
          <h1 className="mt-6 font-display font-display-xl">
            <span className="block text-[var(--ink)]">Bagasi Kosong Lo,</span>
            <span className="block text-[var(--accent)]">Rejeki Orang Lain.</span>
          </h1>
          <p className="mt-8 max-w-[34rem] body-lg">
            BagasiShare menghubungkan tiga peran: <b className="font-bold text-[var(--ink)]">Merchant</b> yang jual apa pun — stok massal dari Australia atau barang pribadi satuan, <b className="font-bold text-[var(--ink)]">Traveler</b> yang punya sisa kuota bagasi, dan <b className="font-bold text-[var(--ink)]">Customer</b> yang belanja dengan rincian biaya transparan sejak awal. Semua transaksi diverifikasi foto dan dana dijamin lewat sistem escrow otomatis.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button onClick={() => onAuth("register", "traveler")} className="btn-accent">
              Jadi Traveler <ArrowRight size={15} />
            </button>
            <button onClick={() => onAuth("register", "customer")} className="btn-outline">
              Belanja / Titip Barang
            </button>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-3">
            <div>
              <p className="font-display text-[28px] leading-none text-[var(--ink)]">12%</p>
              <p className="mono-xs mt-1 text-[var(--ink-mute)]">Platform Fee</p>
            </div>
            <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
            <div>
              <p className="font-display text-[28px] leading-none text-[var(--ink)]">3</p>
              <p className="mono-xs mt-1 text-[var(--ink-mute)]">Checkpoint Foto</p>
            </div>
            <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
            <div>
              <p className="font-display text-[28px] leading-none text-[var(--ink)]">2</p>
              <p className="mono-xs mt-1 text-[var(--ink-mute)]">Skema Routing</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6, delay: .1 }}>
          <CheckoutReceipt />
        </motion.div>
      </div>
    </section>
  );
}

function RolesSection({ onAuth }: Props) {
  const roles = [
    { num: "01", name: "Merchant", desc: "Jual apa pun — stok ready Australia atau barang pribadi satu-dua pcs. Etalase digital, konsolidasi kargo otomatis, tanpa perlu mikir logistik.", action: () => onAuth("register", "reseller"), cta: "Jadi Merchant", active: false },
    { num: "02", name: "Traveler", desc: "Buka slot bagasi kosong penerbanganmu buat penghasilan tambahan, tanpa perlu mikirin alur logistik ribet.", action: () => onAuth("register", "traveler"), cta: "Jadi Traveler", active: true },
    { num: "03", name: "Customer", desc: "Belanja barang autentik Australia atau titip barang personal dengan kalkulasi total biaya yang transparan sejak sebelum checkout.", action: () => onAuth("register", "customer"), cta: "Mulai Belanja", active: false },
  ];
  return (
    <section id="peran" className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28">
      <motion.div {...fadeUp}>
        <p className="eyebrow-mono">Tiga Peran Utama</p>
        <h2 className="mt-4 font-display font-display-lg">Satu Ekosistem, Semua Untung.</h2>
      </motion.div>
      <motion.div {...stagger} className="mt-14 grid gap-5 md:grid-cols-3">
        {roles.map((r) => (
          <motion.button
            key={r.num}
            variants={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } }}
            onClick={r.action}
            className={`paper-card group relative overflow-hidden p-7 text-left ${r.active ? "feature-card-active" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="mono-sm text-[var(--ink-mute)]">{r.num}</span>
              <ArrowUpRight size={16} className="text-[var(--ink-faint)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]" />
            </div>
            <h3 className="mt-6 font-display font-display-md">{r.name}</h3>
            <p className="mt-3 body-md">{r.desc}</p>
            <div className="mt-6 inline-flex items-center gap-1.5 mono-xs text-[var(--accent)]">
              {r.cta} <ArrowRight size={12} className="transition group-hover:translate-x-1" />
            </div>
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}

function RoutingSection() {
  const schemas = [
    {
      tag: "Skema A — Hub Transit", accent: false,
      when: "Dipakai jika kota landing ≠ kota customer.",
      steps: [
        ["Traveler landing & pulang ke rumah", ""],
        ["Request pickup Paxel", "dari rumah ke Hub Transit (Jabodetabek)"],
        ["QC & repacking di Hub", "cetak label JNE otomatis"],
        ["JNE antar ke alamat customer", ""],
      ],
    },
    {
      tag: "Skema B — Direct Local", accent: true,
      when: "Dipakai jika kota landing = kota customer.",
      steps: [
        ["Traveler landing di kota yang sama dengan customer", ""],
        ["Verifikasi digital", "foto barang + struk asli"],
        ["Kirim langsung via kurir lokal", ""],
        ["Tidak perlu mampir Hub", "lebih cepat"],
      ],
    },
  ];
  return (
    <section id="skema" className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28">
      <div className="hairline-strong" />
      <motion.div {...fadeUp} className="pt-16">
        <p className="eyebrow-mono">Smart Routing</p>
        <h2 className="mt-4 max-w-3xl font-display font-display-lg">Dua Skema Pengiriman Otomatis.</h2>
        <p className="mt-6 max-w-xl body-lg">Sistem otomatis memilih jalur tercepat berdasarkan kota landing traveler dan kota tujuan customer — tanpa perlu kamu mikir.</p>
      </motion.div>
      <motion.div {...stagger} className="mt-14 grid gap-5 md:grid-cols-2">
        {schemas.map((s) => (
          <motion.div
            key={s.tag}
            variants={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } }}
            className="paper-card p-7 lg:p-8"
          >
            <h3 className={`font-display font-display-md ${s.accent ? "text-[var(--accent)]" : "text-[var(--ink)]"}`}>{s.tag}</h3>
            <p className="mt-2 body-md">{s.when}</p>
            <div className="my-6 hairline" />
            <ol className="space-y-0">
              {s.steps.map(([bold, rest], i) => (
                <li key={i} className="flex items-baseline gap-3 border-b border-[var(--line)] py-3.5 last:border-b-0">
                  <span className="mono-sm shrink-0 text-[var(--ink-mute)]">{i + 1}.</span>
                  <p className="body-md"><b className="font-bold text-[var(--ink)]">{bold}</b>{rest ? <span className="text-[var(--ink-soft)]"> — {rest}</span> : null}</p>
                </li>
              ))}
            </ol>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function ProofSection() {
  const checks = [
    { n: "Checkpoint 1", t: "Traveler Upload Bukti Kirim", d: "Foto barang wajib diunggah sebelum boarding, sebagai bukti barang benar dibawa." },
    { n: "Checkpoint 2", t: "QC di Hub (Skema Hub)", d: "Tim Hub memfoto ulang barang saat proses QC & repacking sebelum dikirim JNE." },
    { n: "Checkpoint 3", t: "Customer Upload Bukti Terima", d: "Setelah barang sampai, customer wajib foto sebagai konfirmasi sebelum dana di-split." },
  ];
  return (
    <section id="bukti" className="mx-auto max-w-[1280px] px-6 py-20 lg:px-12 lg:py-28">
      <div className="hairline-strong" />
      <motion.div {...fadeUp} className="pt-16">
        <p className="eyebrow-mono">Verifikasi Foto Bertahap</p>
        <h2 className="mt-4 max-w-3xl font-display font-display-lg">Bukti di Setiap Titik Serah Terima.</h2>
      </motion.div>
      <motion.div {...stagger} className="mt-14 grid gap-5 md:grid-cols-3">
        {checks.map((c) => (
          <motion.div
            key={c.n}
            variants={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } }}
            className="ink-card p-7"
          >
            <p className="mono-xs text-[var(--accent)]">{c.n}</p>
            <h3 className="mt-5 font-display font-display-sm text-[var(--cream)]">{c.t}</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--cream)]/65">{c.d}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function FinalCTA({ onAuth }: Props) {
  return (
    <section className="bg-[var(--ink)]">
      <div className="mx-auto max-w-[1280px] px-6 py-24 text-center lg:px-12 lg:py-32">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
          <p className="eyebrow-mono">Mulai Hari Ini</p>
          <h2 className="mx-auto mt-6 max-w-4xl font-display font-display-lg text-[var(--cream)]">
            Bagasi Lo Berangkat Kosong,<br />Kenapa Tidak Bawa Cuan?
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-[var(--cream)]/65">
            Daftar sebagai traveler, customer, atau merchant dalam hitungan menit.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => onAuth("register")} className="btn-accent">
              Daftar Sekarang <ArrowRight size={15} />
            </button>
            <button onClick={() => onAuth("login")} className="btn-ghost !text-[var(--cream)]/80 hover:!text-[var(--accent)]">
              Sudah punya akun? Masuk
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--cream)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between lg:px-12">
        <Logo />
        <p className="mono-xs text-[var(--ink-mute)]">© 2026 BagasiShare — Jastip P2P Australia ⇄ Indonesia</p>
        <div className="flex gap-6 mono-sm text-[var(--ink-soft)]">
          <a href="#peran" className="transition hover:text-[var(--accent)]">Peran</a>
          <a href="#skema" className="transition hover:text-[var(--accent)]">Skema</a>
          <a href="#bukti" className="transition hover:text-[var(--accent)]">Verifikasi</a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage(props: Props) {
  return (
    <main id="top" className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Header {...props} />
      <Hero {...props} />
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12"><div className="hairline-strong" /></div>
      <RolesSection {...props} />
      <RoutingSection />
      <ProofSection />
      <FinalCTA {...props} />
      <Footer />
    </main>
  );
}
