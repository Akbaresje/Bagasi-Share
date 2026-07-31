import { useMemo, useState } from "react";
import { Home, Users, Package, DollarSign, ShieldAlert, Warehouse, TrendingUp, Activity, CheckCircle2, Truck, Printer, RefreshCcw, UserX, UserCheck, Trash2, Scale } from "lucide-react";
import DashboardLayout from "../DashboardLayout";
import { useData, Shipment, shipmentLabels, shipmentColors, PLATFORM_FEE, chargeableWeight } from "../../data/store";
import { useToast } from "../../components/Toast";
import { Pill, StatCard, Modal, Field, TextArea, TextInput, PrimaryBtn, GhostBtn, SectionCard, idr, EmptyState } from "../../components/ui";

const navItems = [
  { id: "home", label: "Overview", icon: Home },
  { id: "users", label: "Manajemen User", icon: Users },
  { id: "escrow", label: "Escrow & Keuangan", icon: DollarSign },
  { id: "warehouse", label: "Warehouse Ops", icon: Warehouse },
  { id: "disputes", label: "Penyelesaian Komplain", icon: ShieldAlert },
];

const roleColorTop: Record<string, string> = { customer: "#2f70ff", traveler: "#0ea5e9", reseller: "#f59e0b", admin: "#7c3aed" };
const priorityColor: Record<string, string> = { Rendah: "#22c55e", Sedang: "#f59e0b", Tinggi: "#dc2626" };
const disputeStatusColor: Record<string, string> = { terbuka: "#dc2626", diproses: "#f59e0b", selesai: "#22c55e" };

