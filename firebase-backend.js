/**
 * Serverless & Cloud Firestore Backend Engine for Firebase Hosting
 * Supports: /api/guests, /api/checkin, /api/checkin/status, /api/undo-checkin, /api/rsvp, /api/export
 * Works seamlessly on Firebase Hosting (Cloud Firestore + LocalStorage) and Localhost.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'undangan_guests_db_v1';
    const SEEDED_KEY = 'undangan_guests_seeded_v1';

    const FIREBASE_CONFIG = {
        projectId: "undangan-alim-vina",
        appId: "1:140591655943:web:928695cb122a40ffd94ea2",
        storageBucket: "undangan-alim-vina.firebasestorage.app",
        apiKey: "AIzaSyCnq9tXC_99jAv0NDtUr3td65orGlA2EB4",
        authDomain: "undangan-alim-vina.firebaseapp.com",
        messagingSenderId: "140591655943"
    };

    const originalFetch = window.fetch.bind(window);
    let firestoreDb = null;
    let firestoreMod = null;
    let firestoreReadyPromise = null;

    function nowFormatted() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    }

    function genId() {
        return 'gst_' + Math.random().toString(16).substring(2, 10);
    }

    function calculateStats(guests) {
        const list = Array.isArray(guests) ? guests : [];
        const total = list.length;
        const present = list.filter(g => g.rsvp_status === 'present').length;
        const notpresent = list.filter(g => g.rsvp_status === 'notpresent').length;
        const pending = list.filter(g => g.rsvp_status !== 'present' && g.rsvp_status !== 'notpresent').length;
        const total_pax = list
            .filter(g => g.rsvp_status === 'present')
            .reduce((sum, g) => sum + (parseInt(g.pax, 10) || 0), 0);
        const checked_in = list.filter(g => g.checked_in === true).length;
        const checked_in_pax = list
            .filter(g => g.checked_in === true)
            .reduce((sum, g) => sum + Math.max(parseInt(g.pax, 10) || 1, 1), 0);

        return {
            total,
            present,
            notpresent,
            pending,
            total_pax,
            checked_in,
            checked_in_pax
        };
    }

    function loadLocalGuests() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return null;
    }

    function saveLocalGuests(guests) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
            localStorage.setItem(SEEDED_KEY, 'true');
        } catch (e) {}
    }

    async function ensureInitialSeed() {
        let local = loadLocalGuests();
        if (local !== null) return local;

        try {
            const res = await originalFetch('/data/guests.json', { cache: 'no-store' });
            if (res.ok) {
                const seedData = await res.json();
                if (Array.isArray(seedData)) {
                    saveLocalGuests(seedData);
                    return seedData;
                }
            }
        } catch (e) {}

        saveLocalGuests([]);
        return [];
    }

    // Initialize Firebase & Cloud Firestore dynamically via CDN ES Modules
    function initFirestore() {
        if (firestoreReadyPromise) return firestoreReadyPromise;

        firestoreReadyPromise = (async () => {
            try {
                const appMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
                const fsMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
                const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
                firestoreDb = fsMod.getFirestore(app);
                firestoreMod = fsMod;

                // Try initial sync with Firestore
                const snap = await fsMod.getDocs(fsMod.collection(firestoreDb, 'guests'));
                if (!snap.empty) {
                    const cloudGuests = [];
                    snap.forEach(docSnap => {
                        const d = docSnap.data();
                        if (d && d.id) cloudGuests.push(d);
                    });
                    if (cloudGuests.length > 0) {
                        saveLocalGuests(cloudGuests);
                    }
                } else {
                    // Seed Firestore with initial local guests if Firestore is empty
                    const seedGuests = await ensureInitialSeed();
                    for (const g of seedGuests) {
                        if (g && g.id) {
                            await fsMod.setDoc(fsMod.doc(firestoreDb, 'guests', g.id), g).catch(() => {});
                        }
                    }
                }

                // Set up realtime listener so Admin dashboard updates live
                fsMod.onSnapshot(fsMod.collection(firestoreDb, 'guests'), (snapshot) => {
                    const updated = [];
                    snapshot.forEach(docSnap => {
                        const d = docSnap.data();
                        if (d && d.id) updated.push(d);
                    });
                    saveLocalGuests(updated);
                    if (typeof window.fetchGuests === 'function' && !window.__suppressRealtimeRefresh) {
                        window.__suppressRealtimeRefresh = true;
                        setTimeout(() => {
                            window.__suppressRealtimeRefresh = false;
                        }, 300);
                        window.fetchGuests();
                    }
                }, () => {
                    // Ignore listener errors if Firestore is still provisioning
                });

                return true;
            } catch (err) {
                return false;
            }
        })();

        return firestoreReadyPromise;
    }

    async function syncGuestToFirestore(guest) {
        try {
            await initFirestore();
            if (firestoreDb && firestoreMod && guest && guest.id) {
                await firestoreMod.setDoc(firestoreMod.doc(firestoreDb, 'guests', guest.id), guest);
            }
        } catch (e) {}
    }

    async function deleteGuestFromFirestore(guestId) {
        try {
            await initFirestore();
            if (firestoreDb && firestoreMod && guestId) {
                await firestoreMod.deleteDoc(firestoreMod.doc(firestoreDb, 'guests', guestId));
            }
        } catch (e) {}
    }

    async function getGuestsList() {
        const local = await ensureInitialSeed();
        // Trigger background Firestore init without blocking UI if slow
        try {
            await Promise.race([
                initFirestore(),
                new Promise(resolve => setTimeout(resolve, 1200))
            ]);
        } catch (e) {}
        return loadLocalGuests() || local || [];
    }

    function makeJsonResponse(payload, status = 200) {
        return new Response(JSON.stringify(payload), {
            status,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }

    // Export CSV directly in browser
    async function triggerCsvDownload() {
        const guests = await getGuestsList();
        const origin = window.location.origin;
        const csvLines = [
            "No,Nama Tamu,Sapaan,Kategori,No WhatsApp,Status RSVP,Jumlah Pax,Check-in di Lokasi,Waktu Check-in,Ucapan / Doa,Link Undangan"
        ];

        guests.forEach((g, idx) => {
            const name = String(g.name || '').replace(/"/g, '""');
            const sal = String(g.salutation || '').replace(/"/g, '""');
            const cat = String(g.category || '').replace(/"/g, '""');
            const phone = String(g.phone || '');
            const status = g.rsvp_status || 'pending';
            const statusLabel = status === 'present' ? 'Hadir' : (status === 'notpresent' ? 'Tidak Hadir' : 'Belum Konfirmasi');
            const pax = String(g.pax || 0);
            const isCheckin = g.checked_in ? 'Sudah Check-in' : 'Belum Check-in';
            const checkinTime = g.checkin_time || '-';
            const msg = String(g.message || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
            const encodedName = encodeURIComponent(g.name || '');
            const guestId = encodeURIComponent(g.id || '');
            const link = `${origin}/?to=${encodedName}&id=${guestId}`;

            csvLines.push(`"${idx + 1}","${name}","${sal}","${cat}","${phone}","${statusLabel}","${pax}","${isCheckin}","${checkinTime}","${msg}","${link}"`);
        });

        const csvContent = '\uFEFF' + csvLines.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'daftar_tamu_undangan.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Intercept /api/export link clicks
    document.addEventListener('click', function (e) {
        const anchor = e.target.closest('a[href="/api/export"]');
        if (anchor) {
            e.preventDefault();
            triggerCsvDownload();
        }
    });

    // Handle API Requests in Browser
    async function handleApiRequest(urlObj, options = {}) {
        const path = urlObj.pathname;
        const method = (options.method || 'GET').toUpperCase();
        let body = {};

        if (options.body) {
            try {
                body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            } catch (e) {
                body = {};
            }
        }

        const nowStr = nowFormatted();
        let guests = await getGuestsList();

        // 1. GET /api/guests
        if (path === '/api/guests' && method === 'GET') {
            return makeJsonResponse({
                success: true,
                guests: guests,
                stats: calculateStats(guests)
            });
        }

        function parseQrCodeInput(rawCode, fallbackId, fallbackName) {
            let guestId = String(fallbackId || '').trim();
            let guestName = String(fallbackName || '').trim();
            const raw = String(rawCode || '').trim();

            if (raw) {
                if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/') || raw.includes('?')) {
                    try {
                        const parsedUrl = new URL(raw, window.location.origin);
                        if (parsedUrl.searchParams.get('id')) {
                            guestId = parsedUrl.searchParams.get('id').trim();
                        }
                        const nameKeys = ['name', 'to', 'dear', 'kepada', 'u', 'guest', 'nama'];
                        for (const k of nameKeys) {
                            const val = parsedUrl.searchParams.get(k);
                            if (val && val.trim()) {
                                guestName = val.trim();
                                break;
                            }
                        }
                        if (!guestName && !guestId) {
                            guestName = 'Tamu Undangan';
                        }
                    } catch (e) {
                        guestName = raw;
                    }
                } else if (raw.startsWith('gst_')) {
                    guestId = raw;
                } else {
                    guestName = raw;
                }
            }

            return { guestId, guestName };
        }

        // 2. GET /api/checkin/status
        if (path === '/api/checkin/status' && method === 'GET') {
            const rawCode = (urlObj.searchParams.get('code') || '').trim();
            const { guestId, guestName } = parseQrCodeInput(
                rawCode,
                urlObj.searchParams.get('id'),
                urlObj.searchParams.get('name')
            );

            let found = null;
            if (guestId) {
                found = guests.find(g => g.id === guestId);
            }
            if (!found && guestName) {
                found = guests.find(g => String(g.name || '').trim().toLowerCase() === guestName.toLowerCase());
            }
            if (found) {
                return makeJsonResponse({ success: true, registered: true, guest: found });
            }
            if (guestName) {
                return makeJsonResponse({
                    success: true,
                    registered: false,
                    guest: {
                        id: guestId || '',
                        name: guestName,
                        salutation: 'Bapak/Ibu/Saudara/i',
                        category: 'Tamu Undangan',
                        rsvp_status: 'pending',
                        pax: 1,
                        checked_in: false,
                        checkin_time: null
                    }
                });
            }
            return makeJsonResponse({ success: false, message: 'Tamu belum terdaftar' }, 404);
        }

        // 3. POST /api/checkin
        if (path === '/api/checkin' && method === 'POST') {
            const { guestId, guestName } = parseQrCodeInput(body.code, body.id, body.name);
            const requestedPax = parseInt(body.pax, 10);

            let target = null;
            if (guestId) {
                target = guests.find(g => g.id === guestId);
            }
            if (!target && guestName) {
                target = guests.find(g => String(g.name || '').trim().toLowerCase() === guestName.toLowerCase());
            }

            if (target) {
                const already = Boolean(target.checked_in);
                if (body.name && String(body.name).trim() && target.name === 'Tamu Undangan') {
                    target.name = String(body.name).trim();
                }
                target.checked_in = true;
                if (!target.checkin_time) {
                    target.checkin_time = nowStr;
                }
                target.rsvp_status = 'present';
                if (!isNaN(requestedPax) && requestedPax >= 1) {
                    target.pax = requestedPax;
                } else if (!target.pax || parseInt(target.pax, 10) < 1) {
                    target.pax = 1;
                }
                target.updated_at = nowStr;

                saveLocalGuests(guests);
                await syncGuestToFirestore(target);

                const msg = already
                    ? `Kehadiran '${target.name}' berhasil diperbarui (${target.pax} orang).`
                    : `Check-in Berhasil! Selamat datang, ${target.name}.`;

                return makeJsonResponse({
                    success: true,
                    already_checked_in: already,
                    guest: target,
                    stats: calculateStats(guests),
                    message: msg
                });
            }

            if (guestName) {
                const finalPax = (!isNaN(requestedPax) && requestedPax >= 1) ? requestedPax : 1;
                const newG = {
                    id: genId(),
                    name: guestName,
                    salutation: 'Bapak/Ibu/Saudara/i',
                    phone: '',
                    category: 'Check-in Lokasi',
                    rsvp_status: 'present',
                    pax: finalPax,
                    message: '',
                    checked_in: true,
                    checkin_time: nowStr,
                    created_at: nowStr,
                    updated_at: nowStr
                };
                guests.push(newG);
                saveLocalGuests(guests);
                await syncGuestToFirestore(newG);

                return makeJsonResponse({
                    success: true,
                    already_checked_in: false,
                    guest: newG,
                    stats: calculateStats(guests),
                    message: `Tamu '${guestName}' berhasil dikonfirmasi hadir!`
                });
            }

            return makeJsonResponse({ success: false, message: 'Kode QR atau data tamu tidak valid.' }, 400);
        }

        // 4. POST /api/undo-checkin
        if (path === '/api/undo-checkin' && method === 'POST') {
            const guestId = String(body.id || '').trim();
            if (!guestId) {
                return makeJsonResponse({ success: false, message: 'ID diperlukan' }, 400);
            }
            const target = guests.find(g => g.id === guestId);
            if (target) {
                target.checked_in = false;
                target.checkin_time = null;
                target.updated_at = nowStr;
                saveLocalGuests(guests);
                await syncGuestToFirestore(target);
                return makeJsonResponse({
                    success: true,
                    message: 'Status check-in berhasil dibatalkan.',
                    stats: calculateStats(guests)
                });
            }
            return makeJsonResponse({ success: false, message: 'Tamu tidak ditemukan' }, 404);
        }

        // 5. POST /api/guests (Single or Bulk)
        if (path === '/api/guests' && method === 'POST') {
            if (body.bulk && Array.isArray(body.names)) {
                const category = String(body.category || 'Umum').trim() || 'Umum';
                const salutation = String(body.salutation || 'Bapak/Ibu/Saudara/i').trim() || 'Bapak/Ibu/Saudara/i';
                const added = [];
                for (const rawName of body.names) {
                    const cleanName = String(rawName || '').trim();
                    if (cleanName) {
                        const newG = {
                            id: genId(),
                            name: cleanName,
                            salutation,
                            phone: '',
                            category,
                            rsvp_status: 'pending',
                            pax: 0,
                            message: '',
                            checked_in: false,
                            checkin_time: null,
                            created_at: nowStr,
                            updated_at: nowStr
                        };
                        guests.push(newG);
                        added.push(newG);
                        syncGuestToFirestore(newG);
                    }
                }
                saveLocalGuests(guests);
                return makeJsonResponse({
                    success: true,
                    message: `${added.length} tamu berhasil ditambahkan.`,
                    count: added.length,
                    stats: calculateStats(guests)
                });
            }

            const name = String(body.name || '').trim();
            if (!name) {
                return makeJsonResponse({ success: false, message: 'Nama tamu tidak boleh kosong.' }, 400);
            }

            const newGuest = {
                id: genId(),
                name,
                salutation: String(body.salutation || 'Bapak/Ibu/Saudara/i').trim() || 'Bapak/Ibu/Saudara/i',
                phone: String(body.phone || '').trim(),
                category: String(body.category || 'Umum').trim() || 'Umum',
                rsvp_status: String(body.rsvp_status || 'pending'),
                pax: parseInt(body.pax || 0, 10) || 0,
                message: String(body.message || '').trim(),
                checked_in: false,
                checkin_time: null,
                created_at: nowStr,
                updated_at: nowStr
            };
            guests.push(newGuest);
            saveLocalGuests(guests);
            await syncGuestToFirestore(newGuest);

            return makeJsonResponse({
                success: true,
                message: `Tamu '${name}' berhasil ditambahkan.`,
                guest: newGuest,
                stats: calculateStats(guests)
            });
        }

        // 6. PUT /api/guests
        if (path === '/api/guests' && method === 'PUT') {
            const guestId = body.id;
            if (!guestId) {
                return makeJsonResponse({ success: false, message: 'Guest ID diperlukan' }, 400);
            }
            const target = guests.find(g => g.id === guestId);
            if (!target) {
                return makeJsonResponse({ success: false, message: 'Tamu tidak ditemukan' }, 404);
            }
            if ('name' in body) target.name = String(body.name).trim();
            if ('salutation' in body) target.salutation = String(body.salutation).trim();
            if ('phone' in body) target.phone = String(body.phone).trim();
            if ('category' in body) target.category = String(body.category).trim();
            if ('rsvp_status' in body) target.rsvp_status = String(body.rsvp_status);
            if ('pax' in body) target.pax = parseInt(body.pax || 0, 10) || 0;
            if ('message' in body) target.message = String(body.message).trim();
            if ('checked_in' in body) {
                target.checked_in = Boolean(body.checked_in);
                if (target.checked_in && !target.checkin_time) {
                    target.checkin_time = nowStr;
                } else if (!target.checked_in) {
                    target.checkin_time = null;
                }
            }
            target.updated_at = nowStr;
            saveLocalGuests(guests);
            await syncGuestToFirestore(target);

            return makeJsonResponse({
                success: true,
                message: 'Data tamu berhasil diperbarui.',
                stats: calculateStats(guests)
            });
        }

        // 7. DELETE /api/guests
        if (path === '/api/guests' && method === 'DELETE') {
            const guestId = urlObj.searchParams.get('id') || body.id || '';
            if (!guestId) {
                return makeJsonResponse({ success: false, message: 'Guest ID diperlukan' }, 400);
            }
            const beforeLen = guests.length;
            guests = guests.filter(g => g.id !== guestId);
            if (guests.length < beforeLen) {
                saveLocalGuests(guests);
                await deleteGuestFromFirestore(guestId);
                return makeJsonResponse({
                    success: true,
                    message: 'Tamu berhasil dihapus.',
                    stats: calculateStats(guests)
                });
            }
            return makeJsonResponse({ success: false, message: 'Tamu tidak ditemukan' }, 404);
        }

        // 8. POST /api/rsvp
        if (path === '/api/rsvp' && method === 'POST') {
            const author = String(body.name || '').trim();
            const attendance = String(body.attendance || 'notpresent');
            const pax = attendance === 'present' ? (parseInt(body.pax || 1, 10) || 1) : 0;
            const msg = String(body.message || '').trim();

            if (!author) {
                return makeJsonResponse({ success: false, message: 'Nama tidak boleh kosong.' }, 400);
            }

            let target = guests.find(g => String(g.name || '').trim().toLowerCase() === author.toLowerCase());
            if (target) {
                target.rsvp_status = attendance;
                target.pax = pax;
                if (msg) target.message = msg;
                target.updated_at = nowStr;
                saveLocalGuests(guests);
                await syncGuestToFirestore(target);
            } else {
                const newEntry = {
                    id: genId(),
                    name: author,
                    salutation: 'Bapak/Ibu/Saudara/i',
                    phone: '',
                    category: 'RSVP Mandiri',
                    rsvp_status: attendance,
                    pax,
                    message: msg,
                    checked_in: false,
                    checkin_time: null,
                    created_at: nowStr,
                    updated_at: nowStr
                };
                guests.push(newEntry);
                saveLocalGuests(guests);
                await syncGuestToFirestore(newEntry);
            }

            return makeJsonResponse({ success: true, message: 'Konfirmasi RSVP berhasil disimpan!' });
        }

        return makeJsonResponse({ error: 'Endpoint not found' }, 404);
    }

    // Override window.fetch for /api/* routes
    window.fetch = async function (input, init) {
        let urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        try {
            const urlObj = new URL(urlStr, window.location.origin);
            if (urlObj.origin === window.location.origin && urlObj.pathname.startsWith('/api/')) {
                return await handleApiRequest(urlObj, init || {});
            }
        } catch (e) {}
        return originalFetch(input, init);
    };

    // Start Firestore connection in background
    initFirestore();
})();
