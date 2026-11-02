// Warna & helper yang dipakai banyak komponen
export const COLOR = { Tinggi: "#c8281c", Sedang: "#d98a0b", Rendah: "#1f8a5b" };
export const ICON = {
  Lubang: "ni-support-16",
  Orang: "ni-satisfied",
  Pohon: "ni-world-2",
  Motor: "ni-delivery-fast",
  Mobil: "ni-car",
};
export const fmt = (n) => Number(n).toFixed(1).replace(".", ",");

export const profile = {
  nama: "Nama Siswa",
  sekolah: "SLBN Branjangan, Jember",
  perangkat: "Vest-Care (ESP32-S3)",
};

/* DATA CONTOH. Ganti dengan data dari Supabase di hook useVestData (src/useVestData.js). */
export const initialState = {
  device: { online: true, battery: 87 },
  position: { lat: -6.1754, lng: 106.8272, updated: "08:30:12" },
  detections: [
    { time: "08:30", object: "Lubang", distance: 0.8, confidence: 92, urgency: "Tinggi", lat: -6.1754, lng: 106.8272 },
    { time: "08:29", object: "Orang", distance: 1.5, confidence: 88, urgency: "Sedang", lat: -6.175, lng: 106.8265 },
    { time: "08:27", object: "Pohon", distance: 3.2, confidence: 95, urgency: "Rendah", lat: -6.1744, lng: 106.8254 },
  ],
};