export default function AdminDashboard() {
  const { state, releaseEscrow, advanceShipment, dispatchShipment, toggleUserStatus, deleteUser, startDispute, resolveDispute, resetData, reweighShipment } = useData();
  const toast = useToast();
  const [activeNav, setActiveNav] = useState("home");
  const [roleFilter, setRoleFilter] = useState("Semua");
  const [resolveFor, setResolveFor] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);

  // reweigh modal (blueprint 4A)
  const [reweighTarget, setReweighTarget] = useState<Shipment | null>(null);
  const [rwReal, setRwReal] = useState("0");
  const [rwL, setRwL] = useState("0");
  const [rwW, setRwW] = useState("0");
  const [rwH, setRwH] = useState("0");

  function openReweigh(s: Shipment) {
    setReweighTarget(s);
    setRwReal(String(s.weight));
    setRwL(String(s.lengthCm ?? 0) || "0");
    setRwW(String(s.widthCm ?? 0) || "0");
    setRwH(String(s.heightCm ?? 0) || "0");
  }
  function submitReweigh() {
    if (!reweighTarget) return;
    const res = reweighShipment(reweighTarget.id, Number(rwReal), { l: Number(rwL), w: Number(rwW), h: Number(rwH) });
    if (res.over) {
      toast.push(`Underpaid terdeteksi: chargeable aktual ${res.chargeable} kg vs booking ${reweighTarget.weight} kg (+${res.delta} kg). Invoice tambahan diterbitkan.`, "err");
    } else {
      toast.push(`${reweighTarget.code} sesuai (${res.chargeable} kg chargeable). Siap cetak label.`);
    }
    setReweighTarget(null);
  }

  const gmv = state.escrow.reduce((a, e) => a + e.amount, 0);
  const held = state.escrow.filter((e) => e.status === "ditahan").reduce((a, e) => a + e.amount, 0);
  const released = state.escrow.filter((e) => e.status === "dilepas").reduce((a, e) => a + e.amount, 0);
  const commission = Math.round(released * PLATFORM_FEE);
  const activeShipments = state.shipments.filter((s) => s.status !== "selesai").length;
  const openDisputes = state.disputes.filter((d) => d.status !== "selesai").length;

  const filteredUsers = state.users.filter((u) => roleFilter === "Semua" || u.role === roleFilter);

  const zoneOnFlight = state.shipments.filter((s) => s.status === "on_flight");
  const zoneInbound = state.shipments.filter((s) => s.status === "tiba_warehouse");
  const zoneReady = state.shipments.filter((s) => s.status === "dikirim_kurir");

  const roleDist = useMemo(() => {
    const total = Math.max(state.users.length, 1);
    return (["customer", "traveler", "reseller", "admin"] as const).map((r) => {
      const n = state.users.filter((u) => u.role === r).length;
      return { role: r, n, pct: Math.round((n / total) * 100) };
    });
  }, [state.users]);

  return (
    <DashboardLayout navItems={navItems} activeNav={activeNav} onNavChange={setActiveNav} title="Admin Console" subtitle="Kendali penuh operasional BagasiShare">
      {activeNav === "home" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total User" value={String(state.users.length)} sub="Terdaftar di platform" icon={Users} color="#7c3aed" />
            <StatCard label="GMV Akumulasi" value={idr(gmv)} sub="Semua transaksi escrow" icon={TrendingUp} color="#22c55e" />
            <StatCard label="Kiriman Aktif" value={String(activeShipments)} sub="Belum selesai" icon={Package} color="#2f70ff" />
            <StatCard label="Komplain Terbuka" value={String(openDisputes)} sub="Perlu tindakan" icon={ShieldAlert} color="#dc2626" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard title="Log aktivitas platform" action={<Activity size={16} className="text-slate-400" />}>
              <div className="divide-y divide-slate-100">
                {state.events.length === 0 && <div className="p-6 text-sm text-slate-400">Belum ada aktivitas.</div>}
                {state.events.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-6 py-3.5 text-sm"><span className="w-14 shrink-0 text-xs font-mono text-slate-400">{e.time}</span><p className="text-[#10274f]">{e.text}</p></div>
                ))}
              </div>
            </SectionCard>
            <div className="bg-white p-6">
              <h3 className="mb-5 font-bold text-[#10274f]">Distribusi user</h3>
              <div className="space-y-4">
                {roleDist.map((r) => (
                  <div key={r.role}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold capitalize text-[#10274f]">{{ customer: "Customer", traveler: "Traveler", reseller: "Merchant", admin: "Admin" }[r.role as string] ?? r.role}</span><span className="text-slate-500">{r.n} user ({r.pct}%)</span></div>
                    <div className="h-2 bg-slate-100"><div className="h-full" style={{ width: `${r.pct}%`, background: roleColorTop[r.role] }} /></div>
                  </div>
                ))}
              </div>
              <button onClick={() => setResetConfirm(true)} className="mt-8 flex w-full items-center justify-center gap-2 border border-dashed border-slate-300 py-3 text-xs font-bold text-slate-500 hover:border-red-400 hover:text-red-500"><RefreshCcw size={13} /> Reset data demo</button>
            </div>
          </div>
        </div>
      )}

      {activeNav === "users" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Semua", "customer", "traveler", "reseller", "admin"].map((f) => (
              <button key={f} onClick={() => setRoleFilter(f)} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${roleFilter === f ? "border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed]" : "border-slate-200 bg-white text-slate-500"}`}>{f === "Semua" ? "Semua" : ({ customer: "Customer", traveler: "Traveler", reseller: "Merchant", admin: "Admin" } as Record<string, string>)[f] ?? f}</button>
            ))}
          </div>
          {filteredUsers.length === 0 && <EmptyState icon={Users} title="Tidak ada user di kategori ini" />}
          {filteredUsers.length > 0 && (
            <div className="overflow-x-auto bg-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-widest text-slate-500"><tr>
                  <th className="p-4">User</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Bergabung</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full font-bold" style={{ background: `${roleColorTop[u.role]}18`, color: roleColorTop[u.role] }}>{u.name.charAt(0).toUpperCase()}</span><span className="font-semibold text-[#10274f]">{u.name}</span></div></td>
                      <td className="p-4 text-slate-500">{u.email}</td>
                      <td className="p-4"><Pill color={roleColorTop[u.role]}>{u.role}</Pill></td>
                      <td className="p-4 text-slate-500">{u.joined}</td>
                      <td className="p-4"><Pill color={u.status === "aktif" ? "#22c55e" : "#dc2626"}>{u.status}</Pill></td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <GhostBtn onClick={() => { toggleUserStatus(u.id); toast.push(u.status === "aktif" ? `${u.name} di-suspend.` : `${u.name} diaktifkan kembali.`, "info"); }} className="!py-2">
                            {u.status === "aktif" ? <><UserX size={13} /> Suspend</> : <><UserCheck size={13} /> Aktifkan</>}
                          </GhostBtn>
                          <GhostBtn onClick={() => { deleteUser(u.id); toast.push(`${u.name} dihapus.`, "info"); }} className="!border-red-200 !py-2 !text-red-600"><Trash2 size={13} /></GhostBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeNav === "escrow" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Dibekukan" value={idr(held)} sub="Menunggu pelepasan" icon={DollarSign} color="#f59e0b" />
            <StatCard label="Sudah Dilepas" value={idr(released)} sub="Semua waktu" icon={CheckCircle2} color="#22c55e" />
            <StatCard label="Komisi Platform (dari yang dilepas)" value={idr(commission)} sub={`Potongan ${PLATFORM_FEE * 100}%`} icon={TrendingUp} color="#7c3aed" />
          </div>
          <SectionCard title={`Transaksi escrow (${state.escrow.length})`}>
            <div className="divide-y divide-slate-100">
              {state.escrow.map((e) => {
                const sh = state.shipments.find((x) => x.id === e.shipmentId);
                return (
                  <div key={e.id} className="grid gap-3 px-6 py-4 md:grid-cols-[auto_1.2fr_1fr_1fr_auto_auto] md:items-center">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#7c3aed]/15"><DollarSign size={16} className="text-[#7c3aed]" /></span>
                    <div><p className="font-bold text-[#10274f]">{sh?.code ?? e.shipmentId}</p><p className="text-xs text-slate-500">{e.from} → {e.to} • {e.createdAt}</p></div>
                    <p className="font-bold text-[#10274f]">{idr(e.amount)}</p>
                    <div><Pill color={e.status === "dilepas" ? "#22c55e" : "#f59e0b"}>{e.status === "dilepas" ? "Dilepas" : "Ditahan"}</Pill>{sh && <p className="mt-1 text-[10px] text-slate-400">Shipment: {shipmentLabels[sh.status]}</p>}</div>
                    {e.status === "ditahan" ? (
                      <PrimaryBtn onClick={() => { releaseEscrow(e.id); toast.push(`Dana ${idr(e.amount)} dilepas ke ${e.to}.`); }} disabled={sh?.status !== "selesai"} className="!py-2 !text-xs">Lepaskan dana</PrimaryBtn>
                    ) : <GhostBtn disabled className="!py-2 !text-xs">Selesai</GhostBtn>}
                  </div>
                );
              })}
            </div>
          </SectionCard>
          <p className="text-xs text-slate-400">Dana hanya bisa dilepaskan setelah kiriman berstatus "Selesai" (kurir tiba di tujuan akhir).</p>
        </div>
      )}

      {activeNav === "warehouse" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border-t-4 border-[#2f70ff] bg-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Zona Penerimaan (Inbound)</p><p className="mt-3 text-3xl font-bold text-[#10274f]">{zoneOnFlight.length} paket</p><p className="mt-1 text-xs text-slate-500">Masih di pesawat / menunggu dibuka di depan CCTV</p></div>
            <div className="border-t-4 border-[#f59e0b] bg-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Re-Verifikasi</p><p className="mt-3 text-3xl font-bold text-[#10274f]">{zoneInbound.length} paket</p><p className="mt-1 text-xs text-slate-500">Cocokkan fisik dengan Digital Manifest</p></div>
            <div className="border-t-4 border-[#22c55e] bg-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Dikirim Kurir</p><p className="mt-3 text-3xl font-bold text-[#10274f]">{zoneReady.length} paket</p><p className="mt-1 text-xs text-slate-500">Resi diterbitkan, menunggu sampai tujuan</p></div>
          </div>

          <SectionCard title="Paket yang membutuhkan tindakan">
            <div className="divide-y divide-slate-100">
              {[...zoneOnFlight, ...zoneInbound, ...zoneReady].length === 0 && <div className="p-6 text-sm text-slate-400">Semua paket sudah diproses.</div>}
              {zoneOnFlight.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div><p className="font-bold text-[#10274f]">{s.item}</p><p className="text-xs text-slate-500">{s.code} • dari {s.travelerName} • {s.actualWeight ?? s.weight} kg</p></div>
                  <div className="flex items-center gap-3">
                    <Pill color={shipmentColors[s.status]}>{shipmentLabels[s.status]}</Pill>
                    <PrimaryBtn onClick={() => { advanceShipment(s.id, "tiba_warehouse"); toast.push(`${s.code} diterima di zona inbound.`); }} className="!py-2 !text-xs">Terima di gudang</PrimaryBtn>
                  </div>
                </div>
              ))}
              {zoneInbound.map((s) => {
                const hasReweighed = s.actualWeight !== undefined;
                const isUnderpaid = (s.underpaid ?? 0) > 0;
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                    <div>
                      <p className="font-bold text-[#10274f]">{s.item}</p>
                      <p className="text-xs text-slate-500">{s.code} • {s.itemCount ?? 1} item • booking {s.weight} kg{hasReweighed ? ` → aktual ${s.actualWeight} kg` : ""}</p>
                      {isUnderpaid && <p className="mt-1 text-xs font-bold text-red-600">UNDERPAID — invoice tambahan {idr(s.underpaid!)} menunggu pelunasan pengirim</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Pill color={shipmentColors[s.status]}>{shipmentLabels[s.status]}</Pill>
                      {!hasReweighed && (
                        <PrimaryBtn onClick={() => openReweigh(s)} className="!bg-[#2f70ff] !py-2 !text-xs hover:!bg-[#1f5fe9]"><Scale size={13} /> Timbang & verifikasi</PrimaryBtn>
                      )}
                      {hasReweighed && isUnderpaid && (
                        <GhostBtn disabled className="!border-red-200 !text-red-500">Menunggu pelunasan</GhostBtn>
                      )}
                      {hasReweighed && !isUnderpaid && (
                        <PrimaryBtn onClick={() => { dispatchShipment(s.id); toast.push(`Label dikirim & resi diterbitkan untuk ${s.code}.`); }} className="!bg-[#f59e0b] !py-2 !text-xs hover:!bg-[#d97706]"><Printer size={13} /> Cetak label & kirim</PrimaryBtn>
                      )}
                    </div>
                  </div>
                );
              })}
              {zoneReady.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div><p className="font-bold text-[#10274f]">{s.item}</p><p className="text-xs text-slate-500">{s.code} • resi {s.resi}</p></div>
                  <div className="flex items-center gap-3">
                    <Pill color={shipmentColors[s.status]}>{shipmentLabels[s.status]}</Pill>
                    <PrimaryBtn onClick={() => { advanceShipment(s.id, "selesai"); releaseEscrow(s.escrowId); toast.push(`${s.code} selesai. Escrow dilepas ke ${s.travelerName}.`); }} className="!bg-[#22c55e] !py-2 !text-xs hover:!bg-[#16a34a]"><CheckCircle2 size={13} /> Tandai selesai + lepas escrow</PrimaryBtn>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="bg-white p-6"><h3 className="mb-4 font-bold text-[#10274f]">SOP Digital Workflow</h3><div className="grid gap-3 sm:grid-cols-3">{[
            "1. Zona Penerimaan — Segel koper dibuka di depan CCTV gudang mandiri",
            "2. Scan & Re-Verification — Item di-scan & dicocokkan dengan Digital Manifest",
            "3. Automated Shipping Label — Label JNE/GoSend dicetak otomatis, resi terkirim via WhatsApp",
          ].map((s) => <div key={s} className="border border-dashed border-slate-200 p-4 text-sm text-slate-600">{s}</div>)}</div>
          <Truck size={28} className="mt-5 text-slate-300" /></div>
        </div>
      )}

      {activeNav === "disputes" && (
        <div className="space-y-4">
          {state.disputes.length === 0 && <EmptyState icon={ShieldAlert} title="Tidak ada komplain" desc="Semua transaksi berjalan lancar." />}
          {state.disputes.map((d) => (
            <div key={d.id} className="bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{d.id} • {d.shipmentCode}</p>
                  <h3 className="mt-1 text-lg font-bold text-[#10274f]">{d.topic}</h3>
                  <p className="mt-1 text-sm text-slate-500">Dibuka oleh {d.openedBy}</p>
                  {d.detail && <p className="mt-3 max-w-2xl border-l-2 border-slate-200 pl-3 text-sm text-slate-600">{d.detail}</p>}
                  {d.resolution && <p className="mt-3 max-w-2xl border-l-2 border-green-400 bg-green-50 p-3 text-sm text-green-800"><b>Resolusi:</b> {d.resolution}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Pill color={priorityColor[d.priority]}>Prioritas {d.priority}</Pill>
                  <Pill color={disputeStatusColor[d.status]}>{d.status}</Pill>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {d.status === "terbuka" && <PrimaryBtn onClick={() => { startDispute(d.id); toast.push(`${d.id} diproses.`); }} className="!bg-[#f59e0b] hover:!bg-[#d97706]">Proses kasus</PrimaryBtn>}
                {d.status !== "selesai" && <PrimaryBtn onClick={() => { setResolveFor(d.id); setResolutionText(""); }} className="!bg-[#7c3aed] hover:!bg-[#6d28d9]">Selesaikan komplain</PrimaryBtn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== REWEIGH MODAL (blueprint 4A) ===== */}
      <Modal open={!!reweighTarget} onClose={() => setReweighTarget(null)} title={`Timbang ulang ${reweighTarget?.code ?? ""}`}>
        {reweighTarget && (() => {
          const real = Number(rwReal) || 0;
          const l = Number(rwL) || 0, w = Number(rwW) || 0, h = Number(rwH) || 0;
          const chargeable = chargeableWeight(real, l, w, h);
          const delta = Math.max(0, chargeable - reweighTarget.weight);
          const ratePerKg = Math.round(reweighTarget.price / reweighTarget.weight);
          return (
            <div className="space-y-4">
              <p className="bg-slate-50 p-4 text-sm">Booking: <b>{reweighTarget.weight} kg chargeable</b> ({reweighTarget.weightReal ?? "-"} kg riil awal). CCTV mencatat proses ini.</p>
              <Field label="Berat riil aktual (kg)"><TextInput type="number" step="0.1" min="0.1" value={rwReal} onChange={(e) => setRwReal(e.target.value)} /></Field>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Dimensi aktual (cm)</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <TextInput type="number" min="0" value={rwL} onChange={(e) => setRwL(e.target.value)} placeholder="P" />
                  <TextInput type="number" min="0" value={rwW} onChange={(e) => setRwW(e.target.value)} placeholder="L" />
                  <TextInput type="number" min="0" value={rwH} onChange={(e) => setRwH(e.target.value)} placeholder="T" />
                </div>
              </div>
              <div className={`border-l-4 p-3 text-sm ${delta > 0 ? "border-red-400 bg-red-50 text-red-700" : "border-green-400 bg-green-50 text-green-800"}`}>
                {delta > 0
                  ? <>Chargeable aktual <b>{chargeable} kg</b> vs booking {reweighTarget.weight} kg → selisih +{delta} kg. Invoice tambahan: <b>{idr(delta * ratePerKg)}</b> (tarif {idr(ratePerKg)}/kg).</>
                  : <>Chargeable aktual <b>{chargeable} kg</b> tidak melebihi booking {reweighTarget.weight} kg. Aman dilanjutkan.</>}
              </div>
              {delta > 0 && <p className="text-xs text-slate-500">Sesuai SOP: barang tidak akan dimasukkan ke jalur kurir domestik sampai pengirim melunasi kekurangan biaya. Pengirim juga bisa membatalkan (refund dipotong biaya administrasi gudang).</p>}
              <PrimaryBtn onClick={submitReweigh} className={`w-full !py-4 ${delta > 0 ? "!bg-[#dc2626] hover:!bg-[#b91c1c]" : ""}`}>
                {delta > 0 ? "Terbitkan invoice tambahan" : "Simpan hasil verifikasi"}
              </PrimaryBtn>
            </div>
          );
        })()}
      </Modal>

      {/* ===== RESOLVE MODAL ===== */}
      <Modal open={!!resolveFor} onClose={() => setResolveFor(null)} title="Selesaikan komplain">
        <div className="space-y-4">
          <Field label="Catatan resolusi"><TextArea placeholder="cth: Selisih berat dikompensasi Rp 15.000 ke pengirim..." value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} /></Field>
          <PrimaryBtn className="w-full !bg-[#7c3aed] !py-4 hover:!bg-[#6d28d9]" onClick={() => {
            if (!resolutionText.trim()) return void toast.push("Catatan resolusi wajib diisi.", "err");
            resolveDispute(resolveFor!, resolutionText);
            toast.push("Komplain diselesaikan.");
            setResolveFor(null);
          }}>Simpan resolusi</PrimaryBtn>
        </div>
      </Modal>

      {/* ===== RESET MODAL ===== */}
      <Modal open={resetConfirm} onClose={() => setResetConfirm(false)} title="Reset data demo?">
        <p className="text-sm text-slate-500">Ini akan menghapus semua data lokal (trip, kiriman, produk, escrow, dll) dan mengembalikan ke data awal demo.</p>
        <div className="mt-5 flex gap-2">
          <PrimaryBtn className="!bg-[#dc2626] hover:!bg-[#b91c1c]" onClick={() => { resetData(); toast.push("Data demo direset.", "info"); setResetConfirm(false); }}>Ya, reset</PrimaryBtn>
          <GhostBtn onClick={() => setResetConfirm(false)}>Batal</GhostBtn>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
