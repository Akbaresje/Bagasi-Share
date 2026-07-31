import { useEffect, useMemo, useState } from "react";
import {
  Home, Package, Search, Wallet, MapPin, Star, ShieldAlert, CheckCircle2, ScanLine,
  Clock3, Store, ShoppingBag, Plane, User as UserIcon, Minus, Plus, ArrowRight, BadgeCheck,
  Calendar, Truck, Lock, Box, Ban, ClipboardList, ImageIcon, Trash2, Compass, Mailbox,
  Home as HomeIcon, Building2, Users, Navigation,
} from "lucide-react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../auth/AuthContext";
import {
  useData, Trip, Shipment, Product, JastipRequest, ShipmentItem,
  HandoverMethod, DomesticCourier, shipmentLabels, shipmentColors, orderLabels,
  handoverLabels, handoverHints, COURIER_INFO,
  PLATFORM_FEE, AUD_RATE, FREIGHT_PER_KG, DOMESTIC_FEE,
  chargeableWeight, volumetricWeight, estimateDomesticCost, WAREHOUSE_ADMIN_FEE,
} from "../../data/store";
import { useToast } from "../../components/Toast";
import { Pill, StatCard, Modal, Field, TextInput, TextArea, EmptyState, PrimaryBtn, GhostBtn, SectionCard, idr } from "../../components/ui";

const navItems = [
  { id: "home", label: "Beranda", icon: Home },
  { id: "requests", label: "Request Jastip", icon: ClipboardList },
  { id: "operators", label: "Jastip Terbuka", icon: Plane },
  { id: "shop", label: "Belanja", icon: ShoppingBag },
  { id: "shipments", label: "Kiriman Saya", icon: Package },
  { id: "orders", label: "Pesanan Saya", icon: Store },
  { id: "wallet", label: "Dompet & Escrow", icon: Wallet },
];

const reqStatusColor: Record<JastipRequest["status"], string> = { open: "#7c3aed", accepted: "#2f70ff", closed: "#22c55e" };
const reqStatusLabel: Record<JastipRequest["status"], string> = { open: "Open Bidding", accepted: "Diambil Traveler", closed: "Terverifikasi" };

const timelineOrder = ["menunggu_pickup", "manifest_disetujui", "on_flight", "tiba_warehouse", "dikirim_kurir", "selesai"] as const;
const orderColor: Record<string, string> = { masuk: "#f59e0b", diproses: "#2f70ff", konsolidasi: "#7c3aed", dikirim: "#0ea5e9", selesai: "#22c55e" };

const REVIEWS = [
  { name: "Lilis", text: "Barang sampai rapi, komunikasi cepat. Manifest beratnya akurat banget.", stars: 5 },
  { name: "Fajar", text: "Prosesnya transparan, foto timbangan dikirim duluan sebelum terbang.", stars: 5 },
  { name: "Mega", text: "Recommended, barang di-packing ulang dengan aman di warehouse.", stars: 4 },
];

const CAT_COLORS: Record<string, string> = {
  Nutrisi: "#22c55e", Skincare: "#a855f7", Kosmetik: "#ec4899", Fashion: "#0ea5e9", Makanan: "#f59e0b", Lainnya: "#64748b",
};

const HANDOVER_ICONS: Record<HandoverMethod, typeof Mailbox> = {
  pos: Mailbox, antar_rumah: HomeIcon, toko_indo: Building2, meet_city: Users,
};

const emptyItem = (): ShipmentItem => ({ id: crypto.randomUUID().slice(0, 8), name: "", qty: 1, note: "", photo: "" });

interface Operator {
  id: string;
  name: string;
  joined: string;
  trips: Trip[];
  openTrips: Trip[];
  totalKg: number;
  completed: number;
}

interface Shop {
  id: string;
  name: string;
  joined: string;
  products: Product[];
  activeProducts: Product[];
  totalSold: number;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const {
    state, bookShipment, approveManifest, openDispute, topUp, buyProduct,
    lockCapacity, updateLock, releaseUserLocks, payUnderpaid, cancelPaidShipment,
    createRequest, cancelRequest, approveProof,
  } = useData();
  const toast = useToast();
  const [activeNav, setActiveNav] = useState("home");

  // smart finder
  const [myCity, setMyCity] = useState("");
  const [qFrom, setQFrom] = useState("");
  const [qTo, setQTo] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [qCat, setQCat] = useState("Semua");
  const [qProd, setQProd] = useState("");

  // booking modal
  const [bookingTrip, setBookingTrip] = useState<Trip | null>(null);
  const [bItems, setBItems] = useState<ShipmentItem[]>([emptyItem()]);
  const [bReal, setBReal] = useState("1");
  const [bL, setBL] = useState("20");
  const [bW, setBW] = useState("20");
  const [bH, setBH] = useState("10");
  const [bValue, setBValue] = useState("500000");
  const [handover, setHandover] = useState<HandoverMethod>("antar_rumah");
  const [handoverDetail, setHandoverDetail] = useState("");
  const [courier, setCourier] = useState<DomesticCourier>("JNE");
  const [domesticAddress, setDomesticAddress] = useState("");
  const [lockId, setLockId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const [detail, setDetail] = useState<Shipment | null>(null);
  const [disputeFor, setDisputeFor] = useState<Shipment | null>(null);
  const [dTopic, setDTopic] = useState("");
  const [dDetail, setDDetail] = useState("");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState("500000");
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [buyTarget, setBuyTarget] = useState<Product | null>(null);
  const [buyQty, setBuyQty] = useState(1);
  const [cancelConfirm, setCancelConfirm] = useState<Shipment | null>(null);

  // request modal (open bidding)
  const [reqModal, setReqModal] = useState(false);
  const [rItem, setRItem] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rQty, setRQty] = useState("1");
  const [rPrice, setRPrice] = useState("500000");
  const [rWeight, setRWeight] = useState("1");
  const [rCity, setRCity] = useState("Jakarta");
  const [rFee, setRFee] = useState("150000");

  /* ============ blueprint 1&2 helpers: effective availability ============ */
  const activeLocks = useMemo(
    () => state.locks.filter((l) => l.expiresAt > Date.now()),
    [state.locks, tick]
  );

  function othersLockedKg(tripId: string) {
    return activeLocks.filter((l) => l.tripId === tripId && l.userId !== user?.id).reduce((a, l) => a + l.weightKg, 0);
  }

  function availableOf(t: Trip) {
    return Math.max(0, Math.round((t.saleCapacityKg - t.bookedKg - othersLockedKg(t.id)) * 10) / 10);
  }

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ============ derived ============ */
  const operators = useMemo(() => {
    const map = new Map<string, Operator>();
    for (const t of state.trips) {
      const u = state.users.find((x) => x.id === t.travelerId);
      if (!u || u.status !== "aktif") continue;
      const cur = map.get(t.travelerId) ?? { id: t.travelerId, name: t.travelerName, joined: u.joined, trips: [], openTrips: [], totalKg: 0, completed: 0 };
      cur.trips.push(t);
      if (t.status === "aktif" && t.bookedKg < t.saleCapacityKg) cur.openTrips.push(t);
      cur.totalKg += t.bookedKg;
      cur.completed += state.shipments.filter((s) => s.travelerId === t.travelerId && s.status === "selesai").length;
      map.set(t.travelerId, cur);
    }
    return [...map.values()];
  }, [state.trips, state.users, state.shipments]);

  const shops = useMemo(() => {
    const map = new Map<string, Shop>();
    for (const p of state.products) {
      const u = state.users.find((x) => x.id === p.resellerId);
      if (!u || u.status !== "aktif") continue;
      const cur = map.get(p.resellerId) ?? { id: p.resellerId, name: p.resellerName, joined: u.joined, products: [], activeProducts: [], totalSold: 0 };
      cur.products.push(p);
      if (p.active) cur.activeProducts.push(p);
      cur.totalSold += p.sold;
      map.set(p.resellerId, cur);
    }
    return [...map.values()];
  }, [state.products, state.users]);

