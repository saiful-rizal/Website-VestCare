# Vest-Care Dashboard (React + Vite + Tailwind)

    npm install
    npm run dev      # http://localhost:5173
    npm run build    # hasil di dist/

## Integrasi VestCare API

1. Jalankan API dari folder root pada terminal pertama:

   ```powershell
   $env:VEST_API_KEY="isi-dengan-api-key-yang-sama"
   python server_rest_api.py
   ```

2. Salin `.env.example` menjadi `.env.local`, lalu isi `VEST_API_KEY` dengan
   key yang sama. Proxy Vite akan meneruskan `/api/detect` ke
   `http://127.0.0.1:8000/predict` dan menambahkan header `X-API-Key`.
   Key tidak dikirim atau dibundel ke browser.

- Data: `src/data.js` (contoh) dan `src/useVestData.js` (tempat sambung ke Supabase).
- Profil siswa: objek `profile` di `src/data.js`.
- Foto: `src/assets/img/student.png` dan `avatar.png`.
- Peta & font butuh internet.
- Tombol kamera mengirim foto sebagai field `gambar` ke endpoint API `/predict`.
- Jarak objek ditampilkan sebagai estimasi dari tinggi bounding box YOLO
  (`VEST_JARAK_FOKAL_PIKSEL` dapat dipakai untuk kalibrasi kamera); sensor
  ultrasonik belum digunakan pada alur kamera.
- Jangan commit `.env.local` atau API key ke repository.
