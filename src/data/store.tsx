import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, UserRole } from "../auth/AuthContext";

/* ============================ TYPES ============================ */

export type ShipmentStatus = "menunggu_pickup" | "manifest_disetujui" | "on_flight" | "tiba_warehouse" | "dikirim_kurir" | "selesai" | "dibatalkan";
export type OrderStatus = "masuk" | "diproses" | "konsolidasi" | "dikirim" | "selesai";
export type EscrowStatus = "ditahan" | "dilepas";
export type TripStatus = "aktif" | "penuh" | "selesai" | "batal";
export type DisputeStatus = "terbuka" | "diproses" | "selesai";

export const shipmentLabels: Record<ShipmentStatus, string> = {
  menunggu_pickup: "Menunggu Manifest",
  manifest_disetujui: "Siap Terbang",
  on_flight: "Dalam Penerbangan",
  tiba_warehouse: "Di Warehouse",
  dikirim_kurir: "Dikirim Kurir",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const shipmentColors: Record<ShipmentStatus, string> = {
  menunggu_pickup: "#f59e0b",
  manifest_disetujui: "#7c3aed",
  on_flight: "#0ea5e9",
  tiba_warehouse: "#2f70ff",
  dikirim_kurir: "#0d9488",
  selesai: "#22c55e",
  dibatalkan: "#dc2626",
};

export const orderLabels: Record<OrderStatus, string> = {
  masuk: "Pesanan Masuk",
  diproses: "Diproses",
  konsolidasi: "Konsolidasi Kargo",
  dikirim: "Sedang Dikirim",
  selesai: "Selesai",
};

export const PLATFORM_FEE = 0.12;
export const AUD_RATE = 10500; // konversi 1 AUD -> IDR
export const FREIGHT_PER_KG = 155000; // ongkir internasional estimasi per kg
export const DOMESTIC_FEE = 25000; // ongkir domestik per order

/* ============ SERAH TERIMA & PENGIRIMAN DOMESTIK ============ */
export type HandoverMethod = "pos" | "antar_rumah" | "toko_indo" | "meet_city";

export const handoverLabels: Record<HandoverMethod, string> = {
  pos: "Kirim via Pos",
  antar_rumah: "Antar ke Rumah Traveler",
  toko_indo: "Drop di Toko Indo (Aussie)",
  meet_city: "Ketemuan di Pusat Kota",
};

export const handoverHints: Record<HandoverMethod, string> = {
  pos: "Kirimkan paket via pos/kurir lokal Australia ke alamat yang diberikan traveler.",
  antar_rumah: "Antar langsung barang ke alamat rumah/apartemen traveler.",
  toko_indo: "Titipkan barang di toko/warung Indonesia langganan yang disepakati traveler.",
  meet_city: "Janjian bertemu langsung di titik ramai pusat kota untuk serah terima.",
};

export type DomesticCourier = "JNE" | "GoSend" | "Grab" | "Paxel";

export const COURIER_INFO: Record<DomesticCourier, { label: string; base: number; perKg: number; eta: string }> = {
  JNE: { label: "JNE Reguler", base: 12000, perKg: 4500, eta: "2-4 hari" },
  GoSend: { label: "GoSend Same Day", base: 18000, perKg: 6000, eta: "Hari yang sama" },
  Grab: { label: "GrabExpress", base: 16000, perKg: 5500, eta: "Hari yang sama" },
  Paxel: { label: "Paxel Next Day", base: 14000, perKg: 5000, eta: "1-2 hari" },
};

export const estimateDomesticCost = (courier: DomesticCourier, chargeableKg: number) => {
  const r = COURIER_INFO[courier];
  return Math.round(r.base + r.perKg * Math.max(1, Math.ceil(chargeableKg || 1)));
};

/* ============================================================
   MARKETPLACE DOMESTIK AUSSIE (IN-COUNTRY P2P & UMKM)
   ============================================================ */

export const AU_STATES = ["NSW – Sydney", "VIC – Melbourne", "QLD – Brisbane", "WA – Perth", "SA – Adelaide", "ACT – Canberra", "NT – Darwin", "TAS – Hobart"] as const;
export type AuState = typeof AU_STATES[number];

export const AU_PLATFORM_FEE_MIN = 0.05; // 5% minimum
export const AU_PLATFORM_FEE_MAX = 0.07; // 7% maximum
export const AU_PLATFORM_FEE = 0.06; // 6% default take rate

export type AuDelivery = "auspost" | "sendle" | "meetup";
export type AuListingStatus = "active" | "sold" | "draft" | "suspended";
export type AuOrderStatus = "pending" | "escrow_held" | "shipped" | "ready_pickup" | "pin_verified" | "completed" | "disputed" | "refunded";
export type AuCategory = "Makanan & Frozen" | "Bumbu & Rempah" | "Fashion & Pakaian" | "Elektronik & Gadget" | "Preloved" | "Kecantikan" | "Barang Rumah" | "Lainnya";

export const AU_DELIVERY_LABELS: Record<AuDelivery, string> = {
  auspost: "AusPost",
  sendle: "Sendle",
  meetup: "Local Pick-up / Meetup",
};

export const AU_ORDER_LABELS: Record<AuOrderStatus, string> = {
  pending: "Menunggu Pembayaran",
  escrow_held: "Escrow Ditahan",
  shipped: "Dikirim",
  ready_pickup: "Siap Diambil",
  pin_verified: "PIN Terverifikasi",
  completed: "Selesai",
  disputed: "Sengketa",
  refunded: "Direfund",
};

export const AU_ORDER_COLORS: Record<AuOrderStatus, string> = {
  pending: "#ca8a04",
  escrow_held: "#9333ea",
  shipped: "#0ea5e9",
  ready_pickup: "#f97316",
  pin_verified: "#16a34a",
  completed: "#2F7A5E",
  disputed: "#B23A48",
  refunded: "#6b7280",
};

export const AU_CATEGORIES: AuCategory[] = ["Makanan & Frozen", "Bumbu & Rempah", "Fashion & Pakaian", "Elektronik & Gadget", "Preloved", "Kecantikan", "Barang Rumah", "Lainnya"];

export interface AuListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerState: AuState;
  title: string;
  desc: string;
  category: AuCategory;
  priceAUD: number;
  stock: number;
  sold: number;
  photos: string[]; // dataURLs
  condition: "new" | "used";
  deliveries: AuDelivery[];
  weight?: number; // kg, for shipping estimate
  state: AuState; // location / ship-from
  status: AuListingStatus;
  createdAt: string;
}

export interface AuOrder {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  priceAUD: number;
  platformFeeAUD: number;
  sellerPayoutAUD: number;
  delivery: AuDelivery;
  shippingAddress?: string;
  trackingNo?: string;
  pickupPin?: string;
  pickupQr?: string;
  status: AuOrderStatus;
  escrowId: string;
  createdAt: string;
}

export interface AuEscrow {
  id: string;
  orderId: string;
  from: string; // buyerName
  to: string; // sellerName
  toId: string;
  amountAUD: number;
  status: "held" | "released" | "refunded";
  createdAt: string;
}

export interface AuSellerProfile {
  userId: string;
  storeName: string;
  storeDesc: string;
  state: AuState;
  bsb: string;
  accountNo: string;
  accountName: string;
  kycVerified: boolean;
  totalSalesAUD: number;
  rating: number;
  reviewCount: number;
  joinedAt: string;
}

/* ======================= END MARKETPLACE ======================= */

export interface ShipmentItem {
  id: string;
  name: string;
  qty: number;
  note?: string;
  photo?: string; // dataURL foto barang dari customer
}

/* ============ ATURAN KUOTA (BLUEPRINT 1-4) ============ */
export const SALE_RATIO = 0.85; // Q_sale = 85% dari Q_total
export const BUFFER_RATIO = 0.15; // 15% buffer zone terkunci
export const VOLUMETRIC_DIVISOR = 6000; // standar kargo internasional
export const LOCK_DURATION_MS = 30 * 60 * 1000; // temporary lock 30 menit
export const WAREHOUSE_ADMIN_FEE = 25000; // biaya administrasi gudang
export const TRAVELER_DEPOSIT = 1000000; // security deposit traveler

/** Berat volume: (P x L x T) / 6000 */
export const volumetricWeight = (l: number, w: number, h: number) => (l * w * h) / VOLUMETRIC_DIVISOR;

/**
 * Chargeable weight = CEIL(MAX(berat riil, berat volume)), minimum 1 kg.
 * Digunakan untuk memotong kuota dan dasar invoice.
 */
export const chargeableWeight = (realKg: number, lengthCm?: number, widthCm?: number, heightCm?: number) => {
  const vol = lengthCm && widthCm && heightCm ? volumetricWeight(lengthCm, widthCm, heightCm) : 0;
  return Math.max(1, Math.ceil(Math.max(realKg || 0, vol)));
};

/** Kuota efektif yang boleh dijual (85%), 15% sisanya buffer zone */
export const saleCapacityOf = (quotaKg: number) => Math.floor(quotaKg * SALE_RATIO * 10) / 10;

export interface Trip {
  id: string;
  travelerId: string;
  travelerName: string;
  from: string;
  to: string;
  date: string;
  airline: string;
  flightNo: string;
  quotaKg: number; // Q_total input traveler (berat riil kuota bagasi)
  saleCapacityKg: number; // Q_sale = 85% — yang boleh dijual
  bookedKg: number; // total PAID chargeable weight (atomic)
  pricePerKg: number;
  status: TripStatus;
}

export interface CapacityLock {
  id: string;
  tripId: string;
  userId: string;
  weightKg: number;
  expiresAt: number;
}

