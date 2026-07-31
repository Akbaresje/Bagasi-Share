import { useMemo, useState } from "react";
import { Home, Store, Package, ShoppingBag, BarChart3, PlusCircle, DollarSign, TrendingUp, Pencil, Trash2, Truck, ArrowRight } from "lucide-react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../auth/AuthContext";
import { useData, Product, orderLabels } from "../../data/store";
import { useToast } from "../../components/Toast";
import { Pill, StatCard, Modal, Field, TextInput, SelectInput, EmptyState, PrimaryBtn, SectionCard, idr } from "../../components/ui";

const navItems = [
  { id: "home", label: "Beranda", icon: Home },
  { id: "products", label: "Katalog Produk", icon: Store },
  { id: "orders", label: "Pesanan Masuk", icon: ShoppingBag },
  { id: "consolidation", label: "Konsolidasi Kargo", icon: Package },
  { id: "analytics", label: "Analitik", icon: BarChart3 },
];

const orderColor: Record<string, string> = { masuk: "#f59e0b", diproses: "#2f70ff", konsolidasi: "#7c3aed", dikirim: "#0ea5e9", selesai: "#22c55e" };
const nextAction: Record<string, string> = { masuk: "Proses pesanan", diproses: "Masukkan ke konsolidasi", konsolidasi: "Kirim sekarang", dikirim: "Tandai selesai" };

interface ProductForm { name: string; category: string; priceAUD: string; stock: string; }
const emptyProductForm: ProductForm = { name: "", category: "Nutrisi", priceAUD: "", stock: "0" };
const categories = ["Nutrisi", "Skincare", "Kosmetik", "Fashion", "Makanan", "Lainnya"];

