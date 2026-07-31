/**
 * AusMarket — Marketplace Domestik Aussie
 * P2P & UMKM Diaspora Indonesia, sesama di Australia.
 * Modul standalone, bisa diakses dari semua dashboard via nav.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, ShoppingBag, Plus, Search, ArrowLeft, Star, MapPin, Truck, Users,
  CheckCircle2, ShieldAlert, QrCode, Package, Wallet, ArrowRight, Pencil, Trash2,
  Camera, X, ChevronDown, Banknote, BadgeCheck,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  useData,
  AuListing, AuOrder, AuDelivery, AuCategory, AuState,
  AU_STATES, AU_CATEGORIES, AU_DELIVERY_LABELS, AU_ORDER_LABELS, AU_ORDER_COLORS,
  AU_PLATFORM_FEE, AU_PLATFORM_FEE_MIN, AU_PLATFORM_FEE_MAX,
} from "../data/store";
import { useToast } from "../components/Toast";
import { Pill, Field, TextInput, TextArea, SelectInput, EmptyState, PrimaryBtn, GhostBtn, Modal } from "../components/ui";

/* ============ helpers ============ */
const aud = (n: number) => `AUD ${n.toFixed(2)}`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

const CONDITION_LABEL: Record<string, string> = { new: "Baru", used: "Preloved" };

const DELIVERY_ICONS: Record<AuDelivery, typeof Truck> = {
  auspost: Truck, sendle: Package, meetup: Users,
};

const STATE_SHORT: Record<string, string> = {
  "NSW – Sydney": "SYD", "VIC – Melbourne": "MEL", "QLD – Brisbane": "BNE",
  "WA – Perth": "PER", "SA – Adelaide": "ADL", "ACT – Canberra": "CBR",
  "NT – Darwin": "DWN", "TAS – Hobart": "HOB",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.onerror = j; fr.readAsDataURL(file); });
}

/* ============ sub-view enum ============ */
type View = "browse" | "my_listings" | "my_orders" | "my_sales" | "seller_profile";