/** Open Bidding — permintaan custom jastip dari customer; traveler bisa mengambil & membelikan barangnya */
export interface JastipRequest {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  item: string;
  desc: string;
  qty: number;
  estPrice: number; // estimasi harga barang (Rp)
  estWeight: number; // estimasi berat chargeable (kg)
  cityTarget: string;
  offeredFee: number; // fee jastip yang ditawarkan customer (bid)
  status: "open" | "accepted" | "closed";
  acceptedBy?: string;
  acceptedByName?: string;
  tripId?: string;
  shipmentId?: string;
  totalInvoice?: number; // estPrice + offeredFee (di-escrow saat accepted)
  proofImage?: string; // bukti penerimaan barang (data URL)
  proofNote?: string;
  proofVerified?: boolean; // customer approve barang sesuai
  createdAt: string;
}

export interface Shipment {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  tripId: string;
  travelerId: string;
  travelerName: string;
  route: string;
  item: string; // ringkasan nama barang (gabungan semua item)
  items: ShipmentItem[]; // daftar rinci barang + foto dari customer
  weight: number; // chargeable kg (MAX(riil, volumetric) dibulatkan ke atas)
  weightReal?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  volumetricKg?: number;
  value: number;
  price: number; // fee jastip (dasar escrow ke traveler)
  domesticCourier?: DomesticCourier;
  domesticAddress?: string;
  domesticCost?: number;
  totalPaid?: number; // price + domesticCost (total ditagih ke customer)
  handoverMethod?: HandoverMethod;
  handoverDetail?: string;
  escrowId: string;
  status: ShipmentStatus;
  manifestReady: boolean;
  underpaid?: number; // invoice tambahan dari hasil timbang ulang warehouse
  requestId?: string; // terkait JastipRequest (aliran pengadaan jastip-beli)
  proofApproved?: boolean; // bukti penerimaan disetujui customer (untuk alur open bidding)
  receiverProofPhotos?: string[]; // foto bukti terima barang oleh traveler (anti kehilangan)
  receiverProofNote?: string;
  receiverProofVerified?: boolean; // customer sudah verifikasi foto sebelum terbang
  actualWeight?: number;
  itemCount?: number;
  manifestNote?: string;
  resi?: string;
  disputeOpen?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  resellerId: string;
  resellerName: string;
  name: string;
  category: string;
  priceAUD: number;
  stock: number;
  sold: number;
  active: boolean;
}

export interface Order {
  id: string;
  resellerId: string;
  productName: string;
  customerName: string;
  customerId?: string;
  qty: number;
  weightKg: number;
  totalIDR: number;
  status: OrderStatus;
  date: string;
}

export interface EscrowTx {
  id: string;
  shipmentId: string;
  from: string;
  to: string;
  toId: string;
  amount: number;
  status: EscrowStatus;
  createdAt: string;
}

export interface Dispute {
  id: string;
  shipmentId: string;
  shipmentCode: string;
  openedBy: string;
  topic: string;
  detail: string;
  priority: "Rendah" | "Sedang" | "Tinggi";
  status: DisputeStatus;
  resolution?: string;
}

export interface LedgerEntry {
  id: string;
  label: string;
  amount: number;
  type: "in" | "out";
  time: string;
}

export interface Wallet {
  balance: number;
  pending: number;
  deposit: number; // security deposit (khusus traveler)
  ledger: LedgerEntry[];
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "aktif" | "suspended";
  joined: string;
}

export interface AppEvent {
  id: string;
  time: string;
  text: string;
}

interface State {
  trips: Trip[];
  shipments: Shipment[];
  products: Product[];
  orders: Order[];
  escrow: EscrowTx[];
  disputes: Dispute[];
  wallets: Record<string, Wallet>;
  users: ManagedUser[];
  events: AppEvent[];
  locks: CapacityLock[];
  requests: JastipRequest[];
  // Marketplace Domestik Aussie
  auListings: AuListing[];
  auOrders: AuOrder[];
  auEscrow: AuEscrow[];
  auSellerProfiles: AuSellerProfile[];
}

/* ============================ SEED ============================ */

const STORAGE_KEY = "bagasishare-data-v5";

