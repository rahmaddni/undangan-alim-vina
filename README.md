# Replika Undangan Digital "Blue Javanese" (Thomas & Lydia)

Replika undangan pernikahan digital bertema adat Jawa biru (*Blue Javanese*) yang diekspor dan diadaptasi dari template WeddingPress / Elementor agar dapat berjalan mandiri (*standalone*), cepat, dan interaktif tanpa ketergantungan backend WordPress.

---

## 🌟 Fitur Utama

1. **Cover / Sampul Interaktif**:
   - Menampilkan monogram **T | L** dan ornamen adat Jawa biru (*Blue Javanese*).
   - Sapaan hangat kepada tamu undangan.
   - Nama tamu otomatis diambil dari parameter URL (`?to=Nama+Tamu`).
   - Tombol **"Buka Undangan"** yang membuka kunci halaman, memutar musik latar, dan memulai animasi video motion.

2. **Tampilan Responsif (Mobile & Desktop)**:
   - **Desktop**: Tampilan split-screen elegan. Sisi kiri menampilkan panel tetap (*sticky*) **The Wedding of Thomas & Lydia**, sedangkan sisi kanan menampilkan undangan mobile frame.
   - **Mobile**: Tampilan penuh (full width) yang nyaman dioperasikan di smartphone.

3. **Audio & Video Latar Belakang**:
   - Video motion HD pembuka bertema ornamen *Blue Javanese* (`video.mp4` / `Blue-Javanese-HD-1.mp4`) dengan kemunculan teks hero otomatis pada detik ke-9.
   - Musik instrumental Gamelan Jawa yang berputar otomatis setelah sampul dibuka.
   - Tombol floating musik (dapat di-pause dan di-play kapan saja).

4. **Kutipan Sakral (Ayat Suci)**:
   - QS. Ar-Rum ayat 21 dengan terjemahan.

5. **Profil Mempelai**:
   - Mempelai Pria: **Thomas Kuswoyo, S.T.** (Putra Kedua dari Bapak Sufian Jamal & Ibu Elmira).
   - Mempelai Wanita: **Lydia Safitri, S.Pd.** (Putri Pertama dari Bapak Adi Nugroho & Ibu Gani).
   - Tombol Instagram masing-masing mempelai.

6. **Hitung Mundur (Countdown Timer)**:
   - Dua baris widget penghitung mundur (Days & Hours, Minutes & Seconds) menuju hari H (31 Desember 2026 pukul 08.00 WIB) lengkap dengan tombol **Add to Calendar**.

7. **Rangkaian Acara**:
   - **Akad Nikah**: Kamis, 31 Desember 2026 | 08.00 WIB di Auditorium Masjid (Bogor, Jawa Barat).
   - **Resepsi**: Kamis, 31 Desember 2026 | 09.00 WIB - Selesai di Auditorium Masjid.
   - **Ngunduh Mantu**: Kamis, 31 Desember 2026 | 17.00 WIB - Selesai di Kediaman Mempelai Pria (Kebumen).
   - Tombol petunjuk arah / Google Maps.

8. **Dress Code & Live Streaming**:
   - Panduan palet warna busana tamu pilihan.
   - Tautan streaming virtual (Instagram Live & YouTube Live) bagi tamu yang berhalangan hadir.

9. **Wedding Gift / Amplop Digital**:
   - Tombol buka/sembunyikan amplop digital (**KLIK DI SINI** / **SEMBUNYIKAN**).
   - Rekening BCA & BNI dengan tombol **Copy** nomor rekening.
   - Gift Registry, Alamat Kirim Kado fisik, serta konfirmasi via WhatsApp.

10. **Galeri & Our Story**:
    - Video prewedding & 12 foto prewedding resolusi tinggi dengan fitur *lightbox*.
    - Cerita cinta perjalanan hubungan: Perkenalan, Lamaran, dan Pernikahan.

11. **RSVP & Wishes (Ucapan & Doa Interaktif)**:
    - Form konfirmasi kehadiran (**Hadir**, **Masih Ragu**, **Tidak Hadir**).
    - Pilihan jumlah tamu (1 orang, 2 orang, 3 orang).
    - Pilihan stiker ucapan menarik.
    - Sistem penyimpanan lokal (*localStorage*) & sinkronisasi ke server lokal (`/api/rsvp`) sehingga ucapan langsung tampil secara realtime.
    - Fitur Like untuk setiap doa & ucapan.

12. **Floating QR Code Check-in**:
    - Tombol QR Code mengambang untuk menampilkan kartu E-Invitation & QR Check-in tamu di lokasi acara.

---

## 🚀 Cara Menjalankan Undangan

### Opsi 1: Menjalankan Local Web Server (Direkomendasikan)
Gunakan server lokal bawaan Python yang telah disediakan:
```bash
python server.py
```
Lalu buka browser di alamat:
- **Default**: [http://localhost:8080](http://localhost:8080)
- **Dengan Nama Tamu**: [http://localhost:8080/?to=Budi+Santoso](http://localhost:8080/?to=Budi+Santoso)
- **Dashboard Admin & Scanner QR**: [http://localhost:8080/admin](http://localhost:8080/admin)

### Opsi 2: Buka Langsung File HTML
Buka file `index.html` langsung dengan mengklik dua kali (*double click*) di File Explorer untuk membukanya di browser.

---

## ⚙️ Panduan Kustomisasi

| Bagian | Lokasi File | Keterangan |
| :--- | :--- | :--- |
| **Nama Tamu di URL** | `?to=Nama+Anda` | Ubah parameter `to`, `dear`, atau `kepada` di URL. |
| **Nama Mempelai & Acara** | `index.html` | Cari kata kunci `Thomas`, `Lydia`, `Auditorium Masjid` untuk mengubah teks acara. |
| **Waktu Hitung Mundur** | `index.html` & `invitation-enhancements.js` | Cari atribut `data-date="Dec 31 2026 8:00:00"` dan variabel `targetDate`. |
| **Nomor Rekening & Bank** | `index.html` | Cari `0123456789` (BCA) dan `0987654321` (BNI) untuk mengganti nomor rekening Anda. |
| **Musik Latar** | `index.html` (tag `<audio id="song">`) | Ganti link `src` di dalam tag `<source>` dengan link lagu MP3 pilihan Anda. |