/* ============ listing card ============ */
function ListingCard({ listing, onBuy, onDetail, isMine, onEdit, onDelete }: {
  listing: AuListing;
  onBuy?: () => void;
  onDetail: () => void;
  isMine?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="paper-card flex flex-col overflow-hidden">
      <button onClick={onDetail} className="relative grid h-44 w-full place-items-center overflow-hidden bg-[var(--paper-2)]">
        {listing.photos[0]
          ? <img src={listing.photos[0]} alt={listing.title} className="h-full w-full object-cover" />
          : <ShoppingBag size={44} className="text-[var(--ink-faint)]" strokeWidth={1.25} />
        }
        <span className="absolute left-3 top-3 bg-[var(--ink)] px-2 py-0.5 mono-xs text-[var(--cream)]">{STATE_SHORT[listing.state] ?? listing.state}</span>
        {listing.condition === "used" && <span className="absolute right-3 top-3 bg-[var(--accent)] px-2 py-0.5 mono-xs text-[var(--ink)]">PRELOVED</span>}
      </button>
      <div className="flex flex-1 flex-col p-5">
        <span className="mono-xs text-[var(--ink-mute)]">{listing.category}</span>
        <button onClick={onDetail} className="mt-2 text-left">
          <h3 className="font-display text-[18px] leading-tight text-[var(--ink)] hover:text-[var(--accent)] transition">{listing.title}</h3>
        </button>
        <p className="mt-1 mono-xs text-[var(--ink-mute)]">oleh {listing.sellerName}</p>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="font-display text-[22px] text-[var(--accent)]">{aud(listing.priceAUD)}</p>
          <p className="mono-xs text-[var(--ink-faint)]">stok {listing.stock}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {listing.deliveries.map((d) => { const DI = DELIVERY_ICONS[d]; return <span key={d} className="inline-flex items-center gap-1 border border-[var(--line-strong)] px-2 py-1 mono-xs text-[var(--ink-mute)]"><DI size={11} />{AU_DELIVERY_LABELS[d]}</span>; })}
        </div>
        <div className="mt-5 flex gap-2">
          {isMine ? (
            <>
              <GhostBtn onClick={onEdit} className="flex-1 !py-2.5"><Pencil size={13} /> Edit</GhostBtn>
              <GhostBtn onClick={onDelete} className="flex-1 !py-2.5 !border-red-400/50 !text-[#B23A48]"><Trash2 size={13} /> Hapus</GhostBtn>
            </>
          ) : (
            <>
              <GhostBtn onClick={onDetail} className="flex-1 !py-2.5">Detail</GhostBtn>
              {listing.stock > 0 && <PrimaryBtn onClick={onBuy} className="flex-1 !py-2.5 !text-[13px]"><ShoppingBag size={13} /> Beli</PrimaryBtn>}
              {listing.stock === 0 && <span className="flex flex-1 items-center justify-center mono-xs text-[var(--ink-faint)] border border-[var(--line-strong)] py-2.5">HABIS</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ MAIN COMPONENT ============ */
export default function AusMarket({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const {
    state,
    auCreateListing, auUpdateListing, auDeleteListing,
    auBuyNow, auVerifyPin, auConfirmShipping, auBuyerConfirmReceived,
    auDisputeOrder, auSaveSellerProfile,
  } = useData();
  const toast = useToast();

  const [view, setView] = useState<View>("browse");
  const [stateFilter, setStateFilter] = useState<string>("Semua");
  const [catFilter, setCatFilter] = useState<string>("Semua");
  const [qSearch, setQSearch] = useState("");
  const [condFilter, setCondFilter] = useState<string>("Semua");
  const [detailListing, setDetailListing] = useState<AuListing | null>(null);

  // Buy modal
  const [buyTarget, setBuyTarget] = useState<AuListing | null>(null);
  const [buyDelivery, setBuyDelivery] = useState<AuDelivery>("auspost");
  const [buyAddress, setBuyAddress] = useState("");

  // PIN verify
  const [pinOrder, setPinOrder] = useState<AuOrder | null>(null);
  const [pinValue, setPinValue] = useState("");

  // Dispute
  const [disputeOrder, setDisputeOrder] = useState<AuOrder | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Tracking
  const [trackOrder, setTrackOrder] = useState<AuOrder | null>(null);
  const [trackingNo, setTrackingNo] = useState("");

  // Listing form
  const [listingModal, setListingModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [lTitle, setLTitle] = useState("");
  const [lDesc, setLDesc] = useState("");
  const [lCat, setLCat] = useState<AuCategory>("Makanan & Frozen");
  const [lPrice, setLPrice] = useState("20");
  const [lStock, setLStock] = useState("5");
  const [lWeight, setLWeight] = useState("0.5");
  const [lCondition, setLCondition] = useState<"new" | "used">("new");
  const [lState, setLState] = useState<AuState>("VIC – Melbourne");
  const [lDeliveries, setLDeliveries] = useState<AuDelivery[]>(["auspost"]);
  const [lPhotos, setLPhotos] = useState<string[]>([]);

  // Seller profile form
  const [profModal, setProfModal] = useState(false);
  const [profStore, setProfStore] = useState("");
  const [profDesc, setProfDesc] = useState("");
  const [profState, setProfState] = useState<AuState>("VIC – Melbourne");
  const [profBsb, setProfBsb] = useState("");
  const [profAcc, setProfAcc] = useState("");
  const [profAccName, setProfAccName] = useState("");

  if (!user) return null;

  const myProfile = state.auSellerProfiles.find((p) => p.userId === user.id);

  const filteredListings = useMemo(() => {
    return state.auListings.filter((l) => {
      if (l.status !== "active") return false;
      if (stateFilter !== "Semua" && l.state !== stateFilter) return false;
      if (catFilter !== "Semua" && l.category !== catFilter) return false;
      if (condFilter !== "Semua" && (condFilter === "new" ? l.condition !== "new" : l.condition !== "used")) return false;
      if (qSearch && !l.title.toLowerCase().includes(qSearch.toLowerCase()) && !l.sellerName.toLowerCase().includes(qSearch.toLowerCase())) return false;
      return true;
    });
  }, [state.auListings, stateFilter, catFilter, condFilter, qSearch]);

  const myListings = state.auListings.filter((l) => l.sellerId === user.id);
  const myOrders = state.auOrders.filter((o) => o.buyerId === user.id);
  const mySales = state.auOrders.filter((o) => o.sellerId === user.id);

  const totalSalesAUD = myProfile?.totalSalesAUD ?? 0;
  const pendingPayoutAUD = mySales.filter((o) => o.status === "shipped" || o.status === "escrow_held").reduce((a, o) => a + o.sellerPayoutAUD, 0);

  function openCreateListing() {
    setLTitle(""); setLDesc(""); setLCat("Makanan & Frozen"); setLPrice("20"); setLStock("5");
    setLWeight("0.5"); setLCondition("new"); setLState("VIC – Melbourne"); setLDeliveries(["auspost"]); setLPhotos([]);
    setEditId(null); setListingModal("create");
  }

  function openEditListing(l: AuListing) {
    setLTitle(l.title); setLDesc(l.desc); setLCat(l.category); setLPrice(String(l.priceAUD)); setLStock(String(l.stock));
    setLWeight(String(l.weight ?? 0.5)); setLCondition(l.condition); setLState(l.state); setLDeliveries([...l.deliveries]); setLPhotos([...l.photos]);
    setEditId(l.id); setListingModal("edit");
  }

  function submitListing() {
    if (!lTitle.trim() || !lDesc.trim()) return void toast.push("Judul & deskripsi wajib diisi.", "err");
    if (!myProfile && listingModal === "create") return void toast.push("Lengkapi Seller Profile dulu sebelum listing.", "err");
    const data = { title: lTitle.trim(), desc: lDesc.trim(), category: lCat, priceAUD: Number(lPrice), stock: Number(lStock), weight: Number(lWeight), condition: lCondition, state: lState, deliveries: lDeliveries, photos: lPhotos };
    if (listingModal === "create") {
      auCreateListing(user!, data);
      toast.push("Listing berhasil dipublikasikan ke AusMarket.");
    } else if (editId) {
      auUpdateListing(editId, data);
      toast.push("Listing diperbarui.");
    }
    setListingModal(null);
  }

  function submitBuy() {
    if (!buyTarget) return;
    if (buyDelivery !== "meetup" && !buyAddress.trim()) return void toast.push("Isi alamat pengiriman.", "err");
    const res = auBuyNow(user!, buyTarget, buyDelivery, buyAddress);
    toast.push(res.message, res.ok ? "ok" : "err");
    if (res.ok) { setBuyTarget(null); setBuyAddress(""); setView("my_orders"); }
  }

  function submitPin() {
    if (!pinOrder) return;
    const res = auVerifyPin(user!, pinOrder.id, pinValue);
    toast.push(res.message, res.ok ? "ok" : "err");
    if (res.ok) { setPinOrder(null); setPinValue(""); }
  }

  function submitTracking() {
    if (!trackOrder || !trackingNo.trim()) return void toast.push("Nomor resi wajib diisi.", "err");
    auConfirmShipping(user!, trackOrder.id, trackingNo);
    toast.push(`Resi ${trackingNo} dikonfirmasi. Buyer bisa pantau pengiriman.`);
    setTrackOrder(null); setTrackingNo("");
  }

  function submitDispute() {
    if (!disputeOrder || !disputeReason.trim()) return void toast.push("Alasan sengketa wajib diisi.", "err");
    auDisputeOrder(user!, disputeOrder.id, disputeReason);
    toast.push("Sengketa dibuka. Tim admin akan meninjau kasusmu.");
    setDisputeOrder(null); setDisputeReason("");
  }

  function saveProfie() {
    if (!profStore.trim()) return void toast.push("Nama toko wajib diisi.", "err");
    if (!profBsb.trim() || !profAcc.trim()) return void toast.push("BSB & Account Number wajib diisi untuk payout.", "err");
    auSaveSellerProfile(user!, { storeName: profStore, storeDesc: profDesc, state: profState, bsb: profBsb, accountNo: profAcc, accountName: profAccName || user!.name });
    toast.push("Seller profile disimpan.");
    setProfModal(false);
  }

  function openProfModal() {
    setProfStore(myProfile?.storeName ?? user!.name);
    setProfDesc(myProfile?.storeDesc ?? "");
    setProfState(myProfile?.state ?? "VIC – Melbourne");
    setProfBsb(myProfile?.bsb ?? "");
    setProfAcc(myProfile?.accountNo ?? "");
    setProfAccName(myProfile?.accountName ?? user!.name);
    setProfModal(true);
  }

  async function handleListingPhoto(file: File) {
    if (!file.type.startsWith("image/")) return void toast.push("File harus gambar.", "err");
    if (file.size > 800 * 1024) return void toast.push("Maksimal 800KB.", "err");
    const url = await fileToDataUrl(file);
    setLPhotos((p) => [...p, url]);
  }

  // TOP NAV
  const TABS: { id: View; label: string; icon: typeof Store }[] = [
    { id: "browse", label: "Jelajah", icon: Search },
    { id: "my_orders", label: "Pembelianku", icon: ShoppingBag },
    { id: "my_listings", label: "Listingku", icon: Store },
    { id: "my_sales", label: "Penjualanku", icon: Wallet },
    { id: "seller_profile", label: "Seller Profile", icon: BadgeCheck },
  ];

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--cream)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-5 lg:px-10">
          <button onClick={onBack} className="inline-flex items-center gap-2 mono-xs text-[var(--ink-mute)] transition hover:text-[var(--accent)]">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div className="h-5 w-px bg-[var(--line-strong)]" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] pulse-dot" />
            <span className="font-display text-[20px] tracking-[.01em]">AusMarket</span>
            <span className="mono-xs bg-[var(--ink)] text-[var(--cream)] px-2 py-0.5 ml-1">AU-ONLY</span>
          </div>
          <div className="ml-auto hidden items-center gap-6 md:flex">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setView(t.id)} className={`flex items-center gap-1.5 mono-xs transition border-b-2 pb-0.5 ${view === t.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--ink-mute)] hover:text-[var(--ink)]"}`}>
                <t.icon size={12} />{t.label}
              </button>
            ))}
          </div>
          <PrimaryBtn onClick={openCreateListing} className="ml-auto md:ml-0 !py-2.5 !text-[12px]">
            <Plus size={14} /> Listing Baru
          </PrimaryBtn>
        </div>
        {/* Mobile tabs */}
        <div className="flex overflow-x-auto border-t border-[var(--line)] md:hidden">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setView(t.id)} className={`flex shrink-0 items-center gap-1.5 px-4 py-3 mono-xs border-b-2 transition ${view === t.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--ink-mute)]"}`}>
              <t.icon size={11} />{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-8 lg:px-10 lg:py-10">
        <AnimatePresence mode="wait">

          {/* ============================== BROWSE ============================== */}
          {view === "browse" && (
            <motion.div key="browse" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-7">
              {/* Hero */}
              <div className="border border-[var(--line-strong)] bg-[var(--ink)] p-7 lg:p-10">
                <p className="eyebrow-mono">Marketplace Domestik Aussie</p>
                <h1 className="mt-4 font-display text-[48px] leading-none text-[var(--cream)] lg:text-[64px]">
                  Jual & Beli Sesama<br />Diaspora Indonesia.
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--cream)]/65">
                  Dari UMKM frozen food sampai barang preloved — semua transaksi dilindungi escrow AUD. Platform fee hanya {pct(AU_PLATFORM_FEE_MIN)}–{pct(AU_PLATFORM_FEE_MAX)}, dibayar dari penjual saat payout.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[var(--cream)]/10 pt-6 sm:grid-cols-4">
                  {[["Escrow AUD", "Via PayID / Card / Osko"], ["Shipping", "AusPost & Sendle otomatis"], ["COD PIN", "4-Digit QR Verification"], ["KYC BSB", "Payout ke rekening AU"]].map(([k, v]) => (
                    <div key={k}><p className="font-display text-[16px] text-[var(--accent)]">{k}</p><p className="mt-0.5 text-[12px] text-[var(--cream)]/55">{v}</p></div>
                  ))}
                </div>
              </div>

              {/* Filter bar */}
              <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] pb-5">
                <div className="min-w-[200px] flex-1">
                  <Field label="Cari Produk / Penjual">
                    <div className="relative">
                      <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]" />
                      <TextInput value={qSearch} onChange={(e) => setQSearch(e.target.value)} placeholder="Rendang, iPhone, kain batik..." className="pl-10" />
                    </div>
                  </Field>
                </div>
                <div className="w-44">
                  <Field label="State / Kota">
                    <div className="relative">
                      <SelectInput value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                        <option value="Semua">Semua State</option>
                        {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </SelectInput>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]" />
                    </div>
                  </Field>
                </div>
                <div className="w-44">
                  <Field label="Kategori">
                    <div className="relative">
                      <SelectInput value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                        <option value="Semua">Semua Kategori</option>
                        {AU_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </SelectInput>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]" />
                    </div>
                  </Field>
                </div>
                <div className="flex gap-2">
                  {["Semua", "new", "used"].map((c) => (
                    <button key={c} onClick={() => setCondFilter(c)} className={`mono-xs border px-3 py-2 transition ${condFilter === c ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)]" : "border-[var(--line-strong)] text-[var(--ink-mute)] hover:border-[var(--ink)]"}`}>
                      {c === "Semua" ? "Semua" : c === "new" ? "Baru" : "Preloved"}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mono-xs text-[var(--ink-mute)]">{filteredListings.length} listing ditemukan</p>

              {filteredListings.length === 0 && <EmptyState icon={ShoppingBag} title="Tidak ada listing yang cocok" desc="Coba ubah filter atau cari kata kunci lain." />}

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredListings.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    onDetail={() => setDetailListing(l)}
                    onBuy={() => { setBuyTarget(l); setBuyDelivery(l.deliveries[0]); setBuyAddress(""); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================== MY ORDERS ============================== */}
          {view === "my_orders" && (
            <motion.div key="my_orders" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-[28px]">Pembelianku</h2>
                <p className="mono-xs text-[var(--ink-mute)]">{myOrders.length} order</p>
              </div>
              {myOrders.length === 0 && <EmptyState icon={ShoppingBag} title="Belum ada pembelian" desc="Jelajah produk dari sesama diaspora Indonesia di Australia." action={<PrimaryBtn onClick={() => setView("browse")}>Jelajah AusMarket</PrimaryBtn>} />}
              <div className="space-y-4">
                {myOrders.map((o) => (
                  <div key={o.id} className="paper-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="mono-xs text-[var(--ink-mute)]">{o.id} · {o.createdAt}</p>
                        <h3 className="mt-1 font-display text-[20px]">{o.listingTitle}</h3>
                        <p className="mono-xs mt-1 text-[var(--ink-mute)]">Penjual: {o.sellerName} · {AU_DELIVERY_LABELS[o.delivery]}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-[22px] text-[var(--accent)]">{aud(o.priceAUD)}</p>
                        <Pill color={AU_ORDER_COLORS[o.status]}>{AU_ORDER_LABELS[o.status]}</Pill>
                      </div>
                    </div>

                    {o.trackingNo && (
                      <div className="mt-4 flex items-center gap-2 bg-[var(--paper-2)] px-4 py-3">
                        <Truck size={14} className="text-[var(--accent)]" />
                        <p className="mono-xs">No. Resi: <b className="text-[var(--ink)]">{o.trackingNo}</b></p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                      {o.status === "ready_pickup" && (
                        <PrimaryBtn onClick={() => { setPinOrder(o); setPinValue(""); }} className="!bg-[var(--green)] hover:!bg-[#23624A]"><QrCode size={14} /> Input PIN Meetup</PrimaryBtn>
                      )}
                      {o.status === "shipped" && (
                        <PrimaryBtn onClick={() => { auBuyerConfirmReceived(user!, o.id); toast.push("Penerimaan dikonfirmasi. Escrow dilepas ke penjual."); }}><CheckCircle2 size={14} /> Konfirmasi Terima Barang</PrimaryBtn>
                      )}
                      {(o.status === "shipped" || o.status === "escrow_held") && (
                        <GhostBtn onClick={() => { setDisputeOrder(o); setDisputeReason(""); }} className="!border-red-400/60 !text-[#B23A48]"><ShieldAlert size={13} /> Buka Sengketa</GhostBtn>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================== MY LISTINGS ============================== */}
          {view === "my_listings" && (
            <motion.div key="my_listings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[28px]">Listingku</h2>
                <PrimaryBtn onClick={openCreateListing}><Plus size={14} /> Listing Baru</PrimaryBtn>
              </div>
              {!myProfile && (
                <div className="border-l-[3px] border-[var(--accent)] bg-[var(--paper)] p-5">
                  <p className="font-bold text-[var(--ink)]">Seller Profile belum lengkap</p>
                  <p className="mt-1 text-[13px] text-[var(--ink-soft)]">Lengkapi nama toko, state, dan rekening bank Australia (BSB & Account Number) untuk bisa listing dan menerima payout.</p>
                  <GhostBtn onClick={openProfModal} className="mt-3"><Banknote size={13} /> Lengkapi Seller Profile</GhostBtn>
                </div>
              )}
              {myListings.length === 0 && <EmptyState icon={Store} title="Belum ada listing" desc="Mulai jual produkmu ke sesama diaspora Indonesia di Australia." action={<PrimaryBtn onClick={openCreateListing}><Plus size={14} /> Buat listing pertama</PrimaryBtn>} />}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {myListings.map((l) => (
                  <ListingCard key={l.id} listing={l} isMine onDetail={() => setDetailListing(l)} onEdit={() => openEditListing(l)} onDelete={() => { auDeleteListing(l.id); toast.push("Listing dihapus.", "info"); }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================== MY SALES ============================== */}
          {view === "my_sales" && (
            <motion.div key="my_sales" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-[28px]">Penjualanku</h2>
                <p className="mono-xs text-[var(--ink-mute)]">{mySales.length} transaksi</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Total Penjualan", value: aud(totalSalesAUD), sub: "Semua waktu (setelah komisi)" },
                  { label: "Pending Payout", value: aud(pendingPayoutAUD), sub: "Menunggu konfirmasi buyer" },
                  { label: "Platform Fee (6%)", value: aud(mySales.reduce((a, o) => a + o.platformFeeAUD, 0)), sub: "Dipotong saat payout" },
                ].map((s) => (
                  <div key={s.label} className="paper-card p-6">
                    <p className="mono-xs text-[var(--ink-mute)]">{s.label}</p>
                    <p className="mt-4 font-display text-[30px] text-[var(--accent)]">{s.value}</p>
                    <p className="mt-1 text-[12px] text-[var(--ink-mute)]">{s.sub}</p>
                  </div>
                ))}
              </div>

              {mySales.length === 0 && <EmptyState icon={Wallet} title="Belum ada penjualan" desc="Buat listing pertamamu dan mulai terima order." action={<PrimaryBtn onClick={() => setView("my_listings")}><Store size={14} /> Ke Listingku</PrimaryBtn>} />}

              <div className="space-y-4">
                {mySales.map((o) => (
                  <div key={o.id} className="paper-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="mono-xs text-[var(--ink-mute)]">{o.id} · {o.createdAt}</p>
                        <h3 className="mt-1 font-display text-[18px]">{o.listingTitle}</h3>
                        <p className="mono-xs mt-1 text-[var(--ink-mute)]">Pembeli: {o.buyerName} · {AU_DELIVERY_LABELS[o.delivery]}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-[20px] text-[var(--accent)]">{aud(o.priceAUD)}</p>
                        <p className="mono-xs text-[var(--ink-mute)]">Payout: {aud(o.sellerPayoutAUD)}</p>
                        <Pill color={AU_ORDER_COLORS[o.status]}>{AU_ORDER_LABELS[o.status]}</Pill>
                      </div>
                    </div>

                    {o.delivery === "meetup" && o.status === "escrow_held" && o.pickupPin && (
                      <div className="mt-4 flex items-center gap-4 border border-[var(--line-strong)] bg-[var(--paper-2)] px-5 py-4">
                        <QrCode size={28} className="shrink-0 text-[var(--ink)]" />
                        <div>
                          <p className="mono-xs text-[var(--ink-mute)]">PIN Meetup untuk Buyer</p>
                          <p className="font-display text-[32px] tracking-[.15em] text-[var(--ink)]">{o.pickupPin}</p>
                          <p className="text-[12px] text-[var(--ink-mute)]">Tunjukkan ke buyer saat meetup. Escrow otomatis cair setelah buyer input PIN.</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                      {o.status === "escrow_held" && o.delivery !== "meetup" && (
                        <PrimaryBtn onClick={() => { setTrackOrder(o); setTrackingNo(""); }}><Truck size={14} /> Input No. Resi & Kirim</PrimaryBtn>
                      )}
                      {o.status === "escrow_held" && o.delivery === "meetup" && (
                        <span className="mono-xs flex items-center gap-2 text-[var(--ink-mute)]"><QrCode size={14} /> Tunjukkan PIN di atas ke buyer saat meetup</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================== SELLER PROFILE ============================== */}
          {view === "seller_profile" && (
            <motion.div key="seller_profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[28px]">Seller Profile & KYC</h2>
                <PrimaryBtn onClick={openProfModal}><Pencil size={14} /> Edit Profile</PrimaryBtn>
              </div>

              {!myProfile ? (
                <div className="paper-card p-8 text-center">
                  <BadgeCheck size={48} className="mx-auto text-[var(--ink-faint)]" strokeWidth={1.25} />
                  <h3 className="mt-5 font-display text-[22px]">Seller Profile Belum Dibuat</h3>
                  <p className="mt-3 max-w-sm mx-auto text-[14px] text-[var(--ink-mute)] leading-relaxed">Buat seller profile untuk mulai listing dan menerima payout AUD ke rekening bankmu di Australia.</p>
                  <PrimaryBtn onClick={openProfModal} className="mx-auto mt-6"><Banknote size={14} /> Buat Seller Profile</PrimaryBtn>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
                  <div className="paper-card p-7">
                    <div className="flex items-start gap-5">
                      <span className="grid h-16 w-16 place-items-center bg-[var(--ink)] font-display text-[28px] text-[var(--cream)]">{myProfile.storeName.charAt(0)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-[24px]">{myProfile.storeName}</h3>
                          {myProfile.kycVerified && <BadgeCheck size={18} className="text-[var(--green)]" />}
                        </div>
                        <p className="mono-xs mt-1 text-[var(--ink-mute)]"><MapPin size={11} className="inline mr-1" />{myProfile.state}</p>
                        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink-soft)]">{myProfile.storeDesc || "—"}</p>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-5">
                      {[["Total Penjualan", aud(myProfile.totalSalesAUD)], ["Rating", `${myProfile.rating > 0 ? myProfile.rating.toFixed(1) : "—"} ★`], ["Review", `${myProfile.reviewCount} ulasan`]].map(([k, v]) => (
                        <div key={k as string}><p className="mono-xs text-[var(--ink-mute)]">{k}</p><p className="mt-2 font-display text-[20px] text-[var(--ink)]">{v}</p></div>
                      ))}
                    </div>
                  </div>

                  <div className="paper-card p-7">
                    <p className="mono-xs text-[var(--ink-mute)]">KYC — Rekening Payout AUD</p>
                    <div className="mt-5 space-y-4">
                      {[["BSB", myProfile.bsb || "—"], ["Account Number", myProfile.accountNo || "—"], ["Account Name", myProfile.accountName || "—"]].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between border-b border-[var(--line)] pb-3.5">
                          <span className="mono-xs text-[var(--ink-mute)]">{k}</span>
                          <span className="mono-sm font-bold text-[var(--ink)]">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-[var(--line)] pt-4">
                      {myProfile.kycVerified
                        ? <p className="flex items-center gap-2 mono-xs text-[var(--green)]"><BadgeCheck size={14} /> KYC Terverifikasi — payout aktif</p>
                        : <p className="flex items-center gap-2 mono-xs text-[var(--accent)]"><ShieldAlert size={14} /> Menunggu verifikasi admin (1–2 hari kerja)</p>
                      }
                    </div>
                    <p className="mt-4 text-[12px] leading-relaxed text-[var(--ink-mute)]">
                      Payout dipotong platform fee {pct(AU_PLATFORM_FEE_MIN)}–{pct(AU_PLATFORM_FEE_MAX)} per transaksi. Pencairan otomatis ke BSB/Account di atas setelah buyer konfirmasi penerimaan barang.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ======================== MODALS ======================== */}

      {/* Detail Listing */}
      <Modal open={!!detailListing} onClose={() => setDetailListing(null)} title={detailListing?.title ?? ""} maxW="max-w-2xl">
        {detailListing && (
          <div className="space-y-5">
            {detailListing.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detailListing.photos.map((ph, i) => <img key={i} src={ph} alt={`foto ${i + 1}`} className="h-32 w-full rounded object-cover" />)}
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="mono-xs text-[var(--ink-mute)]">{detailListing.category} · {CONDITION_LABEL[detailListing.condition]}</span>
                <h3 className="mt-1 font-display text-[26px]">{detailListing.title}</h3>
                <p className="mt-1 flex items-center gap-1 mono-xs text-[var(--ink-mute)]"><MapPin size={11} />{detailListing.state}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-[28px] text-[var(--accent)]">{aud(detailListing.priceAUD)}</p>
                <p className="mono-xs text-[var(--ink-mute)]">stok {detailListing.stock}</p>
              </div>
            </div>
            <div className="border-t border-[var(--line)] pt-4">
              <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">{detailListing.desc}</p>
            </div>
            <div>
              <p className="mb-2 mono-xs text-[var(--ink-mute)]">Metode pengiriman</p>
              <div className="flex flex-wrap gap-2">
                {detailListing.deliveries.map((d) => { const DI = DELIVERY_ICONS[d]; return <span key={d} className="inline-flex items-center gap-1.5 border border-[var(--line-strong)] px-3 py-2 mono-xs"><DI size={12} />{AU_DELIVERY_LABELS[d]}</span>; })}
              </div>
            </div>
            {/* Seller info */}
            {(() => { const sp = state.auSellerProfiles.find((p) => p.userId === detailListing.sellerId); return sp ? (
              <div className="flex items-center gap-4 border-t border-[var(--line)] pt-4">
                <span className="grid h-12 w-12 place-items-center bg-[var(--ink)] font-display text-[20px] text-[var(--cream)]">{sp.storeName.charAt(0)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5"><p className="font-bold text-[var(--ink)]">{sp.storeName}</p>{sp.kycVerified && <BadgeCheck size={14} className="text-[var(--green)]" />}</div>
                  <div className="flex items-center gap-1 mono-xs text-[var(--ink-mute)]"><Star size={10} fill="currentColor" className="text-amber-500" />{sp.rating > 0 ? sp.rating.toFixed(1) : "Baru"} · {sp.reviewCount} ulasan · {sp.state}</div>
                </div>
              </div>
            ) : null; })()}
            {detailListing.sellerId !== user.id && detailListing.stock > 0 && (
              <PrimaryBtn onClick={() => { setDetailListing(null); setBuyTarget(detailListing); setBuyDelivery(detailListing.deliveries[0]); setBuyAddress(""); }} className="w-full !py-4">
                Beli Sekarang — {aud(detailListing.priceAUD)} <ArrowRight size={15} />
              </PrimaryBtn>
            )}
          </div>
        )}
      </Modal>

      {/* Buy modal */}
      <Modal open={!!buyTarget} onClose={() => setBuyTarget(null)} title="Checkout">
        {buyTarget && (
          <div className="space-y-5">
            <div className="bg-[var(--paper-2)] p-4">
              <p className="font-display text-[20px]">{buyTarget.title}</p>
              <p className="mono-xs mt-1 text-[var(--ink-mute)]">{buyTarget.sellerName} · {buyTarget.state}</p>
            </div>

            <Field label="Metode Pengiriman">
              <div className="grid gap-2 sm:grid-cols-3">
                {buyTarget.deliveries.map((d) => { const DI = DELIVERY_ICONS[d]; return (
                  <button key={d} onClick={() => setBuyDelivery(d)} className={`flex flex-col items-center gap-1.5 border p-3 transition ${buyDelivery === d ? "border-[var(--ink)] bg-[var(--paper-2)]" : "border-[var(--line-strong)] hover:border-[var(--ink)]"}`}>
                    <DI size={18} className={buyDelivery === d ? "text-[var(--accent)]" : "text-[var(--ink-mute)]"} />
                    <span className="mono-xs text-center">{AU_DELIVERY_LABELS[d]}</span>
                  </button>
                ); })}
              </div>
            </Field>

            {buyDelivery !== "meetup" && (
              <Field label="Alamat Pengiriman (Australia)">
                <TextArea value={buyAddress} onChange={(e) => setBuyAddress(e.target.value)} placeholder="cth: 12 Collins St, Melbourne VIC 3000" rows={2} />
              </Field>
            )}
            {buyDelivery === "meetup" && (
              <div className="border-l-[3px] border-[var(--accent)] bg-[var(--paper-2)] p-4 text-[13px] leading-relaxed">
                <p className="font-bold text-[var(--ink)]">COD Meetup dengan PIN Verification</p>
                <p className="mt-1 text-[var(--ink-mute)]">Setelah bayar, kamu akan mendapat PIN 4-digit. Tunjukkan ke penjual saat meetup. Escrow otomatis cair begitu PIN diverifikasi.</p>
              </div>
            )}

            <div className="space-y-2 border-t border-[var(--line)] pt-4 text-[13px]">
              <div className="flex justify-between"><span className="text-[var(--ink-mute)]">Harga barang</span><b>{aud(buyTarget.priceAUD)}</b></div>
              <div className="flex justify-between"><span className="text-[var(--ink-mute)]">Escrow fee (Stripe AUD)</span><b>AUD 0.30 + 1.75%</b></div>
              <div className="flex justify-between border-t border-[var(--line)] pt-2 font-bold"><span>Total bayar</span><span className="font-display text-[20px] text-[var(--accent)]">{aud(buyTarget.priceAUD)}</span></div>
            </div>

            <PrimaryBtn onClick={submitBuy} className="w-full !py-4">Bayar & Tahan Escrow <ArrowRight size={15} /></PrimaryBtn>
            <p className="text-center text-[11px] text-[var(--ink-mute)]">Dana ditahan escrow AUD — cair ke penjual setelah barang diterima atau PIN meetup diverifikasi.</p>
          </div>
        )}
      </Modal>

      {/* PIN Verify modal */}
      <Modal open={!!pinOrder} onClose={() => setPinOrder(null)} title="Input PIN Meetup">
        {pinOrder && (
          <div className="space-y-5">
            <div className="bg-[var(--paper-2)] p-4">
              <p className="font-display text-[18px]">{pinOrder.listingTitle}</p>
              <p className="mono-xs mt-1 text-[var(--ink-mute)]">Penjual: {pinOrder.sellerName}</p>
            </div>
            <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">Minta PIN 4 digit dari penjual saat meetup. Setelah PIN benar, escrow {aud(pinOrder.priceAUD)} otomatis cair ke penjual.</p>
            <Field label="Kode PIN 4 Digit">
              <TextInput value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/, "").slice(0, 4))} placeholder="0000" className="text-center font-display text-[28px] tracking-[.3em] !py-4" maxLength={4} />
            </Field>
            <PrimaryBtn onClick={submitPin} disabled={pinValue.length !== 4} className="w-full !py-4 !bg-[var(--green)] hover:!bg-[#23624A]"><CheckCircle2 size={15} /> Verifikasi PIN</PrimaryBtn>
          </div>
        )}
      </Modal>

      {/* Tracking confirm modal */}
      <Modal open={!!trackOrder} onClose={() => setTrackOrder(null)} title="Konfirmasi Pengiriman">
        {trackOrder && (
          <div className="space-y-5">
            <p className="bg-[var(--paper-2)] p-4 text-[14px]">Order: <b>{trackOrder.id}</b> — {trackOrder.listingTitle}</p>
            <p className="text-[14px] text-[var(--ink-soft)]">Daftarkan nomor resi {AU_DELIVERY_LABELS[trackOrder.delivery]}. Buyer akan menerima notifikasi dan bisa pantau pengiriman.</p>
            <Field label={`No. Resi (${AU_DELIVERY_LABELS[trackOrder.delivery]})`}>
              <TextInput value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="cth: AP923847561AU" />
            </Field>
            <PrimaryBtn onClick={submitTracking} className="w-full !py-4"><Truck size={15} /> Konfirmasi Pengiriman</PrimaryBtn>
          </div>
        )}
      </Modal>

      {/* Dispute modal */}
      <Modal open={!!disputeOrder} onClose={() => setDisputeOrder(null)} title="Buka Sengketa">
        {disputeOrder && (
          <div className="space-y-5">
            <p className="bg-[var(--paper-2)] p-4 text-[14px]">Order: <b>{disputeOrder.id}</b> — {disputeOrder.listingTitle}</p>
            <Field label="Alasan Sengketa"><TextArea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Barang tidak sesuai / tidak tiba / kondisi rusak..." rows={4} /></Field>
            <PrimaryBtn onClick={submitDispute} className="w-full !py-4 !bg-[#B23A48] hover:!bg-[#8B2C38]"><ShieldAlert size={15} /> Kirim Sengketa</PrimaryBtn>
          </div>
        )}
      </Modal>

      {/* Listing form modal */}
      <Modal open={!!listingModal} onClose={() => setListingModal(null)} title={listingModal === "create" ? "Listing Baru" : "Edit Listing"} maxW="max-w-2xl">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Judul Produk"><TextInput value={lTitle} onChange={(e) => setLTitle(e.target.value)} placeholder="cth: Rendang Padang Frozen 500g" /></Field>
            <Field label="Kategori">
              <SelectInput value={lCat} onChange={(e) => setLCat(e.target.value as AuCategory)}>
                {AU_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </Field>
            <Field label="Harga (AUD)"><TextInput type="number" min="1" value={lPrice} onChange={(e) => setLPrice(e.target.value)} /></Field>
            <Field label="Stok (pcs)"><TextInput type="number" min="0" value={lStock} onChange={(e) => setLStock(e.target.value)} /></Field>
            <Field label="Berat per item (kg)"><TextInput type="number" min="0.1" step="0.1" value={lWeight} onChange={(e) => setLWeight(e.target.value)} /></Field>
            <Field label="Kondisi">
              <SelectInput value={lCondition} onChange={(e) => setLCondition(e.target.value as "new" | "used")}>
                <option value="new">Baru</option>
                <option value="used">Preloved / Second</option>
              </SelectInput>
            </Field>
            <Field label="Kota / State">
              <SelectInput value={lState} onChange={(e) => setLState(e.target.value as AuState)}>
                {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
          </div>
          <Field label="Deskripsi Produk"><TextArea value={lDesc} onChange={(e) => setLDesc(e.target.value)} placeholder="Detail kondisi, cara pembuatan, dll..." rows={4} /></Field>

          <div>
            <p className="mono-xs text-[var(--ink-mute)] mb-2">Metode Pengiriman (pilih lebih dari satu)</p>
            <div className="flex flex-wrap gap-2">
              {(["auspost", "sendle", "meetup"] as AuDelivery[]).map((d) => {
                const active = lDeliveries.includes(d);
                return (
                  <button key={d} onClick={() => setLDeliveries(active ? lDeliveries.filter((x) => x !== d) : [...lDeliveries, d])} className={`inline-flex items-center gap-1.5 border px-3 py-2 mono-xs transition ${active ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)]" : "border-[var(--line-strong)] text-[var(--ink-mute)] hover:border-[var(--ink)]"}`}>
                    {AU_DELIVERY_LABELS[d]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mono-xs text-[var(--ink-mute)] mb-2">Foto Produk (maks. 4)</p>
            <div className="grid grid-cols-4 gap-2">
              {lPhotos.map((ph, i) => (
                <div key={i} className="relative aspect-square overflow-hidden border border-[var(--line-strong)]">
                  <img src={ph} alt={`foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => setLPhotos((p) => p.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 grid h-5 w-5 place-items-center bg-[#B23A48] text-white"><X size={11} /></button>
                </div>
              ))}
              {lPhotos.length < 4 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-[var(--line-strong)] text-[var(--ink-faint)] hover:border-[var(--accent)] transition">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleListingPhoto(f); }} />
                  <Camera size={20} />
                  <span className="mono-xs">Foto</span>
                </label>
              )}
            </div>
          </div>

          {/* Fee preview */}
          <div className="bg-[var(--paper-2)] p-4 text-[13px]">
            <div className="flex justify-between"><span className="text-[var(--ink-mute)]">Harga jual</span><b>{aud(Number(lPrice) || 0)}</b></div>
            <div className="flex justify-between mt-1"><span className="text-[var(--ink-mute)]">Platform fee ({pct(AU_PLATFORM_FEE)})</span><b className="text-[#B23A48]">-{aud((Number(lPrice) || 0) * AU_PLATFORM_FEE)}</b></div>
            <div className="flex justify-between mt-2 border-t border-[var(--line)] pt-2 font-bold"><span>Payout estimasi</span><b className="text-[var(--green)]">{aud((Number(lPrice) || 0) * (1 - AU_PLATFORM_FEE))}</b></div>
          </div>

          <PrimaryBtn onClick={submitListing} className="w-full !py-4">{listingModal === "create" ? "Publikasikan Listing" : "Simpan Perubahan"}</PrimaryBtn>
        </div>
      </Modal>

      {/* Seller Profile modal */}
      <Modal open={profModal} onClose={() => setProfModal(false)} title="Seller Profile & KYC">
        <div className="space-y-5">
          <div className="border-l-[3px] border-[var(--accent)] bg-[var(--paper-2)] p-4 text-[13px] leading-relaxed">
            <p className="font-bold text-[var(--ink)]">KYC Level 4 — Rekening Bank Australia</p>
            <p className="mt-1 text-[var(--ink-mute)]">Data BSB & Account Number diperlukan untuk menerima payout AUD langsung ke rekening bankmu di Australia. Data dienkripsi dan tidak dibagikan ke pihak ketiga.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Toko / Brand"><TextInput value={profStore} onChange={(e) => setProfStore(e.target.value)} placeholder="cth: Dapur Mbak Sri" /></Field>
            <Field label="Kota / State">
              <SelectInput value={profState} onChange={(e) => setProfState(e.target.value as AuState)}>
                {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
          </div>
          <Field label="Deskripsi Toko"><TextArea value={profDesc} onChange={(e) => setProfDesc(e.target.value)} placeholder="Ceritakan apa yang kamu jual, sejak kapan, dll." rows={3} /></Field>

          <div className="border-t border-[var(--line)] pt-5">
            <p className="mb-4 mono-xs text-[var(--ink-mute)]">Rekening Bank Australia (untuk payout AUD)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="BSB Number"><TextInput value={profBsb} onChange={(e) => setProfBsb(e.target.value)} placeholder="cth: 063-000" /></Field>
              <Field label="Account Number"><TextInput value={profAcc} onChange={(e) => setProfAcc(e.target.value)} placeholder="cth: 1234 5678" /></Field>
              <Field label="Account Name (sesuai rekening)"><TextInput value={profAccName} onChange={(e) => setProfAccName(e.target.value)} placeholder={user.name} /></Field>
            </div>
          </div>

          <PrimaryBtn onClick={saveProfie} className="w-full !py-4"><Banknote size={15} /> Simpan & Ajukan Verifikasi</PrimaryBtn>
        </div>
      </Modal>
    </div>
  );
}