const seedState: State = {
  trips: [
    { id: "trip-1", travelerId: "demo-traveler", travelerName: "Andi Wijaya", from: "Sydney", to: "Jakarta", date: "2026-07-18", airline: "Garuda Indonesia", flightNo: "GA-715", quotaKg: 20, saleCapacityKg: 17, bookedKg: 12.5, pricePerKg: 155000, status: "aktif" },
    { id: "trip-2", travelerId: "other-1", travelerName: "Sinta Rahayu", from: "Melbourne", to: "Surabaya", date: "2026-07-22", airline: "Jetstar", flightNo: "JQ-36", quotaKg: 15, saleCapacityKg: 12.7, bookedKg: 4.8, pricePerKg: 148000, status: "aktif" },
    { id: "trip-3", travelerId: "other-2", travelerName: "Reza Pratama", from: "Brisbane", to: "Denpasar", date: "2026-07-25", airline: "Qantas", flightNo: "QF-505", quotaKg: 25, saleCapacityKg: 21.2, bookedKg: 0.5, pricePerKg: 162000, status: "aktif" },
    { id: "trip-4", travelerId: "demo-traveler", travelerName: "Andi Wijaya", from: "Jakarta", to: "Sydney", date: "2026-08-05", airline: "Garuda Indonesia", flightNo: "GA-712", quotaKg: 15, saleCapacityKg: 12.7, bookedKg: 0, pricePerKg: 175000, status: "aktif" },
  ],
  shipments: [
    { id: "sh-1", code: "BS-2408-102", customerId: "demo-customer", customerName: "Rina Kartika", tripId: "trip-1", travelerId: "demo-traveler", travelerName: "Andi Wijaya", route: "Sydney → Jakarta", item: "Vitamin Blackmores", items: [{ id: "it-1", name: "Vitamin Blackmores", qty: 3 }], weight: 3.2, value: 1500000, price: 496000, handoverMethod: "antar_rumah", handoverDetail: "Diantar ke apartemen traveler di Sydney CBD", escrowId: "esc-1", status: "menunggu_pickup", manifestReady: false, createdAt: "14 Jul 2026" },
    { id: "sh-2", code: "BS-2408-098", customerId: "demo-customer", customerName: "Rina Kartika", tripId: "trip-1", travelerId: "demo-traveler", travelerName: "Andi Wijaya", route: "Sydney → Jakarta", item: "Skincare Aesop Set", items: [{ id: "it-2", name: "Skincare Aesop Set", qty: 3 }], weight: 1.5, value: 2800000, price: 232500, handoverMethod: "meet_city", handoverDetail: "Ketemuan di Town Hall Station jam 5 sore", escrowId: "esc-2", status: "manifest_disetujui", manifestReady: true, actualWeight: 1.5, itemCount: 3, receiverProofVerified: true, createdAt: "12 Jul 2026" },
    { id: "sh-3", code: "BS-2408-091", customerId: "demo-customer", customerName: "Rina Kartika", tripId: "trip-2", travelerId: "other-1", travelerName: "Sinta Rahayu", route: "Melbourne → Surabaya", item: "Snack Cokelat", items: [{ id: "it-3", name: "Snack Cokelat", qty: 12 }], weight: 4.8, value: 950000, price: 710400, handoverMethod: "toko_indo", handoverDetail: "Toko Indo Melbourne, Springvale", escrowId: "esc-3", status: "on_flight", manifestReady: true, actualWeight: 4.9, itemCount: 12, receiverProofVerified: true, createdAt: "10 Jul 2026" },
    { id: "sh-4", code: "BS-2408-077", customerId: "demo-customer", customerName: "Rina Kartika", tripId: "trip-3", travelerId: "other-2", travelerName: "Reza Pratama", route: "Brisbane → Denpasar", item: "Dokumen Penting", items: [{ id: "it-4", name: "Dokumen Penting", qty: 1 }], weight: 0.5, value: 500000, price: 81000, handoverMethod: "pos", handoverDetail: "Australia Post ke PO Box traveler", escrowId: "esc-4", status: "selesai", manifestReady: true, actualWeight: 0.5, itemCount: 1, resi: "JNE-8821347", receiverProofVerified: true, createdAt: "2 Jul 2026" },
    { id: "sh-5", code: "BS-2408-110", customerId: "demo-customer", customerName: "Rina Kartika", tripId: "trip-1", travelerId: "demo-traveler", travelerName: "Andi Wijaya", route: "Sydney → Jakarta", item: "Pakaian Aussie Brand", items: [{ id: "it-5", name: "Pakaian Aussie Brand", qty: 8 }], weight: 5.5, value: 2200000, price: 852500, domesticCourier: "JNE", domesticAddress: "Jl. Kemang Raya No. 12, Jakarta Selatan", domesticCost: 37500, totalPaid: 890000, handoverMethod: "antar_rumah", handoverDetail: "Diantar ke rumah traveler di Sydney", escrowId: "esc-5", status: "tiba_warehouse", manifestReady: true, actualWeight: 5.6, itemCount: 8, receiverProofVerified: true, createdAt: "13 Jul 2026" },
    { id: "sh-6", code: "BS-2408-108", customerId: "other-c1", customerName: "Budi Santoso", tripId: "trip-1", travelerId: "demo-traveler", travelerName: "Andi Wijaya", route: "Sydney → Jakarta", item: "Susu Aptamil", items: [{ id: "it-6", name: "Susu Aptamil", qty: 3 }], weight: 2.3, value: 1800000, price: 356500, domesticCourier: "GoSend", domesticAddress: "Jl. Sudirman Kav. 5, Jakarta Pusat", domesticCost: 32000, totalPaid: 388500, handoverMethod: "pos", handoverDetail: "Dikirim via Australia Post", escrowId: "esc-6", status: "dikirim_kurir", manifestReady: true, actualWeight: 2.3, itemCount: 3, resi: "GOSEND-55291", receiverProofVerified: true, createdAt: "13 Jul 2026" },
  ],
  products: [
    { id: "pr-1", resellerId: "demo-reseller", resellerName: "Aussie Goods Co", name: "Susu Aptamil Gold+ 900g", category: "Nutrisi", priceAUD: 32, stock: 45, sold: 128, active: true },
    { id: "pr-2", resellerId: "demo-reseller", resellerName: "Aussie Goods Co", name: "Skincare Aesop Set", category: "Skincare", priceAUD: 189, stock: 12, sold: 42, active: true },
    { id: "pr-3", resellerId: "demo-reseller", resellerName: "Aussie Goods Co", name: "Kosmetik MECCA Palette", category: "Kosmetik", priceAUD: 75, stock: 0, sold: 88, active: false },
    { id: "pr-4", resellerId: "demo-reseller", resellerName: "Aussie Goods Co", name: "Vitamin Blackmores Bio C", category: "Nutrisi", priceAUD: 24, stock: 200, sold: 315, active: true },
  ],
  orders: [
    { id: "RS-1024", resellerId: "demo-reseller", productName: "Susu Aptamil Gold+ 900g", customerName: "Anita Wijaya", qty: 3, weightKg: 2.7, totalIDR: 1680000, status: "masuk", date: "2026-07-14" },
    { id: "RS-1023", resellerId: "demo-reseller", productName: "Vitamin Blackmores Bio C", customerName: "Rudi Hartono", qty: 5, weightKg: 1.2, totalIDR: 1850000, status: "diproses", date: "2026-07-12" },
    { id: "RS-1022", resellerId: "demo-reseller", productName: "Skincare Aesop Set", customerName: "Sinta Dewi", qty: 1, weightKg: 1.5, totalIDR: 2150000, status: "konsolidasi", date: "2026-07-10" },
    { id: "RS-1021", resellerId: "demo-reseller", productName: "Susu Aptamil Gold+ 900g", customerName: "Dina Pramudya", qty: 6, weightKg: 5.4, totalIDR: 3360000, status: "konsolidasi", date: "2026-07-09" },
    { id: "RS-1020", resellerId: "demo-reseller", productName: "Kosmetik MECCA Palette", customerName: "Lina Marlina", qty: 2, weightKg: 0.8, totalIDR: 1740000, status: "dikirim", date: "2026-07-05" },
    { id: "RS-1019", resellerId: "demo-reseller", productName: "Vitamin Blackmores Bio C", customerName: "Agus Salim", qty: 10, weightKg: 2.4, totalIDR: 3700000, status: "dikirim", date: "2026-07-02" },
    { id: "RS-1018", resellerId: "demo-reseller", productName: "Susu Aptamil Gold+ 900g", customerName: "Tania Rani", qty: 4, weightKg: 3.6, totalIDR: 2240000, status: "selesai", date: "2026-06-18" },
    { id: "RS-1017", resellerId: "demo-reseller", productName: "Skincare Aesop Set", customerName: "Fajar Nugraha", qty: 2, weightKg: 3.0, totalIDR: 4300000, status: "selesai", date: "2026-05-22" },
    { id: "RS-1016", resellerId: "demo-reseller", productName: "Vitamin Blackmores Bio C", customerName: "Dewi Lestari", qty: 8, weightKg: 1.9, totalIDR: 2960000, status: "selesai", date: "2026-04-15" },
    { id: "RS-1015", resellerId: "demo-reseller", productName: "Susu Aptamil Gold+ 900g", customerName: "Rangga Putra", qty: 2, weightKg: 1.8, totalIDR: 1120000, status: "selesai", date: "2026-03-20" },
    { id: "RS-1014", resellerId: "demo-reseller", productName: "Kosmetik MECCA Palette", customerName: "Maya Anindya", qty: 3, weightKg: 1.2, totalIDR: 2610000, status: "selesai", date: "2026-02-12" },
  ],
  escrow: [
    { id: "esc-1", shipmentId: "sh-1", from: "Rina Kartika", to: "Andi Wijaya", toId: "demo-traveler", amount: 496000, status: "ditahan", createdAt: "14 Jul 2026" },
    { id: "esc-2", shipmentId: "sh-2", from: "Rina Kartika", to: "Andi Wijaya", toId: "demo-traveler", amount: 232500, status: "ditahan", createdAt: "12 Jul 2026" },
    { id: "esc-3", shipmentId: "sh-3", from: "Rina Kartika", to: "Sinta Rahayu", toId: "other-1", amount: 710400, status: "ditahan", createdAt: "10 Jul 2026" },
    { id: "esc-4", shipmentId: "sh-4", from: "Rina Kartika", to: "Reza Pratama", toId: "other-2", amount: 81000, status: "dilepas", createdAt: "2 Jul 2026" },
    { id: "esc-5", shipmentId: "sh-5", from: "Rina Kartika", to: "Andi Wijaya", toId: "demo-traveler", amount: 852500, status: "ditahan", createdAt: "13 Jul 2026" },
    { id: "esc-6", shipmentId: "sh-6", from: "Budi Santoso", to: "Andi Wijaya", toId: "demo-traveler", amount: 356500, status: "ditahan", createdAt: "13 Jul 2026" },
  ],
  disputes: [
    { id: "DSP-004", shipmentId: "sh-3", shipmentCode: "BS-2408-091", openedBy: "Rina Kartika", topic: "Selisih berat manifest 0.1 kg", detail: "Berat aktual 4.9 kg vs booking 4.8 kg. Mohon klarifikasi biaya tambahan.", priority: "Sedang", status: "terbuka" },
    { id: "DSP-003", shipmentId: "sh-6", shipmentCode: "BS-2408-108", openedBy: "Budi Santoso", topic: "Kemasan penyekat rusak", detail: "Satu kaleng susu penyekatnya pecah saat diterima kurir. Foto bukti terlampir.", priority: "Tinggi", status: "diproses" },
  ],
  wallets: {
    "demo-customer": {
      balance: 850000,
      pending: 0,
      deposit: 0,
      ledger: [
        { id: "lg-1", label: "Pembayaran BS-2408-110", amount: 852500, type: "out", time: "13 Jul" },
        { id: "lg-2", label: "Pembayaran BS-2408-102", amount: 496000, type: "out", time: "14 Jul" },
        { id: "lg-3", label: "Top up saldo", amount: 2500000, type: "in", time: "12 Jul" },
        { id: "lg-4", label: "Refund BS-2408-088", amount: 155000, type: "in", time: "8 Jul" },
      ],
    },
    "demo-traveler": {
      balance: 0,
      pending: 1845000,
      deposit: TRAVELER_DEPOSIT,
      ledger: [
        { id: "lg-5", label: "Tarik dana ke BCA", amount: 1200000, type: "out", time: "5 Jul" },
        { id: "lg-6", label: "Pencairan BS-2408-069", amount: 635000, type: "in", time: "2 Jul" },
      ],
    },
  },
  locks: [],
  users: [
    { id: "demo-traveler", name: "Andi Wijaya", email: "andi@mail.com", role: "traveler", status: "aktif", joined: "Mar 2025" },
    { id: "demo-customer", name: "Rina Kartika", email: "rina@mail.com", role: "customer", status: "aktif", joined: "Jul 2025" },
    { id: "demo-reseller", name: "Aussie Goods Co", email: "hello@aussiegoods.com", role: "reseller", status: "aktif", joined: "Jan 2026" },
    { id: "other-c1", name: "Budi Santoso", email: "budi@mail.com", role: "customer", status: "suspended", joined: "May 2025" },
    { id: "other-1", name: "Sinta Rahayu", email: "sinta@mail.com", role: "traveler", status: "aktif", joined: "Apr 2026" },
    { id: "other-2", name: "Reza Pratama", email: "reza@mail.com", role: "traveler", status: "aktif", joined: "Jun 2026" },
  ],
  events: [
    { id: "ev-1", time: "09:41", text: "BS-2408-108 diserahkan ke kurir GoSend" },
    { id: "ev-2", time: "08:15", text: "Escrow ESC-4 dilepas ke Reza Pratama" },
    { id: "ev-3", time: "07:52", text: "Komplain DSP-004 dibuka oleh Rina Kartika" },
    { id: "ev-4", time: "06:30", text: "Konsolidasi batch #082 (68 kg) siap berangkat" },
  ],
  requests: [
    {
      id: "req-1", code: "REQ-2408-01", customerId: "demo-customer", customerName: "Rina Kartika",
      item: "Vitamin Blackmores Omega 200 caps",
      desc: "Kemasan terbaru, tolong yang expiry > 2027. Bisa beli di Chemist Warehouse Sydney.",
      qty: 2, estPrice: 750000, estWeight: 0.5, cityTarget: "Jakarta", offeredFee: 200000,
      status: "open", createdAt: "14 Jul 2026",
    },
    {
      id: "req-2", code: "REQ-2408-02", customerId: "demo-customer", customerName: "Rina Kartika",
      item: "Susu Aptamil Profutura 3 (1+ tahun) 900g",
      desc: "Discounter seperti Big W / Coles biasanya lebih murah. 3 kaleng jika memungkinkan.",
      qty: 3, estPrice: 990000, estWeight: 3, cityTarget: "Jakarta", offeredFee: 350000,
      status: "open", createdAt: "13 Jul 2026",
    },
  ],
  auListings: [
    { id: "aul-1", sellerId: "demo-reseller", sellerName: "Dapur Mbak Sri", sellerState: "VIC – Melbourne", title: "Rendang Padang Frozen 500g", desc: "Rendang sapi asli Minang, dimasak fresh lalu di-vacuum & frozen. Bisa tahan 3 bulan di freezer. Cocok buat yang kangen masakan rumah.", category: "Makanan & Frozen", priceAUD: 18, stock: 12, sold: 48, photos: [], condition: "new", deliveries: ["auspost", "sendle", "meetup"], weight: 0.6, state: "VIC – Melbourne", status: "active", createdAt: "1 Jul 2026" },
    { id: "aul-2", sellerId: "demo-reseller", sellerName: "Dapur Mbak Sri", sellerState: "VIC – Melbourne", title: "Paket Bumbu Dapur Indo (10 sachet)", desc: "Isi: bumbu soto, rendang, opor, gulai, dll. Brand Indofood & Bamboe. Stok beli dari Woolworths Indo aisle.", category: "Bumbu & Rempah", priceAUD: 22, stock: 25, sold: 61, photos: [], condition: "new", deliveries: ["auspost", "meetup"], weight: 0.5, state: "VIC – Melbourne", status: "active", createdAt: "3 Jul 2026" },
    { id: "aul-3", sellerId: "au-seller-2", sellerName: "Kiky Preloved SYD", sellerState: "NSW – Sydney", title: "Jaket Denim Levi's 501 Second Hand Size M", desc: "Kondisi 8/10, jarang dipakai. Beli 2 tahun lalu AUD 120. Cocok buat musim dingin. Ada sedikit noda kecil di bagian dalam lengan.", category: "Preloved", priceAUD: 35, stock: 1, sold: 0, photos: [], condition: "used", deliveries: ["auspost", "meetup"], weight: 0.8, state: "NSW – Sydney", status: "active", createdAt: "10 Jul 2026" },
    { id: "aul-4", sellerId: "au-seller-2", sellerName: "Kiky Preloved SYD", sellerState: "NSW – Sydney", title: "iPhone 13 128GB Second — Mulus Banget", desc: "FU, batt 91%, no scratch di layar. Fullset box. Reason jual: upgrade ke 15. Bisa dicek langsung kalau Sydney.", category: "Elektronik & Gadget", priceAUD: 480, stock: 1, sold: 0, photos: [], condition: "used", deliveries: ["meetup"], weight: 0.2, state: "NSW – Sydney", status: "active", createdAt: "12 Jul 2026" },
    { id: "aul-5", sellerId: "au-seller-3", sellerName: "WA Diaspora Goods", sellerState: "WA – Perth", title: "Sambal Bu Rudy Asli Surabaya (import)", desc: "Beli langsung dari keluarga yang baru balik Indo. Stok terbatas. 3 botol per-order max.", category: "Bumbu & Rempah", priceAUD: 28, stock: 6, sold: 22, photos: [], condition: "new", deliveries: ["auspost", "sendle"], weight: 0.9, state: "WA – Perth", status: "active", createdAt: "5 Jul 2026" },
    { id: "aul-6", sellerId: "au-seller-3", sellerName: "WA Diaspora Goods", sellerState: "WA – Perth", title: "Kain Batik Tulis Solo Original 2.5m", desc: "Dibawa langsung dari Solo waktu mudik. Corak Parang. Cocok buat baju kebaya atau dijadikan oleh-oleh.", category: "Fashion & Pakaian", priceAUD: 65, stock: 3, sold: 7, photos: [], condition: "new", deliveries: ["auspost", "meetup"], weight: 0.4, state: "WA – Perth", status: "active", createdAt: "8 Jul 2026" },
  ],
  auOrders: [
    { id: "AUO-0011", listingId: "aul-1", listingTitle: "Rendang Padang Frozen 500g", sellerId: "demo-reseller", sellerName: "Dapur Mbak Sri", buyerId: "demo-customer", buyerName: "Rina Kartika", priceAUD: 18, platformFeeAUD: 1.08, sellerPayoutAUD: 16.92, delivery: "meetup", pickupPin: "7834", status: "ready_pickup", escrowId: "aue-1", createdAt: "14 Jul 2026" },
    { id: "AUO-0010", listingId: "aul-2", listingTitle: "Paket Bumbu Dapur Indo (10 sachet)", sellerId: "demo-reseller", sellerName: "Dapur Mbak Sri", buyerId: "demo-customer", buyerName: "Rina Kartika", priceAUD: 22, platformFeeAUD: 1.32, sellerPayoutAUD: 20.68, delivery: "auspost", shippingAddress: "12 Collins St, Melbourne VIC 3000", trackingNo: "AP923847561AU", status: "shipped", escrowId: "aue-2", createdAt: "12 Jul 2026" },
    { id: "AUO-0009", listingId: "aul-5", listingTitle: "Sambal Bu Rudy Asli Surabaya", sellerId: "au-seller-3", sellerName: "WA Diaspora Goods", buyerId: "demo-customer", buyerName: "Rina Kartika", priceAUD: 28, platformFeeAUD: 1.68, sellerPayoutAUD: 26.32, delivery: "auspost", shippingAddress: "12 Collins St, Melbourne VIC 3000", trackingNo: "", status: "completed", escrowId: "aue-3", createdAt: "5 Jul 2026" },
  ],
  auEscrow: [
    { id: "aue-1", orderId: "AUO-0011", from: "Rina Kartika", to: "Dapur Mbak Sri", toId: "demo-reseller", amountAUD: 18, status: "held", createdAt: "14 Jul 2026" },
    { id: "aue-2", orderId: "AUO-0010", from: "Rina Kartika", to: "Dapur Mbak Sri", toId: "demo-reseller", amountAUD: 22, status: "held", createdAt: "12 Jul 2026" },
    { id: "aue-3", orderId: "AUO-0009", from: "Rina Kartika", to: "WA Diaspora Goods", toId: "au-seller-3", amountAUD: 28, status: "released", createdAt: "5 Jul 2026" },
  ],
  auSellerProfiles: [
    { userId: "demo-reseller", storeName: "Dapur Mbak Sri", storeDesc: "UMKM masakan Indonesia frozen & bumbu. Beroperasi di Melbourne sejak 2022.", state: "VIC – Melbourne", bsb: "063-000", accountNo: "1234 5678", accountName: "Sri Handayani", kycVerified: true, totalSalesAUD: 2840, rating: 4.9, reviewCount: 61, joinedAt: "Jan 2022" },
    { userId: "au-seller-2", storeName: "Kiky Preloved SYD", storeDesc: "Jual barang preloved berkualitas. Semua barang dicek dan dibersihkan sebelum kirim.", state: "NSW – Sydney", bsb: "062-000", accountNo: "9876 5432", accountName: "Kiky Anggraini", kycVerified: true, totalSalesAUD: 620, rating: 4.8, reviewCount: 22, joinedAt: "Mar 2024" },
    { userId: "au-seller-3", storeName: "WA Diaspora Goods", storeDesc: "Produk Indonesia, oleh-oleh, dan bumbu langka di Perth. Import resmi.", state: "WA – Perth", bsb: "036-000", accountNo: "5555 1234", accountName: "Budi Prasetyo", kycVerified: true, totalSalesAUD: 3180, rating: 5.0, reviewCount: 29, joinedAt: "Jun 2023" },
  ],
};