  const filteredOperators = useMemo(() => {
    const list = operators.filter((op) => {
      if (qFrom || qTo) {
        const matchTrip = op.openTrips.some((t) =>
          (!qFrom || t.from.toLowerCase().includes(qFrom.toLowerCase())) &&
          (!qTo || t.to.toLowerCase().includes(qTo.toLowerCase()))
        );
        if (!matchTrip) return false;
      }
      return true;
    });
    if (!targetDate) return list;
    return [...list].sort((a, b) => {
      const da = a.openTrips.reduce((min, t) => (t.date < min ? t.date : min), "9999-99-99");
      const db = b.openTrips.reduce((min, t) => (t.date < min ? t.date : min), "9999-99-99");
      return da.localeCompare(db);
    });
  }, [operators, qFrom, qTo, targetDate]);

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (!p.active || p.stock <= 0) return false;
      if (qCat !== "Semua" && p.category !== qCat) return false;
      if (qProd && !p.name.toLowerCase().includes(qProd.toLowerCase())) return false;
      const shop = state.users.find((x) => x.id === p.resellerId);
      return !shop || shop.status === "aktif";
    });
  }, [state.products, state.users, qCat, qProd]);

  const productCategories = useMemo(() => ["Semua", ...new Set(state.products.filter((p) => p.active).map((p) => p.category))], [state.products]);

  if (!user) return null;

  /* ============ user-scoped ============ */
  const myShipments = state.shipments.filter((s) => s.customerId === user.id && !(s.requestId && !s.proofApproved));
  const myOrders = state.orders.filter((o) => o.customerId === user.id);
  const myRequests = (state.requests ?? []).filter((r) => r.customerId === user.id);
  const wallet = state.wallets[user.id] ?? { balance: 0, pending: 0, deposit: 0, ledger: [] };
  const activeShipments = myShipments.filter((s) => s.status !== "selesai" && s.status !== "dibatalkan");
  const totalSpent = myShipments.reduce((a, s) => a + (s.totalPaid ?? s.price), 0) + myOrders.reduce((a, o) => a + o.totalIDR, 0);
  const waitingApprove = myShipments.filter((s) => s.manifestReady && s.status === "menunggu_pickup" && !s.receiverProofVerified);
  const underpaidList = myShipments.filter((s) => (s.underpaid ?? 0) > 0);

  const operator = operators.find((o) => o.id === operatorId) ?? null;
  const shop = shops.find((s) => s.id === shopId) ?? null;

  /* ============ blueprint 3: volumetric calc (booking modal) ============ */
  const real = Number(bReal) || 0;
  const l = Number(bL) || 0;
  const w = Number(bW) || 0;
  const h = Number(bH) || 0;
  const vol = l && w && h ? volumetricWeight(l, w, h) : 0;
  const chargeable = chargeableWeight(real, l, w, h);
  const jastipFee = bookingTrip ? chargeable * bookingTrip.pricePerKg : 0;
  const domesticCost = estimateDomesticCost(courier, chargeable);
  const bookingTotal = jastipFee + domesticCost;
  const modalAvail = bookingTrip ? availableOf(bookingTrip) : 0;

  /* ---------- lock lifecycle (blueprint 2: temporary lock 30 menit) ---------- */
  useEffect(() => {
    if (!bookingTrip || !user) { setLockId(null); return; }
    const id = lockCapacity(user.id, bookingTrip.id, chargeableWeight(Number(bReal) || 1, Number(bL) || 0, Number(bW) || 0, Number(bH) || 0));
    if (id) setLockId(id); else setLockId(null);
    return () => {
      releaseUserLocks(user.id, bookingTrip.id);
      setLockId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingTrip?.id, user?.id]);

  useEffect(() => {
    if (!bookingTrip || !user) return;
    if (lockId) updateLock(lockId, chargeable);
    else if (chargeable <= modalAvail) setLockId(lockCapacity(user.id, bookingTrip.id, chargeable));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeable]);

  const myLock = state.locks.find((x) => x.id === lockId) ?? null;
  const lockSeconds = myLock ? Math.max(0, Math.round((myLock.expiresAt - Date.now()) / 1000)) : 0;
  const lockMM = String(Math.floor(lockSeconds / 60)).padStart(2, "0");
  const lockSS = String(lockSeconds % 60).padStart(2, "0");

  const buyBreakdown = buyTarget
    ? {
        productCost: buyQty * buyTarget.priceAUD * AUD_RATE,
        weightKg: Math.round(buyQty * 0.9 * 10) / 10,
        freight: Math.round(buyQty * 0.9 * FREIGHT_PER_KG),
        total: buyQty * buyTarget.priceAUD * AUD_RATE + Math.round(buyQty * 0.9 * FREIGHT_PER_KG) + DOMESTIC_FEE,
      }
    : null;

  /* ============ item list handlers ============ */
  function addItemRow() { setBItems((prev) => [...prev, emptyItem()]); }
  function removeItemRow(id: string) { setBItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev)); }
  function updateItem(id: string, patch: Partial<ShipmentItem>) {
    setBItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  async function handleItemPhoto(id: string, file: File) {
    if (!file.type.startsWith("image/")) return void toast.push("File harus gambar (JPG/PNG).", "err");
    if (file.size > 800 * 1024) return void toast.push("Ukuran foto maksimal 800KB.", "err");
    const dataUrl = await fileToDataUrl(file);
    updateItem(id, { photo: dataUrl });
  }

  function resetBookingForm() {
    setBItems([emptyItem()]); setBReal("1"); setBL("20"); setBW("20"); setBH("10"); setBValue("500000");
    setHandover("antar_rumah"); setHandoverDetail(""); setCourier("JNE"); setDomesticAddress("");
  }

  /* ============ actions ============ */

  function submitBooking() {
    if (!bookingTrip || !user) return;
    if (bItems.some((it) => !it.name.trim())) return void toast.push("Nama setiap barang wajib diisi.", "err");
    if (bItems.some((it) => !it.photo)) return void toast.push("Setiap barang wajib disertai foto.", "err");
    if (!handoverDetail.trim()) return void toast.push(`Isi detail untuk metode "${handoverLabels[handover]}".`, "err");
    if (!domesticAddress.trim()) return void toast.push("Alamat pengiriman domestik wajib diisi.", "err");
    if (chargeable > modalAvail) return void toast.push(`Chargeable ${chargeable} kg melebihi sisa kuota efektif (${modalAvail.toFixed(1)} kg).`, "err");
    const result = bookShipment(user, bookingTrip, {
      items: bItems, weightReal: real, dims: { l, w, h }, value: Number(bValue),
      handoverMethod: handover, handoverDetail: handoverDetail.trim(),
      domesticCourier: courier, domesticAddress: domesticAddress.trim(),
    });
    toast.push(result.message, result.ok ? "ok" : "err");
    if (result.ok) {
      setBookingTrip(null);
      resetBookingForm();
      setActiveNav("shipments");
    } else if (result.message.includes("Saldo")) {
      setTopUpOpen(true);
    }
  }

  function submitBuy() {
    if (!buyTarget || !user) return;
    const result = buyProduct(user, buyTarget, buyQty);
    toast.push(result.message, result.ok ? "ok" : "err");
    if (result.ok) { setBuyTarget(null); setBuyQty(1); setActiveNav("orders"); }
    else if (result.message.includes("Saldo")) setTopUpOpen(true);
  }

  function submitDispute() {
    if (!disputeFor || !user) return;
    if (!dTopic.trim()) return void toast.push("Topik komplain wajib diisi.", "err");
    openDispute(disputeFor.id, user.name, dTopic, dDetail);
    toast.push("Komplain dibuat. Tim admin akan meninjau kasusmu.");
    setDisputeFor(null); setDTopic(""); setDDetail("");
  }

  function submitTopUp() {
    const amt = Number(topUpAmt);
    if (!user) return;
    if (amt < 10000) return void toast.push("Minimal top up Rp 10.000.", "err");
    topUp(user.id, amt);
    toast.push(`Top up ${idr(amt)} berhasil.`);
    setTopUpOpen(false);
  }

  function submitRequest() {
    if (!user) return;
    if (!rItem.trim()) return void toast.push("Nama barang wajib diisi.", "err");
    if (!rDesc.trim()) return void toast.push("Detail barang wajib diisi agar traveler bisa membelikan dengan tepat.", "err");
    const qty = Number(rQty), estPrice = Number(rPrice), estWeight = Number(rWeight), offeredFee = Number(rFee);
    if (qty < 1 || estPrice <= 0 || estWeight <= 0 || offeredFee < 0) return void toast.push("Nilai request tidak valid.", "err");
    createRequest(user, { item: rItem.trim(), desc: rDesc.trim(), qty, estPrice, estWeight, cityTarget: rCity.trim() || "Jakarta", offeredFee });
    toast.push("Request dikirim ke Open Bidding! Traveler akan melihatnya.");
    setReqModal(false);
    setRItem(""); setRDesc("");
  }

  function goToBooking(trip: Trip) {
    resetBookingForm();
    setBookingTrip(trip);
  }

  /* ============ cards ============ */

  const OperatorCard = ({ op, compact = false }: { op: Operator; compact?: boolean }) => {
    const soonest = [...op.openTrips].sort((a, b) => a.date.localeCompare(b.date))[0];
    const onTime = targetDate && soonest ? soonest.date <= targetDate : null;
    return (
      <div className={`bg-white p-5 ${compact ? "" : "flex flex-col"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eef4ff] text-lg font-bold text-[#2f70ff]">{op.name.charAt(0)}</span>
            <div>
              <div className="flex items-center gap-1.5"><p className="font-bold text-[#10274f]">{op.name}</p><BadgeCheck size={14} className="text-[#2f70ff]" /></div>
              <p className="flex items-center gap-1 text-xs text-amber-500"><Star size={11} fill="currentColor" />4.9 <span className="text-slate-400">• bergabung {op.joined}</span></p>
            </div>
          </div>
          {op.openTrips.length > 0 ? <Pill color="#22c55e">{op.openTrips.length} slot terbuka</Pill> : <Pill color="#dc2626">SOLD OUT</Pill>}
        </div>
        {targetDate && soonest && (
          <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${onTime ? "text-green-600" : "text-amber-600"}`}>
            <Calendar size={12} /> {onTime ? "Bisa tiba sebelum tanggalmu" : "Kemungkinan tiba setelah tanggalmu"} ({soonest.date})
          </p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 text-center text-xs">
          <div><p className="font-bold text-[#10274f]">{op.trips.length}</p><p className="text-slate-400">Trip</p></div>
          <div><p className="font-bold text-[#10274f]">{op.totalKg.toFixed(0)} kg</p><p className="text-slate-400">Terbawa</p></div>
          <div><p className="font-bold text-[#10274f]">{op.completed}</p><p className="text-slate-400">Selesai</p></div>
        </div>
        <div className="mt-3 flex-1 space-y-2 text-xs">
          {op.openTrips.slice(0, compact ? 1 : 2).map((t) => {
            const av = availableOf(t);
            return (
              <div key={t.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                <span className="font-semibold text-[#10274f]">{t.from} → {t.to} • {t.date}</span>
                <span className="text-slate-500">{av <= 0 ? <b className="text-red-500">FULL</b> : `sisa ${av.toFixed(1)} kg`}</span>
              </div>
            );
          })}
          {op.openTrips.length === 0 && <p className="italic text-slate-400">Kuota efektif habis terjual</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <GhostBtn onClick={() => setOperatorId(op.id)} className="flex-1"><UserIcon size={13} /> Lihat Profile</GhostBtn>
          {op.openTrips.some((t) => availableOf(t) > 0) && <PrimaryBtn onClick={() => goToBooking(op.openTrips.find((t) => availableOf(t) > 0)!)} className="flex-1 !py-2.5 !text-xs">Booking</PrimaryBtn>}
        </div>
      </div>
    );
  };

  const ProductCard = ({ p }: { p: Product }) => {
    const catColor = CAT_COLORS[p.category] ?? "#64748b";
    return (
      <div className="flex flex-col overflow-hidden bg-white">
        <button onClick={() => setShopId(p.resellerId)} className="grid h-32 place-items-center transition hover:opacity-90" style={{ background: `${catColor}14` }}>
          <ShoppingBag size={42} style={{ color: catColor }} strokeWidth={1.4} />
        </button>
        <div className="flex flex-1 flex-col p-5">
          <Pill color={catColor}>{p.category}</Pill>
          <button onClick={() => setShopId(p.resellerId)} className="mt-3 text-left"><p className="font-bold leading-snug text-[#10274f] hover:text-[#2f70ff]">{p.name}</p></button>
          <button onClick={() => setShopId(p.resellerId)} className="mt-1 text-left text-xs text-slate-400 hover:text-[#2f70ff]">oleh {p.resellerName}</button>
          <div className="mt-3 flex items-end justify-between">
            <div><p className="text-sm font-bold text-[#173e82]">AUD {p.priceAUD}</p><p className="text-[10px] text-slate-400">≈ {idr(p.priceAUD * AUD_RATE)}</p></div>
            <p className="text-[10px] text-slate-400">Stok {p.stock} • {p.sold} terjual</p>
          </div>
          <PrimaryBtn onClick={() => { setBuyTarget(p); setBuyQty(1); }} className="mt-4 !bg-[#2f70ff] !py-2.5 !text-xs hover:!bg-[#1f5fe9]"><ShoppingBag size={13} /> Beli Sekarang</PrimaryBtn>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout navItems={navItems} activeNav={activeNav} onNavChange={setActiveNav} title="Dashboard Customer" subtitle="Temukan jastip & produk Australia terpercaya">
      {/* ============================ HOME ============================ */}
      {activeNav === "home" && (
        <div className="space-y-8">
          {waitingApprove.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-[#7c3aed] bg-white p-5">
              <div className="flex items-center gap-3">
                <ScanLine size={20} className="text-[#7c3aed]" />
                <div><p className="font-bold text-[#10274f]">{waitingApprove.length} bukti terima & manifest menunggu verifikasimu</p><p className="text-xs text-slate-500">Periksa foto barang sebelum traveler terbang.</p></div>
              </div>
              <GhostBtn onClick={() => setActiveNav("shipments")}>Tinjau sekarang</GhostBtn>
            </div>
          )}
          {underpaidList.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-[#dc2626] bg-white p-5">
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-[#dc2626]" />
                <div><p className="font-bold text-[#10274f]">{underpaidList.length} kiriman berstatus UNDERPAID</p><p className="text-xs text-slate-500">Timbang ulang warehouse lebih besar dari booking. Lunasi invoice tambahan untuk melanjutkan.</p></div>
              </div>
              <GhostBtn onClick={() => setActiveNav("shipments")}>Lihat tagihan</GhostBtn>
            </div>
          )}

          {/* Smart Finder */}
          <div className="bg-white p-6 sm:p-8">
            <div className="flex items-center gap-2"><Compass size={18} className="text-[#2f70ff]" /><h3 className="font-bold text-[#10274f]">Cari jastip yang pas buatmu</h3></div>
            <p className="mt-1 text-sm text-slate-500">Isi lokasimu, rute, dan target tanggal tiba — kami urutkan traveler paling cocok.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Lokasi kamu tinggal"><div className="relative"><Navigation size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><TextInput className="pl-9" placeholder="cth: Jakarta Selatan" value={myCity} onChange={(e) => setMyCity(e.target.value)} /></div></Field>
              <Field label="Traveler berangkat dari"><TextInput placeholder="cth: Sydney" value={qFrom} onChange={(e) => setQFrom(e.target.value)} /></Field>
              <Field label="Tiba di kota"><TextInput placeholder="cth: Jakarta" value={qTo} onChange={(e) => setQTo(e.target.value)} /></Field>
              <Field label="Target tanggal barang tiba"><TextInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryBtn onClick={() => setActiveNav("operators")}><Search size={15} /> Cari traveler yang cocok</PrimaryBtn>
              {(myCity || qFrom || qTo || targetDate) && <GhostBtn onClick={() => { setMyCity(""); setQFrom(""); setQTo(""); setTargetDate(""); }}>Reset pencarian</GhostBtn>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Kiriman Berjalan" value={String(activeShipments.length)} sub="Belum sampai tujuan" icon={Clock3} color="#0ea5e9" />
            <StatCard label="Pesanan Belanja" value={String(myOrders.filter((o) => o.status !== "selesai").length)} sub="Diproses merchant" icon={ShoppingBag} color="#f59e0b" />
            <StatCard label="Saldo Dompet" value={idr(wallet.balance)} sub="Siap untuk transaksi" icon={Wallet} color="#2f70ff" />
            <StatCard label="Total Dibelanjakan" value={idr(totalSpent)} sub="Jastip + belanja" icon={Package} color="#22c55e" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#7c3aed] to-[#2f70ff] p-6 text-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Cari barang tertentu?</p>
              <h3 className="mt-1 text-xl font-bold">Request jastip custom via Open Bidding</h3>
              <p className="mt-1 text-sm text-white/70">Tulis barang impianmu + fee yang kamu tawarkan. Traveler yang bisa membelikannya akan mengambil permintaanmu.</p>
            </div>
            <button onClick={() => setReqModal(true)} className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#7c3aed]">
              <Plus size={16} /> Buat Request
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#10274f]">Traveler yang sedang open jastip</h3>
            <button onClick={() => setActiveNav("operators")} className="flex items-center gap-1 text-xs font-bold text-[#2f70ff]">Lihat semua <ArrowRight size={13} /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {operators.filter((o) => o.openTrips.length > 0).slice(0, 3).map((op) => <OperatorCard key={op.id} op={op} compact />)}
            {operators.filter((o) => o.openTrips.length > 0).length === 0 && <div className="col-span-full bg-white p-8 text-center text-sm text-slate-400">Semua slot sedang SOLD OUT.</div>}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#10274f]">Rekomendasi produk dari merchant</h3>
            <button onClick={() => setActiveNav("shop")} className="flex items-center gap-1 text-xs font-bold text-[#f59e0b]">Belanja sekarang <ArrowRight size={13} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
            {filteredProducts.length === 0 && <div className="col-span-full bg-white p-8 text-center text-sm text-slate-400">Belum ada produk aktif.</div>}
          </div>
        </div>
      )}

      {/* ============================ REQUEST JASTIP (OPEN BIDDING) ============================ */}
      {activeNav === "requests" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-[#10274f]">{myRequests.length} request jastip</p>
              <p className="text-xs text-slate-500">Custom barang — traveler yang bisa membelikannya akan mengambilnya dari Open Bidding.</p>
            </div>
            <PrimaryBtn onClick={() => setReqModal(true)} className="!bg-[#7c3aed] hover:!bg-[#6d28d9]"><Plus size={16} /> Buat Request</PrimaryBtn>
          </div>
          {myRequests.length === 0 && <EmptyState icon={ClipboardList} title="Belum ada request" desc="Minta barang apa pun dari Australia — let travelers membelikannya untukmu." action={<PrimaryBtn onClick={() => setReqModal(true)} className="!bg-[#7c3aed] hover:!bg-[#6d28d9]">Buat request pertama</PrimaryBtn>} />}
          {myRequests.map((r) => {
            const linkedShipment = r.shipmentId ? state.shipments.find((x) => x.id === r.shipmentId) : undefined;
            return (
              <div key={r.id} className="bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f3e8ff]"><ClipboardList size={18} className="text-[#7c3aed]" /></span>
                    <div><p className="font-bold text-[#10274f]">{r.item} × {r.qty}</p><p className="text-xs text-slate-500">{r.code} • {r.createdAt} • tujuan {r.cityTarget}</p></div>
                  </div>
                  <Pill color={reqStatusColor[r.status]}>{reqStatusLabel[r.status]}</Pill>
                </div>
                <p className="mt-3 border-l-2 border-slate-200 pl-3 text-sm text-slate-600">{r.desc}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div className="bg-slate-50 p-3"><p className="text-slate-400">Est. harga barang</p><b className="text-[#10274f]">{idr(r.estPrice)}</b></div>
                  <div className="bg-slate-50 p-3"><p className="text-slate-400">Fee ditawarkan (bid)</p><b className="text-[#7c3aed]">{idr(r.offeredFee)}</b></div>
                  <div className="bg-slate-50 p-3"><p className="text-slate-400">Est. berat</p><b className="text-[#10274f]">{r.estWeight} kg</b></div>
                  <div className="bg-slate-50 p-3"><p className="text-slate-400">Total invoice</p><b className="text-[#173e82]">{idr(r.estPrice + r.offeredFee)}</b></div>
                </div>

                {r.status === "open" && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={13} className="text-[#7c3aed]" /> Menunggu traveler mengambil permintaan ini...</p>
                    <GhostBtn onClick={() => { cancelRequest(user, r.id); toast.push("Request dibatalkan.", "info"); }} className="ml-auto !border-red-200 !text-red-600"><Ban size={13} /> Batalkan</GhostBtn>
                  </div>
                )}

                {r.status === "accepted" && (
                  <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <BadgeCheck size={16} className="text-[#2f70ff]" />
                      <p className="text-sm">Diambil oleh <button onClick={() => setOperatorId(r.acceptedBy!)} className="font-bold text-[#2f70ff] hover:underline">{r.acceptedByName}</button> — invoice {idr(r.totalInvoice ?? r.estPrice + r.offeredFee)} masuk escrow.</p>
                      {linkedShipment && <span className="text-xs text-slate-400">({linkedShipment.code})</span>}
                    </div>
                    {r.proofImage ? (
                      <div className="border border-[#2f70ff]/30 bg-[#eef4ff] p-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-[#173e82]"><ImageIcon size={15} /> Bukti penerimaan barang</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                          <img src={r.proofImage} alt="Bukti penerimaan" className="h-36 w-full rounded object-cover" />
                          <div>
                            <p className="text-sm text-slate-600">Catatan traveler: {r.proofNote ?? "-"}</p>
                            <p className="mt-2 text-[11px] text-slate-500">Periksa foto bukti — varian, jumlah, dan ukuran harus sesuai requestmu. Setuju? Barang langsung masuk manifest terbang.</p>
                          </div>
                        </div>
                        {!r.proofVerified && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <PrimaryBtn onClick={() => { approveProof(user, r.id); toast.push("Bukti disetujui! Barang resmi masuk manifes terbang."); setActiveNav("shipments"); }} className="!bg-[#22c55e] !py-2.5 !text-xs hover:!bg-[#16a34a]"><CheckCircle2 size={14} /> Barang sesuai, terima bukti</PrimaryBtn>
                            {linkedShipment && <GhostBtn onClick={() => setDisputeFor(linkedShipment)} className="!border-red-200 !text-red-600"><ShieldAlert size={13} /> Ajukan komplain</GhostBtn>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="flex items-center gap-2 border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500"><ShoppingBag size={13} /> Traveler sedang membelikan barangmu. Bukti penerimaan akan muncul di sini.</p>
                    )}
                  </div>
                )}

                {r.status === "closed" && (
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-green-700">
                    <CheckCircle2 size={15} /> Bukti diverifikasi — barang masuk manifest. <button onClick={() => setActiveNav("shipments")} className="font-bold text-[#2f70ff] hover:underline">Pantau di Kiriman Saya →</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================ OPERATORS ============================ */}
      {activeNav === "operators" && (
        <div className="space-y-6">
          <div className="bg-white p-5">
            <div className="flex items-center gap-2"><Compass size={16} className="text-[#2f70ff]" /><p className="text-sm font-bold text-[#10274f]">Smart Finder</p></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Lokasi kamu"><TextInput placeholder="cth: Jakarta Selatan" value={myCity} onChange={(e) => setMyCity(e.target.value)} /></Field>
              <Field label="Kota asal traveler"><TextInput placeholder="cth: Sydney" value={qFrom} onChange={(e) => setQFrom(e.target.value)} /></Field>
              <Field label="Kota tujuan"><TextInput placeholder="cth: Jakarta" value={qTo} onChange={(e) => setQTo(e.target.value)} /></Field>
              <Field label="Target tanggal tiba"><TextInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
            </div>
            <div className="mt-3"><GhostBtn onClick={() => { setMyCity(""); setQFrom(""); setQTo(""); setTargetDate(""); }}>Reset</GhostBtn></div>
          </div>
          <p className="text-sm text-slate-500">{filteredOperators.length} penyedia bagasi{(qFrom || qTo) ? " sesuai filter" : ""} — {filteredOperators.filter((o) => o.openTrips.length > 0).length} sedang open jastip</p>
          {filteredOperators.length === 0 && <EmptyState icon={Search} title="Tidak ada penyedia bagasi yang cocok" desc="Coba ubah kota asal atau tujuan." />}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredOperators.map((op) => <OperatorCard key={op.id} op={op} />)}
          </div>
        </div>
      )}

      {/* ============================ SHOP ============================ */}
      {activeNav === "shop" && (
        <div className="space-y-6">
          <div className="grid gap-3 bg-white p-5 md:grid-cols-[1fr_auto]">
            <Field label="Cari produk"><TextInput placeholder="cth: Aptamil, Aesop, Blackmores..." value={qProd} onChange={(e) => setQProd(e.target.value)} /></Field>
            <div className="flex flex-wrap items-end gap-2">
              {productCategories.map((c) => (
                <button key={c} onClick={() => setQCat(c)} className={`h-fit rounded-full border px-4 py-2 text-xs font-bold transition ${qCat === c ? "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]" : "border-slate-200 text-slate-500"}`}>{c}</button>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-500">{filteredProducts.length} produk tersedia dari {shops.length} merchant aktif</p>
          {filteredProducts.length === 0 && <EmptyState icon={ShoppingBag} title="Tidak ada produk yang cocok" desc="Coba kata kunci atau kategori lain." />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* ============================ SHIPMENTS ============================ */}
      {activeNav === "shipments" && (
        <div className="space-y-4">
          {myShipments.length === 0 && <EmptyState icon={Package} title="Belum ada kiriman jastip" desc="Booking slot dari traveler yang sedang open jastip." action={<PrimaryBtn onClick={() => setActiveNav("operators")}>Cari jastip</PrimaryBtn>} />}
          {myShipments.map((s) => {
            const escrow = state.escrow.find((e) => e.shipmentId === s.id);
            const isCancel = s.status === "dibatalkan";
            const HIcon = s.handoverMethod ? HANDOVER_ICONS[s.handoverMethod] : Truck;
            const needsProofReview = s.manifestReady && s.status === "menunggu_pickup" && !s.receiverProofVerified && (s.underpaid ?? 0) === 0;
            return (
              <div key={s.id} className={`bg-white p-6 ${isCancel ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button onClick={() => setDetail(s)} className="flex items-center gap-4 text-left">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef4ff]"><Package size={18} className="text-[#2f70ff]" /></span>
                    <div><p className="font-bold text-[#10274f] hover:text-[#2f70ff]">{s.item}</p><p className="text-xs text-slate-500">{s.code} • {s.route} • {s.createdAt}</p></div>
                  </button>
                  <Pill color={shipmentColors[s.status]}>{shipmentLabels[s.status]}</Pill>
                </div>

                {/* items gallery */}
                {s.items?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2 border border-slate-100 bg-slate-50 py-1.5 pl-1.5 pr-3 text-xs">
                        {it.photo ? <img src={it.photo} alt={it.name} className="h-8 w-8 rounded object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded bg-slate-200"><Box size={13} className="text-slate-400" /></span>}
                        <span className="font-semibold text-[#10274f]">{it.name} × {it.qty}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* handover & domestic info */}
                {(s.handoverMethod || s.domesticCourier) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {s.handoverMethod && (
                      <div className="flex items-start gap-2 bg-slate-50 p-3 text-xs">
                        <HIcon size={15} className="mt-0.5 shrink-0 text-[#2f70ff]" />
                        <div><p className="font-bold text-[#10274f]">{handoverLabels[s.handoverMethod]}</p><p className="mt-0.5 text-slate-500">{s.handoverDetail}</p></div>
                      </div>
                    )}
                    {s.domesticCourier && (
                      <div className="flex items-start gap-2 bg-slate-50 p-3 text-xs">
                        <Truck size={15} className="mt-0.5 shrink-0 text-[#f59e0b]" />
                        <div><p className="font-bold text-[#10274f]">{COURIER_INFO[s.domesticCourier].label} • {idr(s.domesticCost ?? 0)}</p><p className="mt-0.5 text-slate-500">{s.domesticAddress}</p></div>
                      </div>
                    )}
                  </div>
                )}

                {/* receiver proof review */}
                {needsProofReview && (
                  <div className="mt-4 border-l-4 border-[#7c3aed] bg-[#f3e8ff] p-4">
                    <p className="flex items-center gap-2 font-bold text-[#7c3aed]"><ImageIcon size={16} /> Verifikasi bukti terima sebelum terbang</p>
                    <p className="mt-1 text-sm text-slate-600">Traveler telah menerima & menimbang barangmu ({s.actualWeight} kg, {s.itemCount} item). Periksa foto berikut untuk memastikan tidak ada yang hilang atau tertukar.</p>
                    {s.receiverProofPhotos && s.receiverProofPhotos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.receiverProofPhotos.map((ph, i) => <img key={i} src={ph} alt={`bukti ${i + 1}`} className="h-24 w-24 rounded object-cover" />)}
                      </div>
                    )}
                    {s.manifestNote && <p className="mt-2 text-xs italic text-slate-500">Catatan traveler: {s.manifestNote}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PrimaryBtn onClick={() => { approveManifest(s.id); toast.push(`Bukti & manifest ${s.code} disetujui. Siap terbang.`); }} className="!bg-[#7c3aed] hover:!bg-[#6d28d9]"><CheckCircle2 size={15} /> Sesuai, setujui & izinkan terbang</PrimaryBtn>
                      <GhostBtn onClick={() => setDisputeFor(s)} className="!border-red-200 !text-red-600"><ShieldAlert size={14} /> Ada yang tidak sesuai</GhostBtn>
                    </div>
                  </div>
                )}

                {/* underpaid banner */}
                {(s.underpaid ?? 0) > 0 && !isCancel && (
                  <div className="mt-4 border-l-4 border-[#dc2626] bg-red-50 p-4">
                    <p className="flex items-center gap-2 font-bold text-red-700"><ShieldAlert size={16} /> Pending — Underpaid</p>
                    <p className="mt-1 text-sm text-red-600">
                      Timbang ulang di warehouse: <b>{s.actualWeight} kg riil{typeof s.volumetricKg === "number" ? ` / ${s.volumetricKg} kg volume` : ""}</b> — lebih besar dari booking {s.weight} kg.
                      Invoice tambahan: <b>{idr(s.underpaid!)}</b>. Barang belum bisa dikirim kurir sebelum dilunasi.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PrimaryBtn onClick={() => {
                        const res = payUnderpaid({ id: user.id, name: user.name, email: user.email, role: user.role }, s.id);
                        toast.push(res.message, res.ok ? "ok" : "err");
                        if (!res.ok && res.message.includes("Saldo")) setTopUpOpen(true);
                      }} className="!bg-[#dc2626] !py-2.5 !text-xs hover:!bg-[#b91c1c]">Lunasi {idr(s.underpaid!)}</PrimaryBtn>
                      <GhostBtn onClick={() => setCancelConfirm(s)} className="!border-red-200 !text-red-600"><Ban size={13} /> Batalkan (refund)</GhostBtn>
                    </div>
                  </div>
                )}

                {!isCancel && (
                  <div className="mt-5 grid grid-cols-6 gap-1">
                    {timelineOrder.map((st, i) => (
                      <div key={st} className="text-center">
                        <div className={`mx-auto grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${i <= timelineOrder.indexOf(s.status as typeof timelineOrder[number]) ? "bg-[#2f70ff] text-white" : "bg-slate-100 text-slate-400"}`}>{i + 1}</div>
                        <p className={`mt-1.5 hidden text-[10px] sm:block ${i <= timelineOrder.indexOf(s.status as typeof timelineOrder[number]) ? "font-bold text-[#10274f]" : "text-slate-400"}`}>{shipmentLabels[st]}</p>
                      </div>
                    ))}
                  </div>
                )}
                {isCancel && <p className="mt-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">Booking ini dibatalkan. Refund sudah dikembalikan ke dompetmu setelah dipotong biaya administrasi gudang ({idr(WAREHOUSE_ADMIN_FEE)}).</p>}

                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>Chargeable: <b className="text-[#10274f]">{s.weight} kg</b>{s.weightReal ? ` (riil ${s.weightReal} kg${typeof s.volumetricKg === "number" ? ` / volum ${s.volumetricKg} kg` : ""})` : ""}</span>
                  <span>Fee jastip: <b className="text-[#10274f]">{idr(s.price)}</b></span>
                  {s.domesticCost !== undefined && <span>Ongkir domestik: <b className="text-[#10274f]">{idr(s.domesticCost)}</b></span>}
                  {s.totalPaid !== undefined && <span>Total dibayar: <b className="text-[#173e82]">{idr(s.totalPaid)}</b></span>}
                  <span>Escrow: <Pill color={escrow?.status === "dilepas" ? "#22c55e" : "#f59e0b"}>{escrow?.status === "dilepas" ? "Dilepas" : "Ditahan"}</Pill></span>
                  <span>Traveler: <button onClick={() => setOperatorId(s.travelerId)} className="font-bold text-[#2f70ff] hover:underline">{s.travelerName}</button></span>
                  {s.resi && <span>Resi: <b className="text-[#10274f]">{s.resi}</b></span>}
                </div>
                {!isCancel && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!s.manifestReady && s.status === "menunggu_pickup" && <span className="flex items-center gap-2 text-xs text-slate-400"><Clock3 size={13} /> Menunggu traveler menerima, menimbang & upload bukti foto barang...</span>}
                    <GhostBtn onClick={() => setDetail(s)}>Detail</GhostBtn>
                    {s.status !== "selesai" && !s.disputeOpen && <GhostBtn onClick={() => setDisputeFor(s)}><ShieldAlert size={14} /> Ajukan komplain</GhostBtn>}
                    {s.disputeOpen && <GhostBtn disabled><ShieldAlert size={14} className="text-amber-500" /> Komplain sedang ditinjau</GhostBtn>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================ MY ORDERS ============================ */}
      {activeNav === "orders" && (
        <div className="space-y-4">
          {myOrders.length === 0 && <EmptyState icon={Store} title="Belum ada pesanan belanja" desc="Belanja produk dari merchant Australia sekarang." action={<PrimaryBtn onClick={() => setActiveNav("shop")} className="!bg-[#f59e0b] hover:!bg-[#d97706]">Mulai belanja</PrimaryBtn>} />}
          {myOrders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 bg-white p-6">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#fff7ed]"><ShoppingBag size={18} className="text-[#f59e0b]" /></span>
                <div>
                  <p className="font-bold text-[#10274f]">{o.productName} × {o.qty}</p>
                  <p className="text-xs text-slate-500">{o.id} • {o.date} • est. {o.weightKg} kg • oleh {state.products.find((p) => p.resellerId === o.resellerId)?.resellerName ?? "Merchant"}</p>
                </div>
              </div>
              <div className="text-right"><p className="font-bold text-[#10274f]">{idr(o.totalIDR)}</p><p className="text-[10px] text-slate-400">Sudah termasuk ongkir gabungan</p></div>
              <Pill color={orderColor[o.status]}>{orderLabels[o.status]}</Pill>
            </div>
          ))}
        </div>
      )}

      {/* ============================ WALLET ============================ */}
      {activeNav === "wallet" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#173e82] to-[#2f70ff] p-8 text-white">
            <p className="text-sm text-white/70">Saldo dompet</p>
            <p className="mt-2 text-4xl font-bold">{idr(wallet.balance)}</p>
            <p className="mt-1 text-xs text-white/60">{state.escrow.filter((e) => e.from === user.name && e.status === "ditahan").length} transaksi sedang ditahan escrow</p>
            <button onClick={() => setTopUpOpen(true)} className="mt-5 bg-white px-6 py-2.5 text-sm font-bold text-[#173e82]">Top up saldo</button>
          </div>
          <SectionCard title="Riwayat transaksi">
            <div className="divide-y divide-slate-100">
              {wallet.ledger.length === 0 && <div className="p-6 text-sm text-slate-400">Belum ada transaksi.</div>}
              {wallet.ledger.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3"><CheckCircle2 size={16} className={t.type === "in" ? "text-green-500" : "text-slate-300"} /><div><p className="text-sm font-semibold text-[#10274f]">{t.label}</p><p className="text-xs text-slate-400">{t.time}</p></div></div>
                  <p className={`font-bold ${t.type === "in" ? "text-green-600" : "text-slate-700"}`}>{t.type === "in" ? "+" : "-"} {idr(t.amount)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <p className="text-xs text-slate-400">Catatan: platform memotong komisi {PLATFORM_FEE * 100}% dari nilai transaksi sebelum dana dicairkan ke traveler.</p>
        </div>
      )}

      {/* ============================ MODALS ============================ */}

      {/* Traveler profile */}
      <Modal open={!!operator} onClose={() => setOperatorId(null)} title="Profile Penyedia Bagasi">
        {operator && (
          <div className="space-y-5">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#eef4ff] text-2xl font-bold text-[#2f70ff]">{operator.name.charAt(0)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5"><p className="text-lg font-bold text-[#10274f]">{operator.name}</p><BadgeCheck size={17} className="text-[#2f70ff]" /></div>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-amber-500"><Star size={13} fill="currentColor" />4.9 <span className="text-slate-400">(128 ulasan)</span></p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Calendar size={11} /> Bergabung {operator.joined}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[["Trip", String(operator.trips.length)], ["Terbawa", `${operator.totalKg.toFixed(0)} kg`], ["Selesai", String(operator.completed)], ["Slot terbuka", String(operator.openTrips.length)]].map(([k, v]) => (
                <div key={k as string} className="bg-slate-50 p-3"><p className="text-lg font-bold text-[#10274f]">{v}</p><p className="text-[10px] uppercase tracking-widest text-slate-400">{k}</p></div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Slot jastip terbuka</p>
              <div className="space-y-2">
                {operator.openTrips.length === 0 && <p className="bg-slate-50 p-3 text-sm italic text-slate-400">Semua slot sedang SOLD OUT / FULL.</p>}
                {operator.openTrips.map((t) => {
                  const av = availableOf(t);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 border border-slate-100 p-3">
                      <div>
                        <p className="flex items-center gap-1 text-sm font-bold text-[#10274f]"><MapPin size={12} className="text-[#0ea5e9]" />{t.from} → {t.to}</p>
                        <p className="text-xs text-slate-500">{t.date} • {t.airline} • sisa efektif {av.toFixed(1)} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#173e82]">{idr(t.pricePerKg)}<span className="text-[10px] font-normal text-slate-400">/kg</span></p>
                        {av > 0
                          ? <button onClick={() => { setOperatorId(null); goToBooking(t); }} className="mt-1 text-xs font-bold text-[#2f70ff] hover:underline">Booking slot →</button>
                          : <span className="mt-1 inline-block text-xs font-bold text-red-400">FULL</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Ulasan pelanggan</p>
              <div className="space-y-2">
                {REVIEWS.map((r) => (
                  <div key={r.name} className="bg-slate-50 p-3">
                    <div className="flex items-center justify-between"><p className="text-sm font-bold text-[#10274f]">{r.name}</p><div className="flex gap-0.5">{Array.from({ length: r.stars }).map((_, i) => <Star key={i} size={11} fill="currentColor" className="text-amber-400" />)}</div></div>
                    <p className="mt-1 text-xs text-slate-600">"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Merchant profile */}
      <Modal open={!!shop} onClose={() => setShopId(null)} title="Profile Merchant">
        {shop && (
          <div className="space-y-5">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#fff7ed] text-2xl font-bold text-[#f59e0b]">{shop.name.charAt(0)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5"><p className="text-lg font-bold text-[#10274f]">{shop.name}</p><BadgeCheck size={17} className="text-[#f59e0b]" /></div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Truck size={11} /> Berbasis di Australia • Pengiriman via konsolidasi BagasiShare</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Calendar size={11} /> Bergabung {shop.joined}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Produk aktif", String(shop.activeProducts.length)], ["Total terjual", String(shop.totalSold)], ["Katalog", String(shop.products.length)]].map(([k, v]) => (
                <div key={k as string} className="bg-slate-50 p-3"><p className="text-lg font-bold text-[#10274f]">{v}</p><p className="text-[10px] uppercase tracking-widest text-slate-400">{k}</p></div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Produk dijual</p>
              <div className="space-y-2">
                {shop.activeProducts.length === 0 && <p className="bg-slate-50 p-3 text-sm italic text-slate-400">Semua produk sedang dinonaktifkan.</p>}
                {shop.activeProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 border border-slate-100 p-3">
                    <div>
                      <p className="text-sm font-bold text-[#10274f]">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.category} • stok {p.stock} • {p.sold} terjual</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#173e82]">AUD {p.priceAUD}</p>
                      {p.stock > 0
                        ? <button onClick={() => { setShopId(null); setBuyTarget(p); setBuyQty(1); }} className="mt-1 text-xs font-bold text-[#f59e0b] hover:underline">Beli →</button>
                        : <span className="mt-1 inline-block text-xs font-bold text-red-400">Habis</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Buy modal */}
      <Modal open={!!buyTarget} onClose={() => setBuyTarget(null)} title="Checkout produk">
        {buyTarget && buyBreakdown && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-[#fff7ed] p-4">
              <ShoppingBag size={18} className="mt-0.5 text-[#f59e0b]" />
              <div className="flex-1">
                <p className="font-bold text-[#10274f]">{buyTarget.name}</p>
                <p className="text-xs text-slate-500">AUD {buyTarget.priceAUD}/pcs ≈ {idr(buyTarget.priceAUD * AUD_RATE)} • stok {buyTarget.stock}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))} className="grid h-8 w-8 place-items-center border border-slate-200 bg-white hover:border-[#f59e0b]"><Minus size={13} /></button>
                <span className="w-8 text-center font-bold text-[#10274f]">{buyQty}</span>
                <button onClick={() => setBuyQty(Math.min(buyTarget.stock, buyQty + 1))} className="grid h-8 w-8 place-items-center border border-slate-200 bg-white hover:border-[#f59e0b]"><Plus size={13} /></button>
              </div>
            </div>
            <div className="space-y-2 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Harga barang ({buyQty} × AUD {buyTarget.priceAUD})</span><b className="text-[#10274f]">{idr(buyBreakdown.productCost)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Ongkir internasional (est. {buyBreakdown.weightKg} kg)</span><b className="text-[#10274f]">{idr(buyBreakdown.freight)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Ongkir domestik (JNE/GoSend)</span><b className="text-[#10274f]">{idr(DOMESTIC_FEE)}</b></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-[#10274f]">Total tagihan</span><b className="text-lg text-[#173e82]">{idr(buyBreakdown.total)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Saldo kamu</span><b className={wallet.balance >= buyBreakdown.total ? "text-green-600" : "text-red-500"}>{idr(wallet.balance)}</b></div>
            </div>
            <PrimaryBtn onClick={submitBuy} className="w-full !bg-[#f59e0b] !py-4 hover:!bg-[#d97706]">Bayar {idr(buyBreakdown.total)} <ArrowRight size={16} /></PrimaryBtn>
            <p className="text-center text-[11px] text-slate-400">Invoice gabungan: Harga Barang + Ongkir Internasional + Ongkir Domestik.</p>
          </div>
        )}
      </Modal>

      {/* Request modal (open bidding) */}
      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Buat request jastip (Open Bidding)">
        <div className="space-y-4">
          <p className="border border-dashed border-[#7c3aed]/40 bg-[#f3e8ff] p-3 text-xs text-[#7c3aed]">Request kamu akan tampil di papan Open Bidding. Traveler dengan rute yang cocok bisa mengambilnya dan membelikan barangmu. Dana escrow terkunci hanya saat ada yang menerima.</p>
          <Field label="Nama barang"><TextInput placeholder="cth: Vitamin Blackmores Omega 200 caps" value={rItem} onChange={(e) => setRItem(e.target.value)} /></Field>
          <Field label="Detail & catatan untuk traveler"><textarea rows={3} value={rDesc} onChange={(e) => setRDesc(e.target.value)} className="w-full border border-[#dce2eb] p-3 text-sm outline-none focus:border-[#7c3aed]" placeholder="Varian, warna, ukuran, toko yang bisa dikunjungi, dll..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jumlah (pcs)"><TextInput type="number" min="1" value={rQty} onChange={(e) => setRQty(e.target.value)} /></Field>
            <Field label="Kota tujuan"><TextInput placeholder="cth: Jakarta" value={rCity} onChange={(e) => setRCity(e.target.value)} /></Field>
            <Field label="Est. harga barang total (Rp)"><TextInput type="number" min="1000" value={rPrice} onChange={(e) => setRPrice(e.target.value)} /></Field>
            <Field label="Est. berat (kg)"><TextInput type="number" min="0.1" step="0.1" value={rWeight} onChange={(e) => setRWeight(e.target.value)} /></Field>
          </div>
          <Field label="Fee jastip yang kamu tawarkan (Rp)"><TextInput type="number" min="0" value={rFee} onChange={(e) => setRFee(e.target.value)} /></Field>
          <div className="space-y-1 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Estimasi harga barang</span><b>{idr(Number(rPrice) || 0)}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Fee jastip (bid)</span><b>{idr(Number(rFee) || 0)}</b></div>
            <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-bold">Total invoice (di-escrow saat diambil)</span><b className="text-[#173e82]">{idr((Number(rPrice) || 0) + (Number(rFee) || 0))}</b></div>
          </div>
          <PrimaryBtn onClick={submitRequest} className="w-full !bg-[#7c3aed] !py-4 hover:!bg-[#6d28d9]">Kirim ke Open Bidding</PrimaryBtn>
        </div>
      </Modal>

      {/* Booking modal (blueprint 2 & 3 + multi item + handover + domestic) */}
      <Modal open={!!bookingTrip} onClose={() => {
        if (bookingTrip && user) releaseUserLocks(user.id, bookingTrip.id);
        setLockId(null);
        setBookingTrip(null);
      }} title="Booking slot bagasi" maxW="max-w-2xl">
        {bookingTrip && (
          <div className="space-y-5">
            <div className="flex items-start gap-4 bg-[#eef4ff] p-4">
              <Star size={16} className="mt-1 text-amber-500" fill="currentColor" />
              <div className="flex-1"><p className="font-bold text-[#10274f]">{bookingTrip.travelerName}</p><p className="text-xs text-slate-500">{bookingTrip.from} → {bookingTrip.to} • {bookingTrip.date} • {bookingTrip.airline}</p></div>
              <GhostBtn onClick={() => { const id = bookingTrip.travelerId; releaseUserLocks(user.id, bookingTrip.id); setBookingTrip(null); setOperatorId(id); }} className="!py-1.5 !text-[10px]"><UserIcon size={11} /> Profile</GhostBtn>
            </div>

            {myLock ? (
              <div className="flex items-center justify-between border border-dashed border-[#2f70ff] bg-[#eef4ff] px-4 py-3 text-sm">
                <span className="flex items-center gap-2 font-semibold text-[#173e82]"><Lock size={14} /> Kuota terkunci sementara</span>
                <span className="font-mono font-bold text-[#173e82]">{lockMM}:{lockSS}</span>
              </div>
            ) : (
              <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">Slot sedang dikunci user lain atau sisa kuota tidak cukup. Kurangi dimensi/berat untuk melanjutkan.</p>
            )}

            {/* ITEMS LIST */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Daftar barang yang dikirim</p>
                <button onClick={addItemRow} className="flex items-center gap-1 text-xs font-bold text-[#2f70ff] hover:underline"><Plus size={13} /> Tambah barang</button>
              </div>
              <div className="space-y-3">
                {bItems.map((it, idx) => (
                  <div key={it.id} className="grid grid-cols-[64px_1fr_auto] gap-3 border border-slate-100 bg-slate-50 p-3">
                    <label className="grid h-16 w-16 cursor-pointer place-items-center overflow-hidden border-2 border-dashed border-slate-300 bg-white text-slate-400 hover:border-[#2f70ff]">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItemPhoto(it.id, f); }} />
                      {it.photo ? <img src={it.photo} alt={it.name} className="h-full w-full object-cover" /> : <ImageIcon size={20} />}
                    </label>
                    <div className="grid gap-2">
                      <div className="flex gap-2">
                        <TextInput placeholder={`Nama barang #${idx + 1}`} value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
                        <input type="number" min={1} value={it.qty} onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })} className="field-input w-20 text-center" />
                      </div>
                      <TextInput placeholder="Catatan (opsional): warna, varian, dll" value={it.note} onChange={(e) => updateItem(it.id, { note: e.target.value })} />
                    </div>
                    <button onClick={() => removeItemRow(it.id)} disabled={bItems.length === 1} className="grid h-8 w-8 place-items-center self-start text-slate-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">Setiap barang wajib disertai foto sebagai dokumentasi sebelum dikirim.</p>
            </div>

            {/* DIMENSIONS */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Berat riil total (kg)"><TextInput type="number" min="0.1" step="0.1" value={bReal} onChange={(e) => setBReal(e.target.value)} /></Field>
              <Field label="Nilai barang total (Rp)"><TextInput type="number" min="0" value={bValue} onChange={(e) => setBValue(e.target.value)} /></Field>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Dimensi paket (cm) — untuk berat volume</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <TextInput type="number" min="1" value={bL} onChange={(e) => setBL(e.target.value)} placeholder="Panjang" />
                <TextInput type="number" min="1" value={bW} onChange={(e) => setBW(e.target.value)} placeholder="Lebar" />
                <TextInput type="number" min="1" value={bH} onChange={(e) => setBH(e.target.value)} placeholder="Tinggi" />
              </div>
            </div>

            {/* HANDOVER METHOD */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Cara serah terima ke traveler</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(handoverLabels) as HandoverMethod[]).map((m) => {
                  const HI = HANDOVER_ICONS[m];
                  return (
                    <button key={m} onClick={() => setHandover(m)} className={`flex flex-col items-center gap-1.5 border p-3 text-center transition ${handover === m ? "border-[#2f70ff] bg-[#eef4ff]" : "border-slate-200 hover:border-[#2f70ff]/50"}`}>
                      <HI size={18} className={handover === m ? "text-[#2f70ff]" : "text-slate-400"} />
                      <span className="text-[11px] font-bold leading-tight text-[#10274f]">{handoverLabels[m]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{handoverHints[handover]}</p>
              <TextInput className="mt-2" placeholder={
                handover === "pos" ? "Alamat/PO Box tujuan pos" :
                handover === "antar_rumah" ? "Alamat rumah traveler" :
                handover === "toko_indo" ? "Nama & alamat toko Indo" : "Titik ketemuan + jam"
              } value={handoverDetail} onChange={(e) => setHandoverDetail(e.target.value)} />
            </div>

            {/* DOMESTIC DELIVERY */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Pengiriman domestik saat tiba di Indonesia</p>
              <TextArea placeholder="Alamat lengkap penerima di kota tujuan..." value={domesticAddress} onChange={(e) => setDomesticAddress(e.target.value)} />
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(COURIER_INFO) as DomesticCourier[]).map((c) => (
                  <button key={c} onClick={() => setCourier(c)} className={`border p-2.5 text-center transition ${courier === c ? "border-[#f59e0b] bg-[#fff7ed]" : "border-slate-200 hover:border-[#f59e0b]/50"}`}>
                    <p className="text-xs font-bold text-[#10274f]">{c}</p>
                    <p className="text-[10px] text-slate-400">{COURIER_INFO[c].eta}</p>
                    <p className="mt-1 text-[11px] font-bold text-[#f59e0b]">{idr(estimateDomesticCost(c, chargeable))}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* calc panel */}
            <div className="space-y-2 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Berat riil</span><b className="text-[#10274f]">{real.toFixed(1)} kg</b></div>
              <div className="flex justify-between"><span className="flex items-center gap-1 text-slate-500"><Box size={13} /> Berat volume (P×L×T ÷ 6000)</span><b className="text-[#10274f]">{vol.toFixed(1)} kg</b></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-[#10274f]">Chargeable (dibulatkan ke atas)</span><b className="text-[#2f70ff]">{chargeable} kg</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Sisa kuota efektif</span><b className={chargeable <= modalAvail ? "text-green-600" : "text-red-500"}>{modalAvail.toFixed(1)} kg</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Fee jastip {idr(bookingTrip.pricePerKg)}/kg × {chargeable} kg</span><b className="text-[#10274f]">{idr(jastipFee)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Ongkir domestik ({courier})</span><b className="text-[#10274f]">{idr(domesticCost)}</b></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-[#10274f]">Total tagihan</span><b className="text-lg text-[#173e82]">{idr(bookingTotal)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Saldo kamu</span><b className={wallet.balance >= bookingTotal ? "text-green-600" : "text-red-500"}>{idr(wallet.balance)}</b></div>
            </div>

            <PrimaryBtn onClick={submitBooking} disabled={!myLock || chargeable > modalAvail} className="w-full !py-4">Bayar & Booking <ArrowRight size={16} /></PrimaryBtn>
            <p className="text-center text-[11px] text-slate-400">Sistem memotong kuota berdasarkan nilai terbesar antara berat riil & berat volume. Lock akan dilepas otomatis jika pembayaran tidak diselesaikan dalam 30 menit.</p>
          </div>
        )}
      </Modal>

      {/* Dispute modal */}
      <Modal open={!!disputeFor} onClose={() => setDisputeFor(null)} title="Ajukan komplain">
        {disputeFor && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 text-sm">Kiriman: <b>{disputeFor.code}</b> — {disputeFor.item}</div>
            <Field label="Topik masalah"><TextInput placeholder="cth: Selisih berat / barang rusak" value={dTopic} onChange={(e) => setDTopic(e.target.value)} /></Field>
            <Field label="Detail kronologi"><textarea rows={4} value={dDetail} onChange={(e) => setDDetail(e.target.value)} className="w-full border border-[#dce2eb] p-3 text-sm outline-none focus:border-[#2f70ff]" placeholder="Jelaskan kejadian secara detail..." /></Field>
            <PrimaryBtn onClick={submitDispute} className="w-full !bg-[#dc2626] !py-4 hover:!bg-[#b91c1c]">Kirim komplain</PrimaryBtn>
          </div>
        )}
      </Modal>

      {/* Cancel confirm modal (underpaid refusal) */}
      <Modal open={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Batalkan booking?">
        {cancelConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Kamu menolak melunasi invoice tambahan. Booking <b>{cancelConfirm.code}</b> akan dibatalkan sepihak dan escrow
              <b> {idr(cancelConfirm.price)}</b> dikembalikan <b>setelah dipotong biaya administrasi gudang {idr(WAREHOUSE_ADMIN_FEE)}</b>.
            </p>
            <div className="bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span>Escrow booking</span><b>{idr(cancelConfirm.price)}</b></div>
              <div className="flex justify-between"><span>Biaya administrasi</span><b className="text-red-500">-{idr(WAREHOUSE_ADMIN_FEE)}</b></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1"><span>Diterima kembali</span><b className="text-green-600">{idr(Math.max(0, cancelConfirm.price - WAREHOUSE_ADMIN_FEE))}</b></div>
            </div>
            <div className="flex gap-2">
              <PrimaryBtn className="!bg-[#dc2626] hover:!bg-[#b91c1c]" onClick={() => {
                cancelPaidShipment(user, cancelConfirm.id);
                toast.push("Booking dibatalkan, refund diproses ke dompet.", "info");
                setCancelConfirm(null);
              }}>Ya, batalkan</PrimaryBtn>
              <GhostBtn onClick={() => setCancelConfirm(null)}>Kembali</GhostBtn>
            </div>
          </div>
        )}
      </Modal>

      {/* Shipment detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Detail ${detail?.code ?? ""}`}>
        {detail && (
          <div className="space-y-4 text-sm">
            {detail.items?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Daftar barang</p>
                <div className="space-y-2">
                  {detail.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 border border-slate-100 bg-slate-50 p-2.5">
                      {it.photo ? <img src={it.photo} alt={it.name} className="h-12 w-12 rounded object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded bg-slate-200"><Box size={16} className="text-slate-400" /></span>}
                      <div><p className="font-bold text-[#10274f]">{it.name} × {it.qty}</p>{it.note && <p className="text-xs text-slate-500">{it.note}</p>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {[["Rute", detail.route], ["Chargeable weight", `${detail.weight} kg`],
              ...(detail.weightReal !== undefined ? [["Berat riil (input)", `${detail.weightReal} kg`]] : []),
              ...(typeof detail.volumetricKg === "number" ? [["Berat volume", `${detail.volumetricKg} kg`]] : []),
              ...(detail.lengthCm ? [["Dimensi", `${detail.lengthCm} × ${detail.widthCm} × ${detail.heightCm} cm`]] : []),
              ...(detail.actualWeight ? [["Berat aktual (verifikasi)", `${detail.actualWeight} kg`]] : []),
              ...(detail.itemCount ? [["Jumlah item", `${detail.itemCount} pcs`]] : []),
              ...(detail.manifestNote ? [["Catatan manifest", detail.manifestNote]] : []),
              ...(detail.handoverMethod ? [["Serah terima", `${handoverLabels[detail.handoverMethod]} — ${detail.handoverDetail}`]] : []),
              ...(detail.domesticCourier ? [["Kurir domestik", `${COURIER_INFO[detail.domesticCourier].label} (${idr(detail.domesticCost ?? 0)})`]] : []),
              ...(detail.domesticAddress ? [["Alamat tujuan", detail.domesticAddress]] : []),
              ["Nilai barang", idr(detail.value)], ["Fee jastip", idr(detail.price)],
              ...(detail.totalPaid !== undefined ? [["Total dibayar", idr(detail.totalPaid)]] : []),
              ...((detail.underpaid ?? 0) > 0 ? [["Invoice tambahan", idr(detail.underpaid!)]] : []),
              ...(detail.resi ? [["Nomor resi", detail.resi]] : [])].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4 border-b border-slate-100 pb-2.5"><span className="shrink-0 text-slate-500">{k}</span><b className="max-w-[65%] text-right text-[#10274f]">{v}</b></div>
            ))}
            {detail.receiverProofPhotos && detail.receiverProofPhotos.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Bukti terima traveler {detail.receiverProofVerified && <span className="text-green-600">(terverifikasi)</span>}</p>
                <div className="flex flex-wrap gap-2">{detail.receiverProofPhotos.map((ph, i) => <img key={i} src={ph} alt={`bukti ${i + 1}`} className="h-20 w-20 rounded object-cover" />)}</div>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500">Traveler</span>
              <button onClick={() => { const id = detail.travelerId; setDetail(null); setOperatorId(id); }} className="flex items-center gap-1 font-bold text-[#2f70ff] hover:underline">{detail.travelerName} <UserIcon size={13} /></button>
            </div>
          </div>
        )}
      </Modal>

      {/* Top up modal */}
      <Modal open={topUpOpen} onClose={() => setTopUpOpen(false)} title="Top up saldo">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {["250000", "500000", "1000000"].map((v) => (
              <button key={v} onClick={() => setTopUpAmt(v)} className={`border py-3 text-sm font-bold transition ${topUpAmt === v ? "border-[#2f70ff] bg-[#eef4ff] text-[#173e82]" : "border-slate-200 text-slate-500"}`}>{idr(Number(v))}</button>
            ))}
          </div>
          <Field label="Atau nominal lain (Rp)"><TextInput type="number" min="10000" value={topUpAmt} onChange={(e) => setTopUpAmt(e.target.value)} /></Field>
          <PrimaryBtn className="w-full !py-4" onClick={submitTopUp}>Top up sekarang</PrimaryBtn>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
