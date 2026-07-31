import { useState } from "react";
import { Home, Plane, PackageCheck, Wallet, Calendar, Star, MapPin, ScanLine, PlusCircle, DollarSign, Scale, SendHorizonal, Pencil, Trash2, Ban, RotateCcw, ShieldCheck, ShieldAlert, Lock, ClipboardList, ImageIcon, HandHelping, Clock3, Box, Truck, Mailbox, Home as HomeIcon, Building2, Users } from "lucide-react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../auth/AuthContext";
import { useData, Trip, Shipment, JastipRequest, HandoverMethod, shipmentLabels, shipmentColors, saleCapacityOf, handoverLabels, COURIER_INFO, TRAVELER_DEPOSIT } from "../../data/store";
import { useToast } from "../../components/Toast";
import { Pill, StatCard, Modal, Field, TextInput, TextArea, EmptyState, PrimaryBtn, GhostBtn, SectionCard, idr } from "../../components/ui";

const HANDOVER_ICONS: Record<HandoverMethod, typeof Mailbox> = {
  pos: Mailbox, antar_rumah: HomeIcon, toko_indo: Building2, meet_city: Users,
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const navItems = [
  { id: "home", label: "Beranda", icon: Home },
  { id: "requests", label: "Open Bidding", icon: ClipboardList },
  { id: "trips", label: "Trip Saya", icon: Plane },
  { id: "packages", label: "Barang Diterima", icon: PackageCheck },
  { id: "scan", label: "Scan Manifest", icon: ScanLine },
  { id: "wallet", label: "Dompet", icon: Wallet },
];

const tripStatusColor: Record<string, string> = { aktif: "#22c55e", penuh: "#f59e0b", selesai: "#2f70ff", batal: "#dc2626" };

interface TripForm {
  from: string; to: string; date: string; airline: string; flightNo: string; quotaKg: string; pricePerKg: string;
}
const emptyTripForm: TripForm = { from: "", to: "", date: "", airline: "", flightNo: "", quotaKg: "20", pricePerKg: "155000" };

export default function TravelerDashboard() {
  const { user } = useAuth();
  const { state, addTrip, updateTrip, deleteTrip, verifyManifest, advanceShipment, withdraw, openDispute, reportOverload, acceptRequest, uploadProof } = useData();
  const toast = useToast();
  const [activeNav, setActiveNav] = useState("home");

  const [overloadOpen, setOverloadOpen] = useState(false);
  const [overloadTripId, setOverloadTripId] = useState("");
  const [overloadAmount, setOverloadAmount] = useState("250000");

  // open bidding
  const [acceptTarget, setAcceptTarget] = useState<JastipRequest | null>(null);
  const [acceptTripId, setAcceptTripId] = useState("");
  const [proofTarget, setProofTarget] = useState<JastipRequest | null>(null);
  const [proofImage, setProofImage] = useState("");
  const [proofNote, setProofNote] = useState("");

  const [tripModal, setTripModal] = useState<"create" | "edit" | null>(null);
  const [editTripId, setEditTripId] = useState<string | null>(null);
  const [form, setForm] = useState<TripForm>(emptyTripForm);

  const [verifyTarget, setVerifyTarget] = useState<Shipment | null>(null);
  const [vWeight, setVWeight] = useState("0");
  const [vCount, setVCount] = useState("1");
  const [vNote, setVNote] = useState("");
  const [vPhotos, setVPhotos] = useState<string[]>([]);

  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<Shipment | null>(null);
  const [scanErr, setScanErr] = useState("");

  const [disputeFor, setDisputeFor] = useState<Shipment | null>(null);
  const [disputeTopic, setDisputeTopic] = useState("");

  if (!user) return null;

  const myTrips = state.trips.filter((t) => t.travelerId === user.id);
  const tripIds = new Set(myTrips.map((t) => t.id));
  const myShipments = state.shipments.filter((s) => tripIds.has(s.tripId));
  const wallet = state.wallets[user.id] ?? { balance: 0, pending: 0, deposit: TRAVELER_DEPOSIT, ledger: [] };
  const activeTrips = myTrips.filter((t) => t.status === "aktif");
  const totalBooked = myTrips.reduce((a, t) => a + t.bookedKg, 0);
  const needVerify = myShipments.filter((s) => !s.manifestReady);
  const readyFly = myShipments.filter((s) => s.status === "manifest_disetujui");

  function openCreateTrip() {
    setForm(emptyTripForm);
    setEditTripId(null);
    setTripModal("create");
  }
  function openEditTrip(t: Trip) {
    setForm({ from: t.from, to: t.to, date: t.date, airline: t.airline, flightNo: t.flightNo, quotaKg: String(t.quotaKg), pricePerKg: String(t.pricePerKg) });
    setEditTripId(t.id);
    setTripModal("edit");
  }
  function submitTrip() {
    if (!user) return;
    if (!form.from || !form.to || !form.date || !form.airline) return void toast.push("Lengkapi data trip dulu.", "err");
    const quotaKg = Number(form.quotaKg), pricePerKg = Number(form.pricePerKg);
    if (quotaKg <= 0 || pricePerKg <= 0) return void toast.push("Kuota & tarif harus lebih dari 0.", "err");
    if (tripModal === "create") {
      addTrip(user, { ...form, quotaKg, pricePerKg });
      toast.push(`Trip ${form.from} → ${form.to} dibuat.`);
    } else if (editTripId) {
      updateTrip(editTripId, { ...form, quotaKg, pricePerKg });
      toast.push("Trip diperbarui.");
    }
    setTripModal(null);
  }
  function openVerify(s: Shipment) {
    setVerifyTarget(s);
    setVWeight(String(s.weight));
    setVCount(String(s.itemCount ?? s.items?.length ?? 1));
    setVNote("");
    setVPhotos([]);
  }
  function submitVerify() {
    if (!verifyTarget) return;
    const w = Number(vWeight), c = Number(vCount);
    if (w <= 0 || c <= 0) return void toast.push("Berat & jumlah item harus valid.", "err");
    if (vPhotos.length === 0) return void toast.push("Wajib upload minimal 1 foto bukti terima barang.", "err");
    verifyManifest(verifyTarget.id, w, c, vNote, vPhotos);
    toast.push(`Manifest & bukti terima ${verifyTarget.code} terkirim. Menunggu verifikasi pengirim sebelum terbang.`);
    setVerifyTarget(null);
  }
  async function handleVerifyPhoto(file: File) {
    if (!file.type.startsWith("image/")) return void toast.push("File harus gambar (JPG/PNG).", "err");
    if (file.size > 800 * 1024) return void toast.push("Ukuran foto maksimal 800KB.", "err");
    const dataUrl = await fileToDataUrl(file);
    setVPhotos((prev) => [...prev, dataUrl]);
  }
  function runScan() {
    const code = scanInput.trim().toUpperCase();
    if (!code) return;
    const found = state.shipments.find((s) => s.code.toUpperCase() === code);
    if (!found) { setScanErr(`Kode ${code} tidak ditemukan.`); setScanResult(null); return; }
    if (!tripIds.has(found.tripId)) { setScanErr(`Kode ${code} bukan milik trip kamu.`); setScanResult(null); return; }
    setScanErr("");
    setScanResult(found);
  }

  function submitAccept() {
    if (!user || !acceptTarget || !acceptTripId) return void toast.push("Pilih trip untuk request ini.", "err");
    const res = acceptRequest(user, acceptTarget.id, acceptTripId);
    toast.push(res.message, res.ok ? "ok" : "err");
    if (res.ok) { setAcceptTarget(null); setAcceptTripId(""); setActiveNav("packages"); }
  }

  function submitProof() {
    if (!proofTarget || !user) return;
    if (!proofImage) return void toast.push("Foto bukti penerimaan wajib diupload.", "err");
    uploadProof(user, proofTarget.id, proofImage, proofNote.trim() || "Bukti penerimaan/pembelian barang.");
    toast.push("Bukti terkirim ke customer. Menunggu persetujuan mereka.");
    setProofTarget(null); setProofImage(""); setProofNote("");
  }

  function handleProofFile(file: File) {
    if (!file.type.startsWith("image/")) return void toast.push("File harus gambar (JPG/PNG).", "err");
    if (file.size > 800 * 1024) return void toast.push("Ukuran gambar maksimal 800KB agar tersimpan cepat.", "err");
    const reader = new FileReader();
    reader.onload = () => setProofImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  const openRequests = (state.requests ?? []).filter((r) => r.status === "open");
  function tripsWithSpace(kg: number) {
    return myTrips.filter((t) => t.status === "aktif" && t.saleCapacityKg - t.bookedKg >= kg);
  }

  return (
    <DashboardLayout navItems={navItems} activeNav={activeNav} onNavChange={setActiveNav} title="Dashboard Traveler" subtitle="Kelola trip & kapasitas bagasi kamu">
      {activeNav === "home" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Rating" value="4.9" sub="Dari 128 ulasan" icon={Star} color="#f59e0b" />
            <StatCard label="Trip Aktif" value={String(activeTrips.length)} sub={`${myTrips.length} total trip`} icon={Plane} color="#0ea5e9" />
            <StatCard label="Kg Terisi" value={totalBooked.toFixed(1)} sub="Di semua trip" icon={PackageCheck} color="#2f70ff" />
            <StatCard label="Pending Pencairan" value={idr(wallet.pending)} sub="Siap ditarik" icon={DollarSign} color="#22c55e" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard title="Trip mendatang" action={<button onClick={() => setActiveNav("trips")} className="text-xs font-bold text-[#0ea5e9]">Kelola trip</button>}>
              <div className="divide-y divide-slate-100">
                {myTrips.length === 0 && <div className="p-6 text-sm text-slate-400">Belum ada trip. Buat trip pertamamu.</div>}
                {myTrips.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef4ff]"><Plane size={17} className="-rotate-45 text-[#0ea5e9]" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate font-bold text-[#10274f]">{t.from} → {t.to}</p><p className="text-xs text-slate-500"><Calendar size={11} className="mr-1 inline" />{t.date} • {t.airline} {t.flightNo}</p></div>
                    <div className="text-right"><p className="text-[10px] uppercase text-slate-400">Terjual</p><p className="text-sm font-bold text-[#10274f]">{t.bookedKg.toFixed(1)} / {t.saleCapacityKg} kg</p><p className="text-[10px] text-slate-400">buffer {(t.quotaKg - t.saleCapacityKg).toFixed(1)} kg terkunci</p></div>
                    <Pill color={tripStatusColor[t.status]}>{t.status}</Pill>
                  </div>
                ))}
              </div>
            </SectionCard>
            <div className="bg-gradient-to-br from-[#0ea5e9] to-[#173e82] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Buka slot baru</p>
              <h3 className="mt-2 text-2xl font-bold">Punya penerbangan?</h3>
              <p className="mt-3 text-sm text-white/70">Buka kapasitas bagasi tersisa & hasilkan penghasilan tambahan dari rute kamu.</p>
              <button onClick={openCreateTrip} className="mt-6 flex w-full items-center justify-center gap-2 bg-white py-3 text-sm font-bold text-[#173e82]"><PlusCircle size={16} /> Buat Trip</button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title={`Butuh verifikasi (${needVerify.length})`}>
              <div className="divide-y divide-slate-100">
                {needVerify.length === 0 && <div className="p-6 text-sm text-slate-400">Semua manifest sudah diverifikasi.</div>}
                {needVerify.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-6 py-4">
                    <div><p className="font-bold text-[#10274f]">{s.item}</p><p className="text-xs text-slate-500">{s.code} • {s.weight} kg • dari {s.customerName}</p></div>
                    <PrimaryBtn onClick={() => openVerify(s)} className="!py-2.5 !text-xs"><Scale size={14} /> Timbang</PrimaryBtn>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title={`Siap diberangkatkan (${readyFly.length})`}>
              <div className="divide-y divide-slate-100">
                {readyFly.length === 0 && <div className="p-6 text-sm text-slate-400">Belum ada barang yang siap terbang.</div>}
                {readyFly.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-6 py-4">
                    <div><p className="font-bold text-[#10274f]">{s.item}</p><p className="text-xs text-slate-500">{s.code} • manifest disetujui</p></div>
                    <PrimaryBtn onClick={() => { advanceShipment(s.id, "on_flight"); toast.push(`${s.code} diberangkatkan.`); }} className="!bg-[#0ea5e9] !py-2.5 !text-xs hover:!bg-[#0284c7]"><SendHorizonal size={14} /> Terbangkan</PrimaryBtn>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ============================ OPEN BIDDING ============================ */}
      {activeNav === "requests" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#7c3aed] to-[#2f70ff] p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Open Bidding Board</p>
            <h3 className="mt-1 text-xl font-bold">Request jastip dari customer</h3>
            <p className="mt-1 text-sm text-white/70">Ambil permintaan yang paling menguntungkan untuk rute kamu. Membelikan barang mereka = pendapatan barang + fee jastip.</p>
          </div>
          <p className="text-sm text-slate-500">{openRequests.length} request menunggu diambil</p>
          {openRequests.length === 0 && <EmptyState icon={ClipboardList} title="Papan bidding kosong" desc="Request customer akan muncul di sini secara real-time." />}
          <div className="grid gap-4 lg:grid-cols-2">
            {openRequests.map((r) => (
              <div key={r.id} className="flex flex-col bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[#eef4ff] font-bold text-[#2f70ff]">{r.customerName.charAt(0)}</span>
                    <div><p className="font-bold text-[#10274f]">{r.item}</p><p className="text-xs text-slate-500">dari {r.customerName} • {r.code}</p></div>
                  </div>
                  <Pill color="#7c3aed">× {r.qty} pcs</Pill>
                </div>
                <p className="mt-3 flex-1 border-l-2 border-slate-200 pl-3 text-sm text-slate-600">{r.desc}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5"><p className="text-slate-400">Harga barang</p><b className="text-[#10274f]">{idr(r.estPrice)}</b></div>
                  <div className="bg-slate-50 p-2.5"><p className="text-slate-400">Est. berat</p><b className="text-[#10274f]">{r.estWeight} kg</b></div>
                  <div className="bg-slate-50 p-2.5"><p className="text-slate-400">Tujuan</p><b className="text-[#10274f]">{r.cityTarget}</b></div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded bg-[#f3e8ff] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#7c3aed]">Fee ditawarkan</span>
                  <span className="text-lg font-bold text-[#7c3aed]">{idr(r.offeredFee)}</span>
                </div>
                <PrimaryBtn onClick={() => { setAcceptTarget(r); setAcceptTripId(tripsWithSpace(r.estWeight)[0]?.id ?? ""); }} className="mt-4 !bg-[#22c55e] !py-3.5 hover:!bg-[#16a34a]">
                  <HandHelping size={16} /> Ambil & belikan barang ini
                </PrimaryBtn>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeNav === "trips" && (
        <div className="space-y-4">
          <div className="flex justify-end"><PrimaryBtn onClick={openCreateTrip}><PlusCircle size={16} /> Trip baru</PrimaryBtn></div>
          {myTrips.length === 0 && <EmptyState icon={Plane} title="Belum ada trip" desc="Buat trip perdanamu dan mulai terima booking." action={<PrimaryBtn onClick={openCreateTrip}>Buat trip</PrimaryBtn>} />}
          {myTrips.map((t) => (
            <div key={t.id} className="bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef4ff]"><Plane size={18} className="-rotate-45 text-[#0ea5e9]" /></span>
                  <div><p className="font-bold text-[#10274f]">{t.from} → {t.to}</p><p className="text-xs text-slate-500"><MapPin size={11} className="mr-1 inline" />{t.airline} {t.flightNo} • {t.date}</p></div>
                </div>
                <Pill color={tripStatusColor[t.status]}>{t.status}</Pill>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Kuota dijual (85% dari {t.quotaKg} kg input)</span>
                  <b className="text-[#10274f]">{t.bookedKg.toFixed(1)} dari {t.saleCapacityKg} kg (Q_sale)</b>
                </div>
                <div className="mt-2 flex gap-1">
                  <div className="h-2 flex-[0.85] overflow-hidden bg-slate-100"><div className="h-full bg-[#0ea5e9]" style={{ width: `${Math.min(100, (t.bookedKg / t.saleCapacityKg) * 100)}%` }} /></div>
                  <div className="h-2 flex-[0.15] bg-slate-200" title={`Buffer zone ${(t.quotaKg - t.saleCapacityKg).toFixed(1)} kg`} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                  <span>Terjual {Math.round((t.bookedKg / t.saleCapacityKg) * 100)}% dari kuota efektif</span>
                  <span className="flex items-center gap-1"><Lock size={9} /> buffer 15%: {(t.quotaKg - t.saleCapacityKg).toFixed(1)} kg</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <GhostBtn onClick={() => openEditTrip(t)}><Pencil size={13} /> Edit</GhostBtn>
                {t.status === "aktif" && <GhostBtn onClick={() => { updateTrip(t.id, { status: "batal" }); toast.push("Trip dibatalkan.", "info"); }}><Ban size={13} /> Batalkan</GhostBtn>}
                {t.status === "batal" && <GhostBtn onClick={() => updateTrip(t.id, { status: "aktif" })}><RotateCcw size={13} /> Aktifkan lagi</GhostBtn>}
                {t.bookedKg === 0 && <GhostBtn onClick={() => { deleteTrip(t.id); toast.push("Trip dihapus.", "info"); }} className="!border-red-200 !text-red-600"><Trash2 size={13} /> Hapus</GhostBtn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeNav === "packages" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{myShipments.length} barang bookingan dari customer</p>
          {myShipments.length === 0 && <EmptyState icon={PackageCheck} title="Belum ada barang masuk" desc="Barang akan muncul di sini setelah customer booking trip kamu." />}
          {myShipments.map((s) => {
            const HI = s.handoverMethod ? HANDOVER_ICONS[s.handoverMethod] : Truck;
            const needsProofByCustomer = s.manifestReady && s.status === "menunggu_pickup" && !s.receiverProofVerified;
            return (
              <div key={s.id} className="bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold text-[#10274f]">{s.item}</p><p className="text-xs text-slate-500">{s.code} • dari {s.customerName} • {s.weight} kg{s.actualWeight ? ` → aktual ${s.actualWeight} kg` : ""}</p></div>
                  <Pill color={shipmentColors[s.status]}>{shipmentLabels[s.status]}</Pill>
                </div>

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

                {(s.handoverMethod || s.domesticCourier) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {s.handoverMethod && (
                      <div className="flex items-start gap-2 bg-slate-50 p-3 text-xs">
                        <HI size={15} className="mt-0.5 shrink-0 text-[#2f70ff]" />
                        <div><p className="font-bold text-[#10274f]">{handoverLabels[s.handoverMethod]}</p><p className="mt-0.5 text-slate-500">{s.handoverDetail}</p></div>
                      </div>
                    )}
                    {s.domesticCourier && (
                      <div className="flex items-start gap-2 bg-slate-50 p-3 text-xs">
                        <Truck size={15} className="mt-0.5 shrink-0 text-[#f59e0b]" />
                        <div><p className="font-bold text-[#10274f]">{COURIER_INFO[s.domesticCourier].label}</p><p className="mt-0.5 text-slate-500">{s.domesticAddress}</p></div>
                      </div>
                    )}
                  </div>
                )}

                {needsProofByCustomer && (
                  <p className="mt-4 flex items-center gap-2 border-l-4 border-[#7c3aed] bg-[#f3e8ff] px-4 py-3 text-xs text-[#7c3aed]"><Clock3 size={13} /> Bukti terima terkirim — menunggu pengirim memverifikasi sebelum kamu bisa terbang.</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {!s.manifestReady && !s.requestId && <PrimaryBtn onClick={() => openVerify(s)} className="!py-2 !text-xs"><Scale size={13} /> Timbang & upload bukti terima</PrimaryBtn>}
                  {s.requestId && (() => {
                    const req = (state.requests ?? []).find((r) => r.id === s.requestId);
                    if (!req || req.proofVerified) return null;
                    return req.proofImage
                      ? <span className="flex items-center gap-2 text-xs text-amber-600"><Clock3 size={13} /> Bukti menunggu approve customer</span>
                      : <PrimaryBtn onClick={() => { setProofTarget(req); setProofImage(""); setProofNote(""); }} className="!bg-[#7c3aed] !py-2 !text-xs hover:!bg-[#6d28d9]"><ImageIcon size={13} /> Upload bukti penerimaan</PrimaryBtn>;
                  })()}
                  {s.status === "manifest_disetujui" && <GhostBtn onClick={() => { advanceShipment(s.id, "on_flight"); toast.push(`${s.code} diberangkatkan.`); }}><SendHorizonal size={13} /> Terbangkan</GhostBtn>}
                  <GhostBtn onClick={() => setScanResult(s)}>Detail</GhostBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeNav === "scan" && (
        <div className="mx-auto max-w-xl space-y-4">
          <div className="bg-white p-8 text-center">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-[#eef4ff]"><ScanLine size={36} className="text-[#2f70ff]" /></div>
            <h3 className="text-xl font-bold text-[#10274f]">Scanner Manifest Digital</h3>
            <p className="mt-2 text-sm text-slate-500">Masukkan kode manifest di label paket untuk membuka data kiriman.</p>
            <div className="mt-6 flex gap-2">
              <TextInput placeholder="cth: BS-2408-102" value={scanInput} onChange={(e) => { setScanInput(e.target.value); setScanErr(""); }} onKeyDown={(e) => e.key === "Enter" && runScan()} />
              <PrimaryBtn onClick={runScan}>Scan</PrimaryBtn>
            </div>
            {scanErr && <p className="mt-3 border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{scanErr}</p>}
          </div>
          {scanResult && (
            <div className="bg-white p-6 text-left">
              <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-slate-400">{scanResult.code}</p><h4 className="mt-1 font-bold text-[#10274f]">{scanResult.item}</h4></div><Pill color={shipmentColors[scanResult.status]}>{shipmentLabels[scanResult.status]}</Pill></div>
              <div className="mt-4 space-y-2 text-sm">
                {[["Pengirim", scanResult.customerName], ["Rute", scanResult.route], ["Berat booking", `${scanResult.weight} kg`], ...(scanResult.actualWeight ? [["Berat aktual", `${scanResult.actualWeight} kg`]] : []), ...(scanResult.itemCount ? [["Jumlah item", `${scanResult.itemCount} pcs`]] : []), ...(scanResult.manifestNote ? [["Catatan", scanResult.manifestNote]] : [])].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">{k}</span><b className="text-[#10274f]">{v}</b></div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {!scanResult.manifestReady && <PrimaryBtn onClick={() => openVerify(scanResult)}><Scale size={15} /> Verifikasi & timbang</PrimaryBtn>}
                {scanResult.status === "manifest_disetujui" && <PrimaryBtn onClick={() => { advanceShipment(scanResult.id, "on_flight"); toast.push(`${scanResult.code} diberangkatkan.`); setScanResult({ ...scanResult, status: "on_flight" }); }} className="!bg-[#0ea5e9] hover:!bg-[#0284c7]"><SendHorizonal size={15} /> Terbangkan</PrimaryBtn>}
                {scanResult.status !== "selesai" && !scanResult.disputeOpen && <GhostBtn onClick={() => setDisputeFor(scanResult)}>Lapor masalah</GhostBtn>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeNav === "wallet" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-gradient-to-br from-[#0ea5e9] to-[#173e82] p-8 text-white">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70">Siap ditarik</p>
                  <p className="mt-2 text-4xl font-bold">{idr(wallet.pending)}</p>
                  <p className="mt-1 text-xs text-white/60">Sudah dipotong komisi platform 12% dari nilai escrow</p>
                </div>
                <button disabled={wallet.pending <= 0} onClick={() => { withdraw(user.id); toast.push("Dana ditarik ke rekening terdaftar."); }} className="bg-white px-6 py-3 text-sm font-bold text-[#173e82] disabled:opacity-50">Tarik dana</button>
              </div>
            </div>
            {/* blueprint 4B: security deposit */}
            <div className="bg-white p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><ShieldCheck size={14} className="text-[#22c55e]" /> Security Deposit</p>
                  <p className="mt-2 text-3xl font-bold text-[#10274f]">{idr(wallet.deposit)}</p>
                  <p className="mt-1 text-xs text-slate-500">dari {idr(TRAVELER_DEPOSIT)} jaminan awal</p>
                </div>
                <div className="w-24">
                  <div className="h-2 bg-slate-100"><div className="h-full bg-[#22c55e]" style={{ width: `${(wallet.deposit / TRAVELER_DEPOSIT) * 100}%` }} /></div>
                  <p className="mt-1 text-right text-[10px] text-slate-400">{Math.round((wallet.deposit / TRAVELER_DEPOSIT) * 100)}% utuh</p>
                </div>
              </div>
              <p className="mt-4 border-l-2 border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                Deposit akan <b>terpotong otomatis</b> untuk mengganti kerugian user jika kamu kelebihan bagasi pribadi saat manifes web masih di bawah Q_sale.
              </p>
              <button onClick={() => { setOverloadTripId(myTrips[0]?.id ?? ""); setOverloadAmount("250000"); setOverloadOpen(true); }} className="mt-4 flex w-full items-center justify-center gap-2 border border-dashed border-red-300 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50">
                <ShieldAlert size={14} /> Lapor excess baggage & cek potongan
              </button>
            </div>
          </div>
          <SectionCard title="Riwayat pencairan">
            <div className="divide-y divide-slate-100">
              {wallet.ledger.length === 0 && <div className="p-6 text-sm text-slate-400">Belum ada riwayat.</div>}
              {wallet.ledger.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-4">
                  <div><p className="text-sm font-semibold text-[#10274f]">{t.label}</p><p className="text-xs text-slate-400">{t.time}</p></div>
                  <p className={`font-bold ${t.type === "in" ? "text-green-600" : "text-slate-700"}`}>{t.type === "in" ? "+" : "-"} {idr(t.amount)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ===== TRIP MODAL ===== */}
      <Modal open={!!tripModal} onClose={() => setTripModal(null)} title={tripModal === "create" ? "Buat trip baru" : "Edit trip"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kota asal"><TextInput placeholder="cth: Sydney" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
          <Field label="Kota tujuan"><TextInput placeholder="cth: Jakarta" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
          <Field label="Tanggal terbang"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Maskapai"><TextInput placeholder="cth: Garuda Indonesia" value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} /></Field>
          <Field label="Nomor penerbangan"><TextInput placeholder="cth: GA-715" value={form.flightNo} onChange={(e) => setForm({ ...form, flightNo: e.target.value })} /></Field>
          <Field label="Kuota bagasi total — Q_total (kg)"><TextInput type="number" min="1" value={form.quotaKg} onChange={(e) => setForm({ ...form, quotaKg: e.target.value })} /></Field>
          <Field label="Tarif per kg (Rp)"><TextInput type="number" min="1000" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} /></Field>
        </div>
        {/* blueprint 1: preview buffer 15% */}
        <div className="mt-4 border-l-4 border-[#0ea5e9] bg-[#eef4ff] p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-[#173e82]"><Lock size={14} /> Aturan toleransi kuota otomatis</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2"><p className="font-bold text-[#10274f]">{Number(form.quotaKg) || 0} kg</p><p className="text-slate-400">Q_total input</p></div>
            <div className="bg-white p-2"><p className="font-bold text-[#0ea5e9]">{saleCapacityOf(Number(form.quotaKg) || 0).toFixed(1)} kg</p><p className="text-slate-400">Dijual (85%)</p></div>
            <div className="bg-white p-2"><p className="font-bold text-slate-500">{((Number(form.quotaKg) || 0) - saleCapacityOf(Number(form.quotaKg) || 0)).toFixed(1)} kg</p><p className="text-slate-400">Buffer terkunci (15%)</p></div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Buffer 15% tidak ditampilkan ke pembeli — antisipasi selisih timbangan maskapai di bandara.</p>
        </div>
        <PrimaryBtn onClick={submitTrip} className="mt-5 w-full !py-4">{tripModal === "create" ? "Buat trip" : "Simpan perubahan"}</PrimaryBtn>
      </Modal>

      {/* ===== VERIFY MODAL (timbang + bukti terima foto) ===== */}
      <Modal open={!!verifyTarget} onClose={() => setVerifyTarget(null)} title={`Verifikasi ${verifyTarget?.code ?? ""}`}>
        {verifyTarget && (
          <div className="space-y-4">
            <p className="bg-slate-50 p-4 text-sm">Barang: <b>{verifyTarget.item}</b> — booking {verifyTarget.weight} kg</p>

            {verifyTarget.items?.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Daftar barang dari pengirim</p>
                <div className="space-y-2">
                  {verifyTarget.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 border border-slate-100 bg-slate-50 p-2.5">
                      {it.photo ? <img src={it.photo} alt={it.name} className="h-12 w-12 rounded object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded bg-slate-200"><Box size={16} className="text-slate-400" /></span>}
                      <div><p className="text-sm font-bold text-[#10274f]">{it.name} × {it.qty}</p>{it.note && <p className="text-xs text-slate-500">{it.note}</p>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {verifyTarget.handoverMethod && (
              <div className="flex items-start gap-2 border-l-4 border-[#0ea5e9] bg-[#eef4ff] p-3 text-xs">
                <span className="mt-0.5">{(() => { const HI = HANDOVER_ICONS[verifyTarget.handoverMethod!]; return <HI size={15} className="text-[#0ea5e9]" />; })()}</span>
                <div><p className="font-bold text-[#10274f]">{handoverLabels[verifyTarget.handoverMethod]}</p><p className="text-slate-500">{verifyTarget.handoverDetail}</p></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Berat aktual (kg)"><TextInput type="number" step="0.1" min="0.1" value={vWeight} onChange={(e) => setVWeight(e.target.value)} /></Field>
              <Field label="Jumlah item (pcs)"><TextInput type="number" min="1" value={vCount} onChange={(e) => setVCount(e.target.value)} /></Field>
            </div>
            <Field label="Catatan (opsional)"><TextArea placeholder="cth: kemasan aman, 1 botol plastik..." value={vNote} onChange={(e) => setVNote(e.target.value)} /></Field>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Foto bukti terima barang <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-4 gap-2">
                {vPhotos.map((ph, i) => (
                  <div key={i} className="relative">
                    <img src={ph} alt={`bukti ${i + 1}`} className="h-16 w-full rounded object-cover" />
                    <button onClick={() => setVPhotos((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white"><Trash2 size={10} /></button>
                  </div>
                ))}
                <label className="grid h-16 cursor-pointer place-items-center border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#7c3aed]">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVerifyPhoto(f); }} />
                  <ImageIcon size={18} />
                </label>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">Foto ini jadi bukti resmi jika ada barang hilang/rusak. Bisa lebih dari satu foto.</p>
            </div>

            <p className="border-l-4 border-[#2f70ff] bg-[#eef4ff] p-3 text-xs text-slate-600">Pengirim akan menerima notifikasi untuk memeriksa foto & data timbangan ini sebelum kamu diizinkan terbang.</p>
            <PrimaryBtn onClick={submitVerify} className="w-full !py-4">Kirim manifest & bukti terima</PrimaryBtn>
          </div>
        )}
      </Modal>

      {/* ===== ACCEPT REQUEST MODAL (open bidding) ===== */}
      <Modal open={!!acceptTarget} onClose={() => setAcceptTarget(null)} title="Ambil request jastip">
        {acceptTarget && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4">
              <p className="font-bold text-[#10274f]">{acceptTarget.item} × {acceptTarget.qty}</p>
              <p className="mt-1 text-sm text-slate-600">{acceptTarget.desc}</p>
              <p className="mt-2 text-xs text-slate-500">Diminta oleh {acceptTarget.customerName} • tujuan {acceptTarget.cityTarget}</p>
            </div>
            <Field label="Tampung di trip mana?">
              <select value={acceptTripId} onChange={(e) => setAcceptTripId(e.target.value)} className="field-input">
                {tripsWithSpace(acceptTarget.estWeight).length === 0 && <option value="">— Tidak ada trip dengan kuota cukup —</option>}
                {tripsWithSpace(acceptTarget.estWeight).map((t) => {
                  const sisa = t.saleCapacityKg - t.bookedKg;
                  return <option key={t.id} value={t.id}>{t.from} → {t.to} ({t.date}) — sisa efektif {sisa.toFixed(1)} kg</option>;
                })}
              </select>
            </Field>
            <div className="space-y-1.5 bg-[#eef4ff] p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Reimburse harga barang (wishlist customer)</span><b className="text-[#10274f]">{idr(acceptTarget.estPrice)}</b></div>
              <div className="flex justify-between"><span className="text-slate-600">Fee jastip untukmu</span><b className="text-[#7c3aed]">{idr(acceptTarget.offeredFee)}</b></div>
              <div className="flex justify-between border-t border-[#2f70ff]/20 pt-1.5"><span className="font-bold text-[#173e82]">Total masuk escrow (locked setelah kamu ambil)</span><b className="text-[#173e82]">{idr(acceptTarget.estPrice + acceptTarget.offeredFee)}</b></div>
              <p className="pt-1 text-[11px] leading-5 text-slate-500">Kamu membayar sendiri dulu saat beli di Australia. Dana refund + fee dicairkan dari escrow setelah barang selesai diterima customer (dipotong 12% platform).</p>
            </div>
            <PrimaryBtn disabled={!acceptTripId} onClick={submitAccept} className="w-full !bg-[#22c55e] !py-4 hover:!bg-[#16a34a]">
              <HandHelping size={16} /> Konfirmasi ambil request
            </PrimaryBtn>
          </div>
        )}
      </Modal>

      {/* ===== PROOF UPLOAD MODAL ===== */}
      <Modal open={!!proofTarget} onClose={() => setProofTarget(null)} title={`Upload bukti ${proofTarget?.code ?? ""}`}>
        {proofTarget && (
          <div className="space-y-4">
            <p className="bg-slate-50 p-4 text-sm">Barang: <b>{proofTarget.item} × {proofTarget.qty}</b> (untuk {proofTarget.customerName})</p>
            <p className="text-xs text-slate-500">Wajib menyertakan foto jelas: barang + struk pembelian/penerimaan, dengan tanggal terlihat. Ini bukti resmi agar customer yakin barang sesuai request mereka.</p>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Foto bukti <span className="text-red-500">*</span></p>
              <label className={`flex h-44 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed text-sm transition ${proofImage ? "border-[#22c55e] bg-green-50" : "border-slate-200 bg-slate-50 hover:border-[#7c3aed]"}`}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProofFile(f); }} />
                {proofImage ? (
                  <img src={proofImage} alt="preview bukti" className="h-40 w-full rounded object-cover" />
                ) : (
                  <>
                    <ImageIcon size={32} className="text-slate-300" />
                    <span className="text-slate-500">Klik untuk pilih foto struk + barang</span>
                    <span className="text-[10px] text-slate-400">JPG/PNG, maksimal 800KB</span>
                  </>
                )}
              </label>
            </div>
            <Field label="Catatan (klarifikasi untuk customer)"><TextArea placeholder="cth: Beli di Chemist Warehouse Sydney 15 Jul. Varian sesuai, expiry Jul 2027." value={proofNote} onChange={(e) => setProofNote(e.target.value)} /></Field>
            <PrimaryBtn onClick={submitProof} className="w-full !bg-[#7c3aed] !py-4 hover:!bg-[#6d28d9]">Kirim bukti ke customer</PrimaryBtn>
          </div>
        )}
      </Modal>

      {/* ===== OVERLOAD REPORT MODAL (blueprint 4B) ===== */}
      <Modal open={overloadOpen} onClose={() => setOverloadOpen(false)} title="Lapor excess baggage maskapai">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Bayar denda <i>excess baggage</i> resmi maskapai di bandara dulu, lalu laporkan di sini. Sistem akan memeriksa apakah paid orders kamu sudah sesuai manifes (≤ Q_sale).</p>
          <Field label="Trip terdampak">
            <select value={overloadTripId} onChange={(e) => setOverloadTripId(e.target.value)} className="field-input">
              {myTrips.map((t) => {
                const paid = state.shipments.filter((s) => s.tripId === t.id && s.status !== "dibatalkan").reduce((a, s) => a + s.weight, 0);
                return <option key={t.id} value={t.id}>{t.from} → {t.to} ({t.date}) — paid {paid.toFixed(1)} kg / Q_sale {t.saleCapacityKg} kg</option>;
              })}
            </select>
          </Field>
          <Field label="Nominal denda maskapai (Rp)"><TextInput type="number" min="1000" value={overloadAmount} onChange={(e) => setOverloadAmount(e.target.value)} /></Field>
          {overloadTripId && (() => {
            const t = myTrips.find((x) => x.id === overloadTripId);
            if (!t) return null;
            const paid = state.shipments.filter((s) => s.tripId === t.id && s.status !== "dibatalkan").reduce((a, s) => a + s.weight, 0);
            const isTravelerFault = paid <= t.saleCapacityKg;
            return (
              <div className={`border-l-4 p-3 text-xs ${isTravelerFault ? "border-red-400 bg-red-50 text-red-700" : "border-green-400 bg-green-50 text-green-800"}`}>
                {isTravelerFault
                  ? `Paid orders ${paid.toFixed(1)} kg ≤ Q_sale ${t.saleCapacityKg} kg → overload mutlak dari barang pribadimu. Deposit akan dipotong otomatis.`
                  : `Paid orders ${paid.toFixed(1)} kg > Q_sale ${t.saleCapacityKg} kg → anomali sistem, denda ditanggung platform.`}
              </div>
            );
          })()}
          <PrimaryBtn className="w-full !bg-[#dc2626] !py-4 hover:!bg-[#b91c1c]" onClick={() => {
            if (!overloadTripId) return void toast.push("Pilih trip dulu.", "err");
            const res = reportOverload(user, overloadTripId, Number(overloadAmount));
            toast.push(res.message, res.fault === "traveler" ? "info" : "ok");
            setOverloadOpen(false);
          }}>Kirim laporan & proses denda</PrimaryBtn>
        </div>
      </Modal>

      {/* ===== DISPUTE MODAL ===== */}
      <Modal open={!!disputeFor} onClose={() => setDisputeFor(null)} title="Laporkan masalah">
        {disputeFor && (
          <div className="space-y-4">
            <p className="bg-slate-50 p-4 text-sm">Kiriman: <b>{disputeFor.code}</b> — {disputeFor.item}</p>
            <Field label="Topik masalah"><TextInput value={disputeTopic} onChange={(e) => setDisputeTopic(e.target.value)} placeholder="cth: barang rusak / kuantitas tidak sesuai" /></Field>
            <PrimaryBtn className="w-full !py-4 !bg-[#dc2626] hover:!bg-[#b91c1c]" onClick={() => {
              if (!disputeTopic.trim()) return void toast.push("Topik wajib diisi.", "err");
              openDispute(disputeFor.id, user.name, disputeTopic, "");
              toast.push("Laporan masalah dikirim ke admin.");
              setDisputeFor(null);
              setDisputeTopic("");
            }}>Kirim laporan</PrimaryBtn>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