/* ============================ STORE ============================ */

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...seedState, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return seedState;
}

const uid = () => crypto.randomUUID().slice(0, 8);
const nowLabel = () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const timeLabel = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

function pushEvent(state: State, text: string): AppEvent[] {
  return [{ id: uid(), time: timeLabel(), text }, ...state.events].slice(0, 24);
}

export function emptyWallet(role?: string): Wallet {
  return { balance: 0, pending: 0, deposit: role === "traveler" ? TRAVELER_DEPOSIT : 0, ledger: [] };
}

interface DataContextValue {
  state: State;
  ensureUser: (user: User) => void;
  // trips
  addTrip: (user: User, data: Omit<Trip, "id" | "travelerId" | "travelerName" | "bookedKg" | "status" | "saleCapacityKg">) => void;
  updateTrip: (id: string, data: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  // capacity locks (blueprint 2)
  lockCapacity: (userId: string, tripId: string, weightKg: number) => string | null;
  updateLock: (lockId: string, weightKg: number) => void;
  releaseUserLocks: (userId: string, tripId: string) => void;
  // shipments
  bookShipment: (user: User, trip: Trip, input: {
    items: ShipmentItem[];
    weightReal: number;
    dims: { l: number; w: number; h: number };
    value: number;
    handoverMethod: HandoverMethod;
    handoverDetail: string;
    domesticCourier: DomesticCourier;
    domesticAddress: string;
  }) => { ok: boolean; message: string };
  buyProduct: (user: User, product: Product, qty: number) => { ok: boolean; message: string };
  verifyManifest: (id: string, actualWeight: number, itemCount: number, note: string, photos: string[]) => void;
  approveManifest: (id: string) => void;
  approveReceiverProof: (id: string) => void;
  advanceShipment: (id: string, status: ShipmentStatus) => void;
  openDispute: (shipmentId: string, openedBy: string, topic: string, detail: string) => void;
  // open bidding jastip (custom request)
  createRequest: (user: User, data: { item: string; desc: string; qty: number; estPrice: number; estWeight: number; cityTarget: string; offeredFee: number }) => void;
  cancelRequest: (user: User, requestId: string) => void;
  acceptRequest: (traveler: User, requestId: string, tripId: string) => { ok: boolean; message: string };
  uploadProof: (traveler: User, requestId: string, image: string, note: string) => void;
  approveProof: (user: User, requestId: string) => void;
  // warehouse + penalties (blueprint 4)
  reweighShipment: (id: string, realKg: number, dims: { l: number; w: number; h: number }) => { over: boolean; delta: number; chargeable: number };
  payUnderpaid: (user: User, shipmentId: string) => { ok: boolean; message: string };
  cancelPaidShipment: (user: User, shipmentId: string) => void;
  reportOverload: (user: User, tripId: string, denda: number) => { fault: "traveler" | "platform"; message: string };
  // reseller
  addProduct: (user: User, p: Omit<Product, "id" | "resellerId" | "resellerName" | "sold" | "active">) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  advanceOrder: (id: string) => void;
  shipConsolidation: (user: User) => number;
  // wallet
  topUp: (userId: string, amount: number) => void;
  withdraw: (userId: string) => void;
  // admin
  releaseEscrow: (escrowId: string) => void;
  dispatchShipment: (id: string) => void; // tiba_warehouse -> dikirim_kurir
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;
  startDispute: (id: string) => void;
  resolveDispute: (id: string, resolution: string) => void;
  resetData: () => void;

  /* ===== Marketplace Domestik Aussie ===== */
  auCreateListing: (user: User, data: Omit<AuListing, "id" | "sellerId" | "sellerName" | "sellerState" | "sold" | "status" | "createdAt">) => void;
  auUpdateListing: (id: string, data: Partial<AuListing>) => void;
  auDeleteListing: (id: string) => void;
  auBuyNow: (user: User, listing: AuListing, delivery: AuDelivery, shippingAddress?: string) => { ok: boolean; message: string; orderId?: string };
  auVerifyPin: (user: User, orderId: string, pin: string) => { ok: boolean; message: string };
  auConfirmShipping: (user: User, orderId: string, trackingNo: string) => void;
  auBuyerConfirmReceived: (user: User, orderId: string) => void;
  auReleasePayout: (orderId: string) => void;
  auDisputeOrder: (user: User, orderId: string, reason: string) => void;
  auSaveSellerProfile: (user: User, data: Partial<AuSellerProfile>) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Auto-release expired capacity locks (blueprint 2: 30-minute temporary lock)
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const active = prev.locks.filter((l) => l.expiresAt > Date.now());
        if (active.length === prev.locks.length) return prev;
        const expired = prev.locks.length - active.length;
        return { ...prev, locks: active, events: pushEvent(prev, `${expired} lock kuota kedaluwarsa dikembalikan ke pool`) };
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const walletFor = (s: State, id: string): Wallet => s.wallets[id] ?? emptyWallet();

  const value: DataContextValue = {
    state,

    ensureUser: (user) => {
      setState((prev) => {
        let s = { ...prev };
        // register user in admin list
        if (!s.users.find((u) => u.id === user.id)) {
          s = { ...s, users: [{ id: user.id, name: user.name, email: user.email, role: user.role, status: "aktif", joined: nowLabel() }, ...s.users] };
        }
        // adopt demo data so first login feels populated
        const demoOwner = `demo-${user.role}`;
        if (user.role === "traveler") {
          const owns = s.trips.some((t) => t.travelerId === user.id);
          if (!owns) {
            s = {
              ...s,
              trips: s.trips.map((t) => (t.travelerId === demoOwner ? { ...t, travelerId: user.id, travelerName: user.name } : t)),
              shipments: s.shipments.map((x) => (x.travelerId === demoOwner ? { ...x, travelerId: user.id, travelerName: user.name } : x)),
              escrow: s.escrow.map((e) => (e.toId === demoOwner ? { ...e, toId: user.id, to: user.name } : e)),
            };
          }
        }
        if (user.role === "customer") {
          const owns = s.shipments.some((x) => x.customerId === user.id);
          if (!owns) {
            s = {
              ...s,
              shipments: s.shipments.map((x) => (x.customerId === demoOwner ? { ...x, customerId: user.id, customerName: user.name } : x)),
              escrow: s.escrow.map((e) => (e.from === "Rina Kartika" && s.shipments.find((x) => x.id === e.shipmentId)?.customerId === user.id ? { ...e, from: user.name } : e)),
              requests: (s.requests ?? []).map((r) => (r.customerId === demoOwner ? { ...r, customerId: user.id, customerName: user.name } : r)),
            };
          }
        }
        if (user.role === "reseller") {
          const owns = s.products.some((p) => p.resellerId === user.id);
          if (!owns) {
            s = {
              ...s,
              products: s.products.map((p) => (p.resellerId === demoOwner ? { ...p, resellerId: user.id, resellerName: user.name } : p)),
              orders: s.orders.map((o) => (o.resellerId === demoOwner ? { ...o, resellerId: user.id } : o)),
            };
          }
        }
        // migrate demo wallet ownership
        if (s.wallets[demoOwner] && !s.wallets[user.id]) {
          const wallets = { ...s.wallets };
          wallets[user.id] = wallets[demoOwner];
          s = { ...s, wallets };
        }
        return s;
      });
    },

    addTrip: (user, data) => {
      setState((prev) => ({
        ...prev,
        trips: [{ ...data, id: uid(), travelerId: user.id, travelerName: user.name, bookedKg: 0, status: "aktif", saleCapacityKg: saleCapacityOf(data.quotaKg) }, ...prev.trips],
        events: pushEvent(prev, `${user.name} membuka slot ${data.from} → ${data.to} (${saleCapacityOf(data.quotaKg)} kg dijual dari ${data.quotaKg} kg)`),
      }));
    },

    updateTrip: (id, data) => {
      setState((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => {
          if (t.id !== id) return t;
          const merged = { ...t, ...data };
          if (data.quotaKg !== undefined) merged.saleCapacityKg = saleCapacityOf(data.quotaKg);
          merged.status = merged.status === "penuh" || merged.bookedKg >= merged.saleCapacityKg ? (merged.bookedKg >= merged.saleCapacityKg ? "penuh" : merged.status) : merged.status;
          return merged;
        }),
      }));
    },