export default function ResellerDashboard() {
  const { user } = useAuth();
  const { state, addProduct, updateProduct, deleteProduct, advanceOrder, shipConsolidation } = useData();
  const toast = useToast();
  const [activeNav, setActiveNav] = useState("home");

  const [productModal, setProductModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);

  const myProducts = state.products.filter((p) => p.resellerId === user?.id);
  const myOrders = state.orders.filter((o) => o.resellerId === user?.id);

  const monthly = useMemo(() => {
    const buckets: { label: string; total: number }[] = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ label: months[d.getMonth()], total: myOrders.filter((o) => o.date.startsWith(key)).reduce((a, o) => a + o.totalIDR, 0) });
    }
    const max = Math.max(...buckets.map((b) => b.total), 1);
    return { buckets, max };
  }, [myOrders]);

  if (!user) return null;

  const revenue = myOrders.filter((o) => o.status === "selesai" || o.status === "dikirim").reduce((a, o) => a + o.totalIDR, 0);
  const activeOrders = myOrders.filter((o) => o.status !== "selesai").length;
  const consolidationBatch = myOrders.filter((o) => o.status === "konsolidasi");
  const batchWeight = consolidationBatch.reduce((a, o) => a + o.weightKg, 0);

  function openCreate() { setForm(emptyProductForm); setEditing(null); setProductModal(true); }
  function openEdit(p: Product) { setForm({ name: p.name, category: p.category, priceAUD: String(p.priceAUD), stock: String(p.stock) }); setEditing(p); setProductModal(true); }
  function submitProduct() {
    if (!user) return;
    const priceAUD = Number(form.priceAUD), stock = Number(form.stock);
    if (!form.name.trim() || priceAUD <= 0) return void toast.push("Nama & harga produk wajib valid.", "err");
    if (editing) { updateProduct(editing.id, { name: form.name, category: form.category, priceAUD, stock }); toast.push("Produk diperbarui."); }
    else { addProduct(user, { name: form.name, category: form.category, priceAUD, stock }); toast.push("Produk baru ditambahkan ke etalase."); }
    setProductModal(false);
  }
  function handleShipBatch() {
    if (!user) return;
    const n = shipConsolidation(user);
    if (n > 0) toast.push(`${n} pesanan diberangkatkan ke Indonesia.`);
    else toast.push("Tidak ada pesanan dalam antrean konsolidasi.", "info");
  }

  return (
    <DashboardLayout navItems={navItems} activeNav={activeNav} onNavChange={setActiveNav} title="Merchant Hub" subtitle="Kelola etalase daganganmu — massal atau satuan">
      {activeNav === "home" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pendapatan" value={idr(revenue)} sub="Pesanan terkirim & selesai" icon={DollarSign} color="#f59e0b" />
            <StatCard label="Total Produk" value={String(myProducts.length)} sub={`${myProducts.filter((p) => p.active).length} aktif dijual`} icon={Store} color="#2f70ff" />
            <StatCard label="Pesanan Aktif" value={String(activeOrders)} sub="Belum selesai" icon={ShoppingBag} color="#0ea5e9" />
            <StatCard label="Dalam Konsolidasi" value={String(consolidationBatch.length)} sub={`${batchWeight.toFixed(1)} kg siap kirim`} icon={Package} color="#7c3aed" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SectionCard title="Pesanan terbaru" action={<button onClick={() => setActiveNav("orders")} className="text-xs font-bold text-[#f59e0b]">Lihat semua</button>}>
              <div className="divide-y divide-slate-100">
                {myOrders.length === 0 && <div className="p-6 text-sm text-slate-400">Belum ada pesanan.</div>}
                {myOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="grid gap-2 px-6 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div><p className="font-bold text-[#10274f]">{o.productName} × {o.qty}</p><p className="text-xs text-slate-500">{o.id} • {o.customerName} • {o.date}</p></div>
                    <p className="font-bold text-[#10274f]">{idr(o.totalIDR)}</p>
                    <Pill color={orderColor[o.status]}>{orderLabels[o.status]}</Pill>
                  </div>
                ))}
              </div>
            </SectionCard>
            <div className="bg-gradient-to-br from-[#f59e0b] to-[#dc2626] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Prioritas Cargo</p>
              <h3 className="mt-2 text-2xl font-bold">Konsolidasi berikutnya</h3>
              <p className="mt-3 text-sm text-white/80">{consolidationBatch.length} pesanan ({batchWeight.toFixed(1)} kg) siap dikirim ke warehouse Jakarta.</p>
              <div className="mt-4 border-t border-white/20 pt-4"><p className="text-xs text-white/70">Estimasi keberangkatan</p><p className="mt-1 text-lg font-bold">20 Jul 2026</p></div>
              <button onClick={handleShipBatch} disabled={consolidationBatch.length === 0} className="mt-5 flex w-full items-center justify-center gap-2 bg-white py-3 text-sm font-bold text-[#dc2626] disabled:opacity-50"><Truck size={16} /> Berangkatkan batch</button>
            </div>
          </div>
        </div>
      )}

      {activeNav === "products" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-[#10274f]">{myProducts.length} produk di etalase</p>
            <PrimaryBtn onClick={openCreate} className="!bg-[#f59e0b] hover:!bg-[#d97706]"><PlusCircle size={16} /> Produk baru</PrimaryBtn>
          </div>
          {myProducts.length === 0 && <EmptyState icon={Store} title="Etalase kosong" desc="Upload produk pertamamu ke katalog." action={<PrimaryBtn onClick={openCreate}>Tambah produk</PrimaryBtn>} />}
          {myProducts.length > 0 && (
            <div className="overflow-x-auto bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-widest text-slate-500"><tr>
                  <th className="p-4">Produk</th><th className="p-4">Kategori</th><th className="p-4">Stok</th><th className="p-4">Harga AUD</th><th className="p-4">Terjual</th><th className="p-4">Status</th><th className="p-4"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {myProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="p-4 font-semibold text-[#10274f]">{p.name}</td>
                      <td className="p-4 text-slate-500">{p.category}</td>
                      <td className="p-4"><span className={p.stock === 0 ? "font-bold text-red-500" : "text-slate-600"}>{p.stock === 0 ? "Habis" : `${p.stock} pcs`}</span></td>
                      <td className="p-4 font-bold text-[#173e82]">AUD {p.priceAUD}</td>
                      <td className="p-4 text-slate-500">{p.sold}</td>
                      <td className="p-4">
                        <button onClick={() => { updateProduct(p.id, { active: !p.active }); toast.push(p.active ? "Produk dinonaktifkan." : "Produk diaktifkan.", "info"); }}>
                          <Pill color={p.active ? "#22c55e" : "#64748b"}>{p.active ? "Aktif" : "Nonaktif"}</Pill>
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="grid h-8 w-8 place-items-center border border-slate-200 text-slate-500 hover:border-[#f59e0b] hover:text-[#f59e0b]"><Pencil size={13} /></button>
                          <button onClick={() => { deleteProduct(p.id); toast.push("Produk dihapus.", "info"); }} className="grid h-8 w-8 place-items-center border border-slate-200 text-slate-500 hover:border-red-500 hover:text-red-500"><Trash2 size={13} /></button>
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

      {activeNav === "orders" && (
        <SectionCard title={`Semua pesanan (${myOrders.length})`}>
          <div className="divide-y divide-slate-100">
            {myOrders.length === 0 && <div className="p-6 text-sm text-slate-400">Belum ada pesanan masuk.</div>}
            {myOrders.map((o) => (
              <div key={o.id} className="grid gap-3 px-6 py-5 lg:grid-cols-[1.4fr_1fr_auto_auto] lg:items-center">
                <div><p className="font-bold text-[#10274f]">{o.productName} × {o.qty}</p><p className="text-xs text-slate-500">{o.id} • {o.weightKg} kg • {o.date}</p></div>
                <div><p className="text-xs text-slate-400">Pembeli</p><p className="font-semibold text-[#10274f]">{o.customerName}</p></div>
                <div className="lg:text-right"><p className="font-bold text-[#10274f]">{idr(o.totalIDR)}</p><Pill color={orderColor[o.status]}>{orderLabels[o.status]}</Pill></div>
                {o.status !== "selesai" && nextAction[o.status] && (
                  <PrimaryBtn onClick={() => { advanceOrder(o.id); toast.push(`Pesanan ${o.id} diperbarui.`); }} className="!bg-[#f59e0b] !py-2.5 !text-xs hover:!bg-[#d97706]">{nextAction[o.status]} <ArrowRight size={13} /></PrimaryBtn>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeNav === "consolidation" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Batch aktif</p><p className="mt-2 text-2xl font-bold text-[#10274f]">{consolidationBatch.length} pesanan</p><p className="mt-1 text-sm text-slate-500">Total berat {batchWeight.toFixed(1)} kg</p></div>
              <Package size={28} className="text-[#7c3aed]" />
            </div>
            <div className="mt-5 space-y-2">
              {consolidationBatch.length === 0 && <p className="text-sm text-slate-400">Tidak ada pesanan di antrean. Proses pesanan masuk lalu masukkan ke konsolidasi.</p>}
              {consolidationBatch.map((o) => (
                <div key={o.id} className="flex items-center justify-between border border-slate-100 px-4 py-2.5 text-sm"><span className="font-semibold text-[#10274f]">{o.id}</span><span className="text-slate-500">{o.productName.slice(0, 22)} × {o.qty}</span><span className="font-mono text-xs">{o.weightKg} kg</span></div>
              ))}
            </div>
            <PrimaryBtn disabled={consolidationBatch.length === 0} onClick={handleShipBatch} className="mt-5 w-full !bg-[#7c3aed] !py-4 hover:!bg-[#6d28d9]"><Truck size={16} /> Berangkatkan batch ke Jakarta</PrimaryBtn>
          </div>
          <div className="bg-[#0c1b37] p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">Riwayat pengiriman batch</p>
            <div className="mt-5 space-y-3">
              {myOrders.filter((o) => o.status === "dikirim" || o.status === "selesai").length === 0 && <p className="text-sm text-white/40">Belum ada batch dikirim.</p>}
              {myOrders.filter((o) => o.status === "dikirim" || o.status === "selesai").slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between border-b border-white/10 pb-3 text-sm">
                  <span>{o.id} — {o.productName.slice(0, 22)}</span>
                  <Pill color={o.status === "selesai" ? "#22c55e" : "#0ea5e9"}>{orderLabels[o.status]}</Pill>
                </div>
              ))}
            </div>
            <Truck size={40} className="mt-8 text-white/20" />
          </div>
        </div>
      )}

      {activeNav === "analytics" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white p-6">
            <h3 className="mb-6 flex items-center gap-2 font-bold text-[#10274f]"><TrendingUp size={16} className="text-[#f59e0b]" /> Penjualan 6 bulan terakhir</h3>
            <div className="flex h-52 items-end gap-3">
              {monthly.buckets.map((b) => (
                <div key={b.label} className="group flex-1">
                  <div className="relative w-full bg-[#f59e0b]/80 transition group-hover:bg-[#f59e0b]" style={{ height: `${Math.max(4, (b.total / monthly.max) * 100)}%` }}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#10274f] px-2 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{idr(b.total)}</span>
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-400">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6">
            <h3 className="mb-6 font-bold text-[#10274f]">Produk terlaris</h3>
            <div className="space-y-5">
              {myProducts.length === 0 && <p className="text-sm text-slate-400">Belum ada produk.</p>}
              {[...myProducts].sort((a, b) => b.sold - a.sold).slice(0, 5).map((p) => {
                const maxSold = Math.max(...myProducts.map((x) => x.sold), 1);
                return (
                  <div key={p.id}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-[#10274f]">{p.name}</span><span className="text-slate-500">{p.sold} terjual</span></div><div className="h-2 bg-slate-100"><div className="h-full bg-[#f59e0b]" style={{ width: `${(p.sold / maxSold) * 100}%` }} /></div></div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== PRODUCT MODAL ===== */}
      <Modal open={productModal} onClose={() => setProductModal(false)} title={editing ? "Edit produk" : "Produk baru"}>
        <div className="space-y-4">
          <Field label="Nama produk"><TextInput placeholder="cth: Susu Aptamil Gold+ 900g" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori"><SelectInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</SelectInput></Field>
            <Field label="Harga (AUD)"><TextInput type="number" min="1" value={form.priceAUD} onChange={(e) => setForm({ ...form, priceAUD: e.target.value })} /></Field>
          </div>
          <Field label="Stok (pcs)"><TextInput type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
          <PrimaryBtn onClick={submitProduct} className="w-full !bg-[#f59e0b] !py-4 hover:!bg-[#d97706]">{editing ? "Simpan perubahan" : "Tambah ke etalase"}</PrimaryBtn>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