    deleteTrip: (id) => {
      setState((prev) => ({ ...prev, trips: prev.trips.filter((t) => t.id !== id) }));
    },

    /* ---------- BLUEPRINT 2: Temporary Lock & Auto-Close ---------- */
    lockCapacity: (userId, tripId, weightKg) => {
      const trip = state.trips.find((t) => t.id === tripId);
      if (!trip || trip.status !== "aktif" || weightKg <= 0) return null;
      const othersLocked = state.locks
        .filter((l) => l.tripId === tripId && l.userId !== userId && l.expiresAt > Date.now())
        .reduce((a, l) => a + l.weightKg, 0);
      const ownLocked = state.locks.filter((l) => l.tripId === tripId && l.userId === userId && l.expiresAt > Date.now()).reduce((a, l) => a + l.weightKg, 0);
      const available = trip.saleCapacityKg - trip.bookedKg - othersLocked - ownLocked;
      if (weightKg > available) return null;
      const lockId = uid();
      const lock: CapacityLock = { id: lockId, tripId, userId, weightKg, expiresAt: Date.now() + LOCK_DURATION_MS };
      setState((prev) => ({ ...prev, locks: [...prev.locks.filter((l) => l.expiresAt > Date.now()), lock] }));
      return lockId;
    },

    updateLock: (lockId, weightKg) => {
      setState((prev) => ({
        ...prev,
        locks: prev.locks.map((l) => (l.id === lockId ? { ...l, weightKg, expiresAt: Date.now() + LOCK_DURATION_MS } : l)),
      }));
    },

    releaseUserLocks: (userId, tripId) => {
      setState((prev) => ({ ...prev, locks: prev.locks.filter((l) => !(l.userId === userId && l.tripId === tripId)) }));
    },

    bookShipment: (user, trip, input) => {
      const { items, weightReal, dims, value, handoverMethod, handoverDetail, domesticCourier, domesticAddress } = input;
      if (!items.length) return { ok: false, message: "Minimal satu barang harus diisi." };
      if (items.some((it) => !it.photo)) return { ok: false, message: "Setiap barang wajib disertai foto." };
      const chargeable = chargeableWeight(weightReal, dims.l, dims.w, dims.h);
      const vol = dims.l && dims.w && dims.h ? volumetricWeight(dims.l, dims.w, dims.h) : 0;
      const othersLocked = state.locks
        .filter((l) => l.tripId === trip.id && l.userId !== user.id && l.expiresAt > Date.now())
        .reduce((a, l) => a + l.weightKg, 0);
      const availableForMe = trip.saleCapacityKg - trip.bookedKg - othersLocked;
      if (chargeable > availableForMe) {
        return { ok: false, message: `Chargeable ${chargeable} kg melebihi sisa kuota efektif (${availableForMe.toFixed(1)} kg).` };
      }
      const price = Math.round(chargeable * trip.pricePerKg);
      const domesticCost = estimateDomesticCost(domesticCourier, chargeable);
      const totalPaid = price + domesticCost;
      const wallet = walletFor(state, user.id);
      if (wallet.balance < totalPaid) return { ok: false, message: "Saldo tidak cukup. Silakan top up dulu di menu Dompet." };
      const itemSummary = items.map((it) => `${it.name} × ${it.qty}`).join(", ");
      setState((prev) => {
        const w = walletFor(prev, user.id);
        const shipmentId = uid();
        const escrowId = uid();
        const code = `BS-${String(2500 + prev.shipments.length)}-${Math.floor(100 + Math.random() * 900)}`;
        const route = `${trip.from} → ${trip.to}`;
        return {
          ...prev,
          shipments: [
            {
              id: shipmentId, code, customerId: user.id, customerName: user.name, tripId: trip.id,
              travelerId: trip.travelerId, travelerName: trip.travelerName, route, item: itemSummary, items,
              weight: chargeable, weightReal, lengthCm: dims.l, widthCm: dims.w, heightCm: dims.h,
              volumetricKg: Math.round(vol * 10) / 10, value, price,
              domesticCourier, domesticAddress, domesticCost, totalPaid,
              handoverMethod, handoverDetail, escrowId,
              status: "menunggu_pickup", manifestReady: false, createdAt: nowLabel(),
            },
            ...prev.shipments,
          ],
          escrow: [{ id: escrowId, shipmentId, from: user.name, to: trip.travelerName, toId: trip.travelerId, amount: price, status: "ditahan", createdAt: nowLabel() }, ...prev.escrow],
          trips: prev.trips.map((t) => {
            const booked = Math.round((t.bookedKg + chargeable) * 10) / 10;
            const full = booked >= t.saleCapacityKg;
            return t.id === trip.id ? { ...t, bookedKg: booked, status: full ? "penuh" : t.status } : t;
          }),
          // konsumsi temporary lock milik user di trip ini (lock -> paid)
          locks: prev.locks.filter((l) => !(l.userId === user.id && l.tripId === trip.id)),
          wallets: { ...prev.wallets, [user.id]: { ...w, balance: w.balance - totalPaid, ledger: [{ id: uid(), label: `Pembayaran ${code} (${chargeable} kg + ongkir ${domesticCourier})`, amount: totalPaid, type: "out", time: nowLabel() }, ...w.ledger] } },
          events: pushEvent(prev, `${user.name} booking ${chargeable} kg di ${route} (${itemSummary})`),
        };
      });
      return { ok: true, message: `Booking ${chargeable} kg berhasil terkonfirmasi. Dana aman di escrow.` };
    },

    /* ---------- BLUEPRINT 4A: Warehouse re-weigh & underpaid penalty ---------- */
    reweighShipment: (id, realKg, dims) => {
      const sh = state.shipments.find((x) => x.id === id);
      if (!sh) return { over: false, delta: 0, chargeable: 0 };
      const chargeable = chargeableWeight(realKg, dims.l, dims.w, dims.h);
      const delta = Math.max(0, chargeable - sh.weight);
      const over = delta > 0;
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((x) =>
          x.id === id
            ? {
                ...x,
                actualWeight: realKg,
                lengthCm: dims.l, widthCm: dims.w, heightCm: dims.h,
                volumetricKg: Math.round(volumetricWeight(dims.l || 0, dims.w || 0, dims.h || 0) * 10) / 10,
                underpaid: over ? delta * Math.round(x.price / x.weight) : 0,
              }
            : x
        ),
        events: pushEvent(prev, over
          ? `Haz! Timbang ulang ${sh.code} lebih besar +${delta} kg — invoice tambahan diterbitkan`
          : `Re-verifikasi ${sh.code} sesuai (${chargeable} kg chargeable)`),
      }));
      return { over, delta, chargeable };
    },

    payUnderpaid: (user, shipmentId) => {
      const sh = state.shipments.find((x) => x.id === shipmentId);
      if (!sh || !sh.underpaid || sh.underpaid <= 0) return { ok: false, message: "Tidak ada tagihan tambahan." };
      const wallet = walletFor(state, user.id);
      if (wallet.balance < sh.underpaid) return { ok: false, message: "Saldo tidak cukup untuk melunasi kekurangan biaya." };
      const due = sh.underpaid;
      setState((prev) => {
        const w = walletFor(prev, user.id);
        return {
          ...prev,
          shipments: prev.shipments.map((x) => (x.id === shipmentId ? { ...x, underpaid: 0 } : x)),
          wallets: { ...prev.wallets, [user.id]: { ...w, balance: w.balance - due, ledger: [{ id: uid(), label: `Pelunasan selisih ${sh.code}`, amount: due, type: "out", time: nowLabel() }, ...w.ledger] } },
          events: pushEvent(prev, `Selisih biaya ${sh.code} dilunasi (${due.toLocaleString("id-ID")})`),
        };
      });
      return { ok: true, message: "Kekurangan biaya dilunasi. Barang lanjut diproses." };
    },

    cancelPaidShipment: (user, shipmentId) => {
      const sh = state.shipments.find((x) => x.id === shipmentId);
      if (!sh || sh.customerId !== user.id) return;
      const refund = Math.max(0, sh.price - WAREHOUSE_ADMIN_FEE);
      setState((prev) => {
        const w = walletFor(prev, user.id);
        return {
          ...prev,
          shipments: prev.shipments.map((x) => (x.id === shipmentId ? { ...x, status: "dibatalkan", underpaid: 0 } : x)),
          escrow: prev.escrow.map((e) => (e.shipmentId === shipmentId ? { ...e, status: "dilepas" } : e)),
          trips: prev.trips.map((t) => (t.id === sh.tripId ? { ...t, bookedKg: Math.max(0, Math.round((t.bookedKg - sh.weight) * 10) / 10), status: t.status === "penuh" ? "aktif" : t.status } : t)),
          wallets: { ...prev.wallets, [user.id]: { ...w, balance: w.balance + refund, ledger: [{ id: uid(), label: `Refund pembatalan ${sh.code} (dipotong biaya admin)`, amount: refund, type: "in", time: nowLabel() }, ...w.ledger] } },
          events: pushEvent(prev, `${sh.code} dibatalkan — refund ${refund.toLocaleString("id-ID")} ke ${user.name}`),
        };
      });
    },

    /* ---------- BLUEPRINT 4B: Traveler overload & security deposit ---------- */
    reportOverload: (user, tripId, denda) => {
      const trip = state.trips.find((t) => t.id === tripId && t.travelerId === user.id);
      if (!trip) return { fault: "platform" as const, message: "Trip tidak ditemukan." };
      if (denda <= 0) return { fault: "platform" as const, message: "Nominal denda harus lebih dari nol." };
      const paidChargeable = state.shipments
        .filter((s) => s.tripId === tripId && s.status !== "dibatalkan")
        .reduce((a, s) => a + s.weight, 0);
      // Mutlak: jika paid orders <= Q_sale namun tetap overload -> kesalahan barang pribadi traveler
      if (paidChargeable <= trip.saleCapacityKg) {
        setState((prev) => {
          const w = walletFor(prev, user.id);
          const cut = Math.min(w.deposit, denda);
          return {
            ...prev,
            wallets: {
              ...prev.wallets,
              [user.id]: {
                ...w,
                deposit: Math.max(0, w.deposit - cut),
                ledger: [{ id: uid(), label: `Potongan deposit: excess baggage ${trip.from} → ${trip.to}`, amount: cut, type: "out", time: nowLabel() }, ...w.ledger],
              },
            },
            events: pushEvent(prev, `Deposit ${user.name} dipotong Rp ${cut.toLocaleString("id-ID")} (excess baggage)`),
          };
        });
        return { fault: "traveler" as const, message: `Paid orders (${paidChargeable.toFixed(1)} kg) ≤ Q_sale (${trip.saleCapacityKg} kg). Overload terbukti dari barang pribadi — deposit dipotong Rp ${denda.toLocaleString("id-ID")}.` };
      }
      setState((prev) => ({ ...prev, events: pushEvent(prev, `Anomali overbooking ${trip.id} — denda ditanggung platform`) }));
      return { fault: "platform" as const, message: "Terdeteksi paid orders melebihi Q_sale — denda ditanggung platform, deposit aman." };
    },


    buyProduct: (user, product, qty) => {
      if (qty <= 0) return { ok: false, message: "Jumlah pembelian minimal 1 pcs." };
      if (!product.active) return { ok: false, message: "Produk sedang tidak aktif." };
      if (qty > product.stock) return { ok: false, message: `Stok tidak cukup (sisa ${product.stock} pcs).` };
      const weightKg = Math.round(qty * 0.9 * 10) / 10;
      const productCost = qty * product.priceAUD * AUD_RATE;
      const freight = Math.round(weightKg * FREIGHT_PER_KG);
      const totalIDR = productCost + freight + DOMESTIC_FEE;
      const wallet = walletFor(state, user.id);
      if (wallet.balance < totalIDR) return { ok: false, message: "Saldo tidak cukup. Silakan top up dulu di menu Dompet." };
      setState((prev) => {
        const w = walletFor(prev, user.id);
        const orderId = `RS-${1000 + Math.floor(Math.random() * 9000)}`;
        return {
          ...prev,
          orders: [
            { id: orderId, resellerId: product.resellerId, productName: product.name, customerName: user.name, customerId: user.id, qty, weightKg, totalIDR, status: "masuk", date: `${new Date().toISOString().slice(0, 10)}` },
            ...prev.orders,
          ],
          products: prev.products.map((p) => (p.id === product.id ? { ...p, stock: p.stock - qty, sold: p.sold + qty } : p)),
          wallets: {
            ...prev.wallets,
            [user.id]: { ...w, balance: w.balance - totalIDR, ledger: [{ id: uid(), label: `Pembelian ${product.name} × ${qty}`, amount: totalIDR, type: "out", time: nowLabel() }, ...w.ledger] },
          },
          events: pushEvent(prev, `${user.name} membeli ${product.name} × ${qty} dari ${product.resellerName}`),
        };
      });
      return { ok: true, message: "Pesanan dibuat! Reseller akan memproses & mengonsolidasikan kirimanmu." };
    },

    verifyManifest: (id, actualWeight, itemCount, note, photos) => {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((x) => (x.id === id ? { ...x, manifestReady: true, actualWeight, itemCount, manifestNote: note, receiverProofPhotos: photos, receiverProofVerified: false } : x)),
        events: pushEvent(prev, `Manifest & bukti terima ${prev.shipments.find((x) => x.id === id)?.code} diupload, menunggu verifikasi pengirim`),
      }));
    },

    approveReceiverProof: (id) => {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((x) => (x.id === id ? { ...x, receiverProofVerified: true } : x)),
        events: pushEvent(prev, `Bukti terima ${prev.shipments.find((x) => x.id === id)?.code} diverifikasi pengirim`),
      }));
    },

    approveManifest: (id) => {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((x) => (x.id === id ? { ...x, status: "manifest_disetujui", receiverProofVerified: true } : x)),
        events: pushEvent(prev, `Manifest & bukti terima ${prev.shipments.find((x) => x.id === id)?.code} disetujui pengirim — siap terbang`),
      }));
    },

    advanceShipment: (id, status) => {
      setState((prev) => {
        const sh = prev.shipments.find((x) => x.id === id);
        if (!sh) return prev;
        return {
          ...prev,
          shipments: prev.shipments.map((x) => (x.id === id ? { ...x, status } : x)),
          events: pushEvent(prev, `${sh.code} → ${shipmentLabels[status]}`),
        };
      });
    },

    openDispute: (shipmentId, openedBy, topic, detail) => {
      setState((prev) => {
        const sh = prev.shipments.find((x) => x.id === shipmentId);
        if (!sh) return prev;
        return {
          ...prev,
          disputes: [{ id: `DSP-${Math.floor(100 + Math.random() * 900)}`, shipmentId, shipmentCode: sh.code, openedBy, topic, detail, priority: "Sedang", status: "terbuka" }, ...prev.disputes],
          shipments: prev.shipments.map((x) => (x.id === shipmentId ? { ...x, disputeOpen: true } : x)),
          events: pushEvent(prev, `Komplain dibuka untuk ${sh.code}`),
        };
      });
    },

    /* ---------- OPEN BIDDING: custom jastip request ---------- */
    createRequest: (user, data) => {
      setState((prev) => ({
        ...prev,
        requests: [
          {
            ...data,
            id: uid(),
            code: `REQ-${2500 + prev.requests.length}-${String(Math.floor(Math.random() * 90) + 10)}`,
            customerId: user.id,
            customerName: user.name,
            status: "open",
            createdAt: nowLabel(),
          },
          ...(prev.requests ?? []),
        ],
        events: pushEvent(prev, `${user.name} open bidding: "${data.item}" — fee jastip ditawarkan Rp ${data.offeredFee.toLocaleString("id-ID")}`),
      }));
    },

    cancelRequest: (user, requestId) => {
      setState((prev) => ({
        ...prev,
        requests: (prev.requests ?? []).filter((r) => !(r.id === requestId && r.customerId === user.id && r.status === "open")),
        events: pushEvent(prev, `${user.name} membatalkan permintaan jastip`),
      }));
    },

    acceptRequest: (traveler, requestId, tripId) => {
      const req = (state.requests ?? []).find((r) => r.id === requestId);
      const trip = state.trips.find((t) => t.id === tripId && t.travelerId === traveler.id);
      if (!req || req.status !== "open") return { ok: false, message: "Permintaan ini sudah diambil traveler lain." };
      if (!trip || trip.status === "batal") return { ok: false, message: "Trip tidak valid." };
      const othersLocked = state.locks.filter((l) => l.tripId === tripId && l.userId !== traveler.id && l.expiresAt > Date.now()).reduce((a, l) => a + l.weightKg, 0);
      const available = trip.saleCapacityKg - trip.bookedKg - othersLocked;
      if ((req.estWeight ?? 0) > available) return { ok: false, message: `Kuota efektif trip kurang (sisa ${available.toFixed(1)} kg). Gunakan trip lain atau perluas Q_sale.` };
      const total = req.estPrice + req.offeredFee;
      const wallet = walletFor(state, req.customerId);
      if (wallet.balance < total) return { ok: false, message: `Saldo ${req.customerName} belum cukup untuk invoice pengadaan. Minta mereka top up dulu.` };
      let shipmentId = "";
      setState((prev) => {
        const w = walletFor(prev, req.customerId);
        shipmentId = uid();
        const escrowId = uid();
        const code = `BS-${String(3000 + prev.shipments.length)}-${Math.floor(100 + Math.random() * 900)}`;
        const route = `${trip.from} → ${trip.to}`;
        return {
          ...prev,
          requests: (prev.requests ?? []).map((r) => (r.id === requestId ? { ...r, status: "accepted", acceptedBy: traveler.id, acceptedByName: traveler.name, tripId, shipmentId, totalInvoice: total } : r)),
          shipments: [
            {
              id: shipmentId, code, customerId: req.customerId, customerName: req.customerName, tripId,
              travelerId: traveler.id, travelerName: traveler.name, route,
              item: `[Jastip Beli] ${req.item} × ${req.qty}`,
              items: [{ id: uid(), name: req.item, qty: req.qty, note: req.desc }],
              weight: req.estWeight, weightReal: req.estWeight, value: req.estPrice, price: total,
              escrowId, status: "menunggu_pickup" as ShipmentStatus, manifestReady: false,
              requestId, createdAt: nowLabel(),
            },
            ...prev.shipments,
          ],
          escrow: [{ id: escrowId, shipmentId, from: req.customerName, to: traveler.name, toId: traveler.id, amount: total, status: "ditahan" as const, createdAt: nowLabel() }, ...prev.escrow],
          trips: prev.trips.map((t) => {
            const booked = Math.round((t.bookedKg + req.estWeight) * 10) / 10;
            return t.id === tripId ? { ...t, bookedKg: booked, status: booked >= t.saleCapacityKg ? "penuh" : t.status } : t;
          }),
          wallets: {
            ...prev.wallets,
            [req.customerId]: { ...w, balance: w.balance - total, ledger: [{ id: uid(), label: `Invoice pengadaan ${req.code} (${route})`, amount: total, type: "out", time: nowLabel() }, ...w.ledger] },
          },
          events: pushEvent(prev, `${traveler.name} mengambil open bidding ${req.code} — membelikan "${req.item}"`),
        };
      });
      return { ok: true, message: `Permintaan diambil! Belikan "${req.item}" lalu upload bukti penerimaan untuk disetujui customer.` };
    },

    uploadProof: (traveler, requestId, image, note) => {
      setState((prev) => {
        const req = (prev.requests ?? []).find((r) => r.id === requestId);
        if (!req) return prev;
        return {
          ...prev,
          requests: (prev.requests ?? []).map((r) => (r.id === requestId ? { ...r, proofImage: image, proofNote: note } : r)),
          events: pushEvent(prev, `${traveler.name} upload bukti penerimaan untuk ${req.code}`),
        };
      });
    },

    approveProof: (user, requestId) => {
      setState((prev) => {
        const req = (prev.requests ?? []).find((r) => r.id === requestId);
        if (!req) return prev;
        return {
          ...prev,
          requests: (prev.requests ?? []).map((r) => (r.id === requestId ? { ...r, proofVerified: true, status: "closed" } : r)),
          shipments: prev.shipments.map((x) =>
            x.requestId === requestId
              ? { ...x, status: "manifest_disetujui" as ShipmentStatus, manifestReady: true, proofApproved: true, actualWeight: req.estWeight, itemCount: req.qty, manifestNote: `Bukti penerimaan diverifikasi customer. ${req.proofNote ?? ""}` }
              : x
          ),
          events: pushEvent(prev, `${user.name} menyetujui bukti ${req.code} — barang siap terbang`),
        };
      });
    },


    addProduct: (user, p) => {
      setState((prev) => ({
        ...prev,
        products: [{ ...p, id: uid(), resellerId: user.id, resellerName: user.name, sold: 0, active: true }, ...prev.products],
        events: pushEvent(prev, `${user.name} menambahkan produk "${p.name}"`),
      }));
    },

    updateProduct: (id, data) => {
      setState((prev) => ({ ...prev, products: prev.products.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
    },

    deleteProduct: (id) => {
      setState((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));
    },

    advanceOrder: (id) => {
      const order: OrderStatus[] = ["masuk", "diproses", "konsolidasi", "dikirim", "selesai"];
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          const next = order[Math.min(order.indexOf(o.status) + 1, order.length - 1)];
          return { ...o, status: next };
        }),
      }));
    },

    shipConsolidation: (user) => {
      let count = 0;
      setState((prev) => {
        const shipping = prev.orders.filter((o) => o.resellerId === user.id && o.status === "konsolidasi");
        count = shipping.length;
        if (!count) return prev;
        const totalKg = shipping.reduce((a, o) => a + o.weightKg, 0);
        return {
          ...prev,
          orders: prev.orders.map((o) => (shipping.find((s) => s.id === o.id) ? { ...o, status: "dikirim" } : o)),
          events: pushEvent(prev, `Batch konsolidasi ${totalKg.toFixed(1)} kg (${count} pesanan) diberangkatkan`),
        };
      });
      return count;
    },

    topUp: (userId, amount) => {
      setState((prev) => {
        const w = walletFor(prev, userId);
        return {
          ...prev,
          wallets: {
            ...prev.wallets,
            [userId]: { ...w, balance: w.balance + amount, ledger: [{ id: uid(), label: "Top up saldo", amount, type: "in", time: nowLabel() }, ...w.ledger] },
          },
        };
      });
    },

    withdraw: (userId) => {
      setState((prev) => {
        const w = walletFor(prev, userId);
        if (w.pending <= 0) return prev;
        return {
          ...prev,
          wallets: {
            ...prev.wallets,
            [userId]: { ...w, pending: 0, ledger: [{ id: uid(), label: "Tarik dana ke rekening", amount: w.pending, type: "out", time: nowLabel() }, ...w.ledger] },
          },
          events: pushEvent(prev, `Pencairan Rp ${w.pending.toLocaleString("id-ID")} ke rekening traveler`),
        };
      });
    },

    releaseEscrow: (escrowId) => {
      setState((prev) => {
        const tx = prev.escrow.find((e) => e.id === escrowId);
        if (!tx || tx.status === "dilepas") return prev;
        const payout = Math.round(tx.amount * (1 - PLATFORM_FEE));
        const w = walletFor(prev, tx.toId);
        return {
          ...prev,
          escrow: prev.escrow.map((e) => (e.id === escrowId ? { ...e, status: "dilepas" } : e)),
          wallets: {
            ...prev.wallets,
            [tx.toId]: { ...w, pending: w.pending + payout, ledger: [{ id: uid(), label: `Pencairan ${prev.shipments.find((x) => x.id === tx.shipmentId)?.code ?? "shipment"}`, amount: payout, type: "in", time: nowLabel() }, ...w.ledger] },
          },
          events: pushEvent(prev, `Escrow ${tx.amount.toLocaleString("id-ID")} dilepas ke ${tx.to}`),
        };
      });
    },

    dispatchShipment: (id) => {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((x) =>
          x.id === id ? { ...x, status: "dikirim_kurir" as ShipmentStatus, resi: `${Math.random() > 0.5 ? "JNE" : "GOSEND"}-${Math.floor(1000000 + Math.random() * 8999999)}` } : x
        ),
        events: pushEvent(prev, `Resi diterbitkan untuk ${prev.shipments.find((x) => x.id === id)?.code}`),
      }));
    },

    toggleUserStatus: (id) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, status: u.status === "aktif" ? "suspended" : "aktif" } : u)),
      }));
    },

    deleteUser: (id) => {
      setState((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== id) }));
    },

    startDispute: (id) => {
      setState((prev) => ({ ...prev, disputes: prev.disputes.map((d) => (d.id === id ? { ...d, status: "diproses" } : d)) }));
    },

    resolveDispute: (id, resolution) => {
      setState((prev) => {
        const d = prev.disputes.find((x) => x.id === id);
        return {
          ...prev,
          disputes: prev.disputes.map((x) => (x.id === id ? { ...x, status: "selesai", resolution } : x)),
          shipments: d ? prev.shipments.map((x) => (x.id === d.shipmentId ? { ...x, disputeOpen: false } : x)) : prev.shipments,
          events: pushEvent(prev, `Komplain ${id} diselesaikan`),
        };
      });
    },

    resetData: () => {
      localStorage.removeItem(STORAGE_KEY);
      setState(seedState);
    },

    /* ===== MARKETPLACE DOMESTIK AUSSIE ===== */

    auCreateListing: (user, data) => {
      const sellerProfile = state.auSellerProfiles.find((p) => p.userId === user.id);
      setState((prev) => ({
        ...prev,
        auListings: [
          {
            ...data,
            id: uid(),
            sellerId: user.id,
            sellerName: sellerProfile?.storeName ?? user.name,
            sellerState: sellerProfile?.state ?? data.state,
            sold: 0,
            status: "active",
            createdAt: nowLabel(),
          } as AuListing,
          ...prev.auListings,
        ],
        events: pushEvent(prev, `${user.name} listing baru di AusMarket: "${data.title}" — AUD ${data.priceAUD}`),
      }));
    },

    auUpdateListing: (id, data) => {
      setState((prev) => ({ ...prev, auListings: prev.auListings.map((l) => (l.id === id ? { ...l, ...data } : l)) }));
    },

    auDeleteListing: (id) => {
      setState((prev) => ({ ...prev, auListings: prev.auListings.filter((l) => l.id !== id) }));
    },

    auBuyNow: (user, listing, delivery, shippingAddress) => {
      if (listing.stock <= 0) return { ok: false, message: "Stok habis." };
      if (listing.sellerId === user.id) return { ok: false, message: "Tidak bisa beli listing sendiri." };
      if (!delivery || (delivery !== "meetup" && !shippingAddress?.trim())) return { ok: false, message: "Isi alamat pengiriman terlebih dahulu." };
      const orderId = `AUO-${Date.now().toString().slice(-6)}`;
      const escrowId = uid();
      const platformFeeAUD = Math.round(listing.priceAUD * AU_PLATFORM_FEE * 100) / 100;
      const sellerPayoutAUD = Math.round((listing.priceAUD - platformFeeAUD) * 100) / 100;
      const pickupPin = delivery === "meetup" ? String(Math.floor(1000 + Math.random() * 9000)) : undefined;
      const sellerProfile = state.auSellerProfiles.find((p) => p.userId === listing.sellerId);
      setState((prev) => ({
        ...prev,
        auOrders: [
          {
            id: orderId,
            listingId: listing.id,
            listingTitle: listing.title,
            sellerId: listing.sellerId,
            sellerName: sellerProfile?.storeName ?? listing.sellerName,
            buyerId: user.id,
            buyerName: user.name,
            priceAUD: listing.priceAUD,
            platformFeeAUD,
            sellerPayoutAUD,
            delivery,
            shippingAddress,
            trackingNo: "",
            pickupPin,
            status: "escrow_held",
            escrowId,
            createdAt: nowLabel(),
          },
          ...prev.auOrders,
        ],
        auEscrow: [
          { id: escrowId, orderId, from: user.name, to: sellerProfile?.storeName ?? listing.sellerName, toId: listing.sellerId, amountAUD: listing.priceAUD, status: "held", createdAt: nowLabel() },
          ...prev.auEscrow,
        ],
        auListings: prev.auListings.map((l) => l.id === listing.id ? { ...l, stock: l.stock - 1, sold: l.sold + 1 } : l),
        events: pushEvent(prev, `${user.name} membeli "${listing.title}" AUD ${listing.priceAUD} — escrow ditahan`),
      }));
      return { ok: true, message: "Pembelian berhasil. Escrow AUD ditahan sampai barang diterima.", orderId };
    },

    auVerifyPin: (_user, orderId, pin) => {
      const order = state.auOrders.find((o) => o.id === orderId);
      if (!order || order.status !== "ready_pickup") return { ok: false, message: "Order tidak dalam status siap ambil." };
      if (order.pickupPin !== pin.trim()) return { ok: false, message: "PIN salah. Minta kode 4 digit dari penjual." };
      setState((prev) => ({
        ...prev,
        auOrders: prev.auOrders.map((o) => o.id === orderId ? { ...o, status: "pin_verified" } : o),
        events: pushEvent(prev, `PIN terverifikasi — ${order.id} meetup selesai, escrow dilepas ke ${order.sellerName}`),
      }));
      // Auto release escrow
      setState((prev) => {
        const updatedProfiles = prev.auSellerProfiles.map((p) =>
          p.userId === order.sellerId ? { ...p, totalSalesAUD: Math.round((p.totalSalesAUD + order.sellerPayoutAUD) * 100) / 100 } : p
        );
        return {
          ...prev,
          auOrders: prev.auOrders.map((o) => o.id === orderId ? { ...o, status: "completed" } : o),
          auEscrow: prev.auEscrow.map((e) => e.orderId === orderId ? { ...e, status: "released" } : e),
          auSellerProfiles: updatedProfiles,
        };
      });
      return { ok: true, message: "PIN benar. Escrow otomatis cair ke penjual. Transaksi selesai." };
    },

    auConfirmShipping: (user, orderId, trackingNo) => {
      setState((prev) => ({
        ...prev,
        auOrders: prev.auOrders.map((o) =>
          o.id === orderId && o.sellerId === user.id
            ? { ...o, status: "shipped", trackingNo: trackingNo.trim() }
            : o
        ),
        events: pushEvent(prev, `${user.name} konfirmasi pengiriman ${orderId} — resi: ${trackingNo}`),
      }));
    },

    auBuyerConfirmReceived: (_user, orderId) => {
      const order = state.auOrders.find((o) => o.id === orderId);
      if (!order) return;
      setState((prev) => {
        const updatedProfiles = prev.auSellerProfiles.map((p) =>
          p.userId === order.sellerId ? { ...p, totalSalesAUD: Math.round((p.totalSalesAUD + order.sellerPayoutAUD) * 100) / 100 } : p
        );
        return {
          ...prev,
          auOrders: prev.auOrders.map((o) => o.id === orderId ? { ...o, status: "completed" } : o),
          auEscrow: prev.auEscrow.map((e) => e.orderId === orderId ? { ...e, status: "released" } : e),
          auSellerProfiles: updatedProfiles,
          events: pushEvent(prev, `Buyer konfirmasi terima ${orderId} — escrow AUD ${order.priceAUD} dilepas ke ${order.sellerName}`),
        };
      });
    },

    auReleasePayout: (orderId: string) => {
      const order = state.auOrders.find((o) => o.id === orderId);
      if (!order) return;
      setState((prev) => ({
        ...prev,
        auOrders: prev.auOrders.map((o) => o.id === orderId ? { ...o, status: "completed" } : o),
        auEscrow: prev.auEscrow.map((e) => e.orderId === orderId ? { ...e, status: "released" } : e),
        auSellerProfiles: prev.auSellerProfiles.map((p) =>
          p.userId === order.sellerId ? { ...p, totalSalesAUD: Math.round((p.totalSalesAUD + order.sellerPayoutAUD) * 100) / 100 } : p
        ),
        events: pushEvent(prev, `Admin release payout AUD ${order.sellerPayoutAUD} untuk ${orderId}`),
      }));
    },

    auDisputeOrder: (user, orderId, reason) => {
      setState((prev) => ({
        ...prev,
        auOrders: prev.auOrders.map((o) => o.id === orderId ? { ...o, status: "disputed" } : o),
        events: pushEvent(prev, `Sengketa dibuka untuk AU Order ${orderId} oleh ${user.name}: ${reason.slice(0, 60)}`),
      }));
    },

    auSaveSellerProfile: (user, data) => {
      setState((prev) => {
        const existing = prev.auSellerProfiles.find((p) => p.userId === user.id);
        if (existing) {
          return { ...prev, auSellerProfiles: prev.auSellerProfiles.map((p) => p.userId === user.id ? { ...p, ...data } : p) };
        }
        const newProfile: AuSellerProfile = {
          userId: user.id,
          storeName: data.storeName ?? user.name,
          storeDesc: data.storeDesc ?? "",
          state: data.state ?? "VIC – Melbourne",
          bsb: data.bsb ?? "",
          accountNo: data.accountNo ?? "",
          accountName: data.accountName ?? user.name,
          kycVerified: false,
          totalSalesAUD: 0,
          rating: 0,
          reviewCount: 0,
          joinedAt: nowLabel(),
          ...data,
        };
        return { ...prev, auSellerProfiles: [newProfile, ...prev.auSellerProfiles], events: pushEvent(prev, `${user.name} mendaftar sebagai Merchant AU`) };
      });
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
