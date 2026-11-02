/**
 * Standalone Enhancements for Blue Javanese Wedding Invitation
 * Thomas & Lydia
 */
(function ($) {
    'use strict';

    // ==========================================
    // 1. DYNAMIC GUEST NAME (URL Parameter Handler)
    // ==========================================
    function initGuestName() {
        const params = new URLSearchParams(window.location.search);
        const keys = ['to', 'dear', 'kepada', 'u', 'guest', 'nama', 'name'];
        let recipient = '';

        for (const key of keys) {
            const val = params.get(key);
            if (val && val.trim()) {
                recipient = val.trim();
                break;
            }
        }

        const targets = document.querySelectorAll('.namatamu h2, .namatamu');
        targets.forEach(el => {
            if (recipient) {
                if (el.tagName.toLowerCase() === 'h2') {
                    el.textContent = recipient;
                } else {
                    const h2 = el.querySelector('h2');
                    if (h2) h2.textContent = recipient;
                    else el.textContent = recipient;
                }
            } else {
                if (el.tagName.toLowerCase() === 'h2' && el.textContent.trim() === 'Nama Tamu') {
                    el.textContent = 'Tamu Undangan';
                }
            }
        });

        // Also update QR modal card guest name
        const qrGuestName = document.querySelector('.ewf-content-left .guest-name');
        if (qrGuestName) {
            qrGuestName.textContent = recipient || 'Tamu Undangan';
        }

        // Auto-fill RSVP form author name
        const authorField = document.getElementById('author');
        if (authorField) {
            authorField.value = recipient || '';
        }

        // Custom salutation / sapaan handler
        const sapaanKeys = ['s', 'sapaan', 'salutation'];
        let sapaan = '';
        for (const sk of sapaanKeys) {
            const sv = params.get(sk);
            if (sv && sv.trim()) {
                sapaan = sv.trim();
                break;
            }
        }

        if (sapaan) {
            const coverLabel = document.querySelector('.namatamu')?.closest('.elementor-widget-wrap')?.querySelector('p.elementor-heading-title');
            if (coverLabel) {
                coverLabel.textContent = `Kepada Yth. ${sapaan}`;
            }
            const qrLabel = document.querySelector('.ewf-content-left .label');
            if (qrLabel) {
                qrLabel.textContent = `Kepada Yth. ${sapaan}`;
            }
        }

        // Initialize Personalized QR Code Check-in
        const guestId = params.get('id') || '';
        initQrCheckin(recipient, guestId);
    }

    function initQrCheckin(recipient, guestId) {
        const barcodeWrapper = document.querySelector('.ewf-barcode-wrapper');
        if (!barcodeWrapper) return;

        const origin = window.location.origin;

        function buildCheckinUrl() {
            const authorInput = document.getElementById('author');
            const currentName = recipient || (authorInput && authorInput.value.trim()) || 'Tamu Undangan';
            let url = `${origin}/checkin?name=${encodeURIComponent(currentName)}`;
            if (guestId) {
                url += `&id=${encodeURIComponent(guestId)}`;
            }
            const qrGuestName = document.querySelector('.ewf-content-left .guest-name');
            if (qrGuestName) {
                qrGuestName.textContent = currentName;
            }
            return url;
        }

        function renderQR() {
            const checkinUrl = buildCheckinUrl();
            barcodeWrapper.dataset.url = checkinUrl;
            barcodeWrapper.setAttribute('data-url', checkinUrl);
            if (window.jQuery) {
                try {
                    window.jQuery(barcodeWrapper).data('url', checkinUrl);
                } catch (e) {}
            }

            if (typeof QRCode !== 'undefined') {
                barcodeWrapper.innerHTML = '';
                new QRCode(barcodeWrapper, {
                    text: checkinUrl,
                    width: 140,
                    height: 140,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                setTimeout(renderQR, 200);
            }
        }

        renderQR();
        setTimeout(renderQR, 800);

        const triggerBtn = document.querySelector('.ewf-barcode-trigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', function () {
                setTimeout(renderQR, 30);
            });
        }

        // Check if guest is already checked in and display status badge
        if (recipient || guestId) {
            fetch(`/api/checkin/status?name=${encodeURIComponent(recipient || '')}&id=${encodeURIComponent(guestId || '')}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.guest && data.guest.checked_in) {
                        const card = document.querySelector('.ewf-checkin-card');
                        if (card) {
                            const existingStatus = card.querySelector('.ewf-checkin-status');
                            if (existingStatus) existingStatus.remove();
                            const contentArea = card.querySelector('.ewf-content-area');
                            const statusHtml = `<div class="ewf-checkin-status status-checked-in" style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;padding:8px 12px;border-radius:8px;margin:8px 15px;display:flex;align-items:center;gap:8px;font-size:0.82rem;"><span class="status-icon" style="background:#10b981;color:#fff;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;">✓</span><div class="status-text"><strong>Sudah Check-in di Lokasi</strong><div style="font-size:0.75rem;opacity:0.8;">${data.guest.checkin_time || ''}</div></div></div>`;
                            if (contentArea) contentArea.insertAdjacentHTML('beforebegin', statusHtml);
                        }
                    }
                })
                .catch(() => {});
        }
    }

    // ==========================================
    // 2. COUNTDOWN TIMER ENGINE (Supports Split Widgets)
    // ==========================================
    function initCountdown() {
        const targetDate = new Date("2026-12-12T15:30:00+07:00").getTime();
        const countdownLists = document.querySelectorAll(".wpkoi-elements-countdown-items");
        if (!countdownLists.length) return;

        function updateCountdown() {
            const now = new Date().getTime();
            const diff = Math.max(0, targetDate - now);

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            document.querySelectorAll("[data-days]").forEach(el => {
                el.textContent = String(days).padStart(2, '0');
            });
            document.querySelectorAll("[data-hours]").forEach(el => {
                el.textContent = String(hours).padStart(2, '0');
            });
            document.querySelectorAll("[data-minutes]").forEach(el => {
                el.textContent = String(minutes).padStart(2, '0');
            });
            document.querySelectorAll("[data-seconds]").forEach(el => {
                el.textContent = String(seconds).padStart(2, '0');
            });
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // ==========================================
    // 3. COVER "BUKA UNDANGAN" & MOTION VIDEO
    // ==========================================
    function initCoverOpening() {
        const openBtn = document.getElementById('wds-button-cover');
        const tombolBuka = document.getElementById('tombol-buka');
        const song = document.getElementById('song');
        const video = document.querySelector('.motionSection .elementor-background-video-container video');
        const kolomPertama = document.querySelector('.kolomPertama');

        // Waktu kemunculan teks hero: setelah bingkai Jawa biru muncul penuh di video (~9.8 - 10.0 detik pada kecepatan 1.0x)
        const delayMs = 10000;
        if (kolomPertama) {
            kolomPertama.dataset.delayTime = String(delayMs);
        }

        let isOpened = false;
        let canPlayGateVideo = false;
        let frameRevealed = false;
        let revealTimerId = null;

        // Siapkan video di frame awal (gerbang tertutup) sekali saja saat halaman dimuat
        // tanpa mengubah-ubah playbackRate agar decoder memutar video 30fps dengan mulus tanpa patah-patah
        if (video) {
            video.autoplay = false;
            video.loop = false;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';
            try {
                video.defaultPlaybackRate = 1.0;
                video.playbackRate = 1.0;
                video.pause();
                if (video.currentTime > 0.05) {
                    video.currentTime = 0;
                }
            } catch (e) {}

            video.addEventListener('play', function () {
                if (!canPlayGateVideo) {
                    try {
                        video.pause();
                    } catch (e) {}
                }
            });

            // Tampilkan teks hanya SETELAH bingkai Jawa biru muncul di video (detik ke-9.8 pada kecepatan normal 1.0x)
            video.addEventListener('timeupdate', function () {
                if (!canPlayGateVideo) return;
                if (video.currentTime >= 9.8 && !frameRevealed) {
                    revealKolomPertama();
                }
            });
        }

        function smoothScrollToElement(targetEl, durationMs, onDone) {
            if (!targetEl) {
                if (onDone) onDone();
                return;
            }
            const startY = window.scrollY || window.pageYOffset || 0;
            const targetY = targetEl.getBoundingClientRect().top + startY;
            const startTime = performance.now();

            function step(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / durationMs, 1);
                const ease = progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                window.scrollTo(0, startY + (targetY - startY) * ease);
                if (elapsed < durationMs) {
                    requestAnimationFrame(step);
                } else {
                    window.scrollTo(0, targetY);
                    if (onDone) onDone();
                }
            }
            requestAnimationFrame(step);
        }

        function revealKolomPertama() {
            if (frameRevealed) return;
            frameRevealed = true;
            if (revealTimerId) {
                clearTimeout(revealTimerId);
                revealTimerId = null;
            }

            if (kolomPertama) {
                kolomPertama.classList.add('is-revealed');
                kolomPertama.style.opacity = '1';
                kolomPertama.style.visibility = 'visible';
                kolomPertama.style.pointerEvents = 'auto';
            }

            // Animasi bertahap yang sangat halus, mengalir, dan estetik setelah bingkai muncul
            const items = [
                {
                    sel: '.elementor-element-79fc006', // The Wedding of
                    delay: 100,
                    duration: 1300,
                    keyframes: [
                        { opacity: 0, transform: 'translate3d(0, -22px, 0) scale(0.92)', filter: 'blur(6px)' },
                        { opacity: 1, transform: 'translate3d(0, 2px, 0) scale(1.01)', filter: 'blur(0px)', offset: 0.7 },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0px)' }
                    ]
                },
                {
                    sel: '.elementor-element-e4d73f0', // Alim
                    delay: 380,
                    duration: 1450,
                    keyframes: [
                        { opacity: 0, transform: 'translate3d(-28px, 24px, 0) scale(0.86)', filter: 'blur(8px)' },
                        { opacity: 1, transform: 'translate3d(2px, -3px, 0) scale(1.03)', filter: 'blur(0px)', offset: 0.7 },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0px)' }
                    ]
                },
                {
                    sel: '.elementor-element-851f9c3', // &
                    delay: 660,
                    duration: 1300,
                    keyframes: [
                        { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(0.75)', filter: 'blur(6px)' },
                        { opacity: 1, transform: 'translate3d(0, -2px, 0) scale(1.05)', filter: 'blur(0px)', offset: 0.7 },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0px)' }
                    ]
                },
                {
                    sel: '.elementor-element-d7081b6', // Vina
                    delay: 920,
                    duration: 1450,
                    keyframes: [
                        { opacity: 0, transform: 'translate3d(28px, 24px, 0) scale(0.86)', filter: 'blur(8px)' },
                        { opacity: 1, transform: 'translate3d(-2px, -3px, 0) scale(1.03)', filter: 'blur(0px)', offset: 0.7 },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0px)' }
                    ]
                },
                {
                    sel: '.elementor-element-83b7a8d', // #AlimVinaWedding
                    delay: 1200,
                    duration: 1300,
                    keyframes: [
                        { opacity: 0, transform: 'translate3d(0, 24px, 0) scale(0.92)', filter: 'blur(6px)' },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0px)' }
                    ]
                },
                {
                    sel: '.elementor-element-83546e9', // 12 . 12 . 2026
                    delay: 1450,
                    duration: 1300,
                    keyframes: [
                        { opacity: 0, transform: 'translate3d(0, 24px, 0) scale(0.92)', filter: 'blur(6px)' },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0px)' }
                    ]
                },
                {
                    sel: '.elementor-element-1f63a8d', // Scroll indicator
                    delay: 1700,
                    duration: 1200,
                    keyframes: [
                        { opacity: 0, transform: 'translate3d(0, 20px, 0) scale(0.9)' },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
                    ]
                }
            ];

            items.forEach(item => {
                setTimeout(() => {
                    const el = document.querySelector(item.sel);
                    if (!el) return;

                    el.classList.remove('elementor-invisible');
                    el.style.visibility = 'visible';
                    el.style.opacity = '0';

                    const finalize = () => {
                        el.classList.add('hero-animated');
                        el.style.opacity = '1';
                        el.style.visibility = 'visible';
                        el.style.transform = 'translate3d(0, 0, 0) scale(1)';
                        el.style.filter = 'blur(0px)';
                    };

                    if (typeof el.animate === 'function') {
                        try {
                            const anim = el.animate(item.keyframes, {
                                duration: item.duration,
                                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                fill: 'forwards'
                            });
                            anim.onfinish = finalize;
                            setTimeout(finalize, item.duration + 60);
                        } catch (err) {
                            finalize();
                        }
                    } else {
                        void el.offsetWidth;
                        finalize();
                    }
                }, item.delay);
            });

            // Trigger scroll reveals untuk section di bawahnya
            setTimeout(() => {
                if (typeof window.revealElements === 'function') {
                    window.revealElements('.fade-in, .muncul-atas, .muncul-bawah, .muncul-kiri, .muncul-kanan, .zoom-in, .zoom-out, .fade-in2, .muncul-atas2, .muncul-bawah2, .muncul-kiri2, .muncul-kanan2, .zoom-in2, .zoom-out2, .estetik-reveal');
                }
            }, 350);
        }

        function startGateVideoAndTimer() {
            canPlayGateVideo = true;
            if (video) {
                video.loop = false;
                try {
                    if (video.playbackRate !== 1.0) {
                        video.playbackRate = 1.0;
                    }
                    if (video.currentTime > 0.2) {
                        video.currentTime = 0;
                    }
                } catch (e) {}

                const playPromise = video.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(e => {
                        console.log("Video play prevented:", e);
                        revealKolomPertama();
                    });
                }

                video.addEventListener('ended', function () {
                    video.pause();
                }, { once: true });
            }

            // Pastikan teks baru muncul SETELAH bingkai muncul (~9.8 - 10.0 detik)
            function checkAndReveal() {
                if (frameRevealed) return;
                if (video && !video.paused && !video.ended && video.currentTime > 0 && video.currentTime < 9.6) {
                    const remainingMs = Math.max(200, (9.8 - video.currentTime) * 1000);
                    revealTimerId = setTimeout(checkAndReveal, remainingMs);
                    return;
                }
                revealKolomPertama();
            }
            revealTimerId = setTimeout(checkAndReveal, delayMs);
        }

        function triggerOpen() {
            if (isOpened) return;
            isOpened = true;

            // Pastikan video belum berjalan selama proses scroll turun
            canPlayGateVideo = false;
            if (video && !video.paused) {
                try {
                    video.pause();
                } catch (e) {}
            }

            // Unlock scrolling
            document.body.style.overflowY = 'auto';
            document.body.style.height = 'auto';
            window.onscroll = null;

            // Putar musik latar
            if (song) {
                song.play().catch(e => console.log("Audio autoplay prevented:", e));
            }

            // Scroll mulus menuju section #open (650ms), lalu langsung putar video dengan kecepatan normal (30fps mulus)
            const openTarget = document.getElementById('open');
            smoothScrollToElement(openTarget, 650, function () {
                requestAnimationFrame(startGateVideoAndTimer);
            });
        }

        [openBtn, tombolBuka].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof e.stopImmediatePropagation === 'function') {
                    e.stopImmediatePropagation();
                }
                triggerOpen();
            }, true);
        });

        // Check if hash or URL param has open=true
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('open') === 'true') {
            isOpened = true;
            document.body.style.overflowY = 'auto';
            document.body.style.height = 'auto';
            window.onscroll = null;
            revealKolomPertama();
        } else if (window.location.hash && window.location.hash !== '#open') {
            isOpened = true;
            document.body.style.overflowY = 'auto';
            document.body.style.height = 'auto';
            window.onscroll = null;
            revealKolomPertama();
            setTimeout(() => {
                const targetEl = document.querySelector(window.location.hash);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'auto' });
            }, 300);
        } else if (window.location.hash === '#open') {
            history.replaceState(null, null, window.location.pathname + window.location.search);
            window.scrollTo(0, 0);
        }
    }

    // ==========================================
    // 4. UNIVERSAL AESTHETIC TEXT & SCROLL ANIMATIONS
    // ==========================================
    function initScrollAnimations() {
        // 1) Pastikan kontainer Cover Intro (.elementor-element-262846c6) langsung aktif
        //    agar animasi bertahap tiap teks di Cover Intro (T | L, The Wedding of, Thomas & Lydia,
        //    Kepada Yth, Tamu Undangan, Buka Undangan) langsung berjalan mulus saat halaman dibuka
        const coverEls = document.querySelectorAll('.elementor-element-4fa2f33c, .elementor-element-6cc43e73');
        coverEls.forEach(el => {
            el.classList.remove('elementor-invisible');
            el.classList.add('is-visible');
        });

        // 2) Tambahkan animasi estetik (.estetik-reveal) ke SEMUA elemen teks, judul, tombol, countdown,
        //    form RSVP, dan item galeri di seluruh isi undangan (di luar Cover & KolomPertama)
        const revealClasses = [
            'reveal', 'fade-in', 'muncul-atas', 'muncul-bawah', 'muncul-kiri', 'muncul-kanan', 'zoom-in', 'zoom-out',
            'fade-in2', 'muncul-atas2', 'muncul-bawah2', 'muncul-kiri2', 'muncul-kanan2', 'zoom-in2', 'zoom-out2',
            'estetik-reveal'
        ];

        const allSections = document.querySelectorAll('.elementor-section, .e-con');
        allSections.forEach(sec => {
            if (sec.classList.contains('elementor-element-262846c6') || sec.classList.contains('motionSection')) return;
            const textAndInteractiveEls = sec.querySelectorAll(
                '.elementor-widget-heading, .elementor-widget-text-editor, .elementor-widget-button, ' +
                '.elementor-widget-icon, .elementor-widget-divider, .elementor-widget-wpkoi-elements-countdown, ' +
                '.elementor-widget-weddingpress-copy-text, .ev-rsvp-field, .ev-rsvp-submit-field, ' +
                '.e-gallery-item, .closing-moved-meta'
            );
            textAndInteractiveEls.forEach((el, idx) => {
                if (el.closest('.elementor-element-262846c6') || el.closest('.kolomPertama') || el.closest('#amplop')) return;
                el.classList.add('estetik-reveal');
                const staggerMs = Math.min((idx % 6) * 90, 450);
                el.style.setProperty('--estetik-delay', `${staggerMs}ms`);
            });
        });

        const selectorList = ['.elementor-invisible', ...revealClasses.map(c => '.' + c)].join(', ');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        if (el.closest('.kolomPertama')) return;

                        revealClasses.forEach(cls => {
                            if (el.classList.contains(cls)) {
                                el.classList.add('active', 'is-visible');
                            }
                        });

                        if (el.classList.contains('elementor-invisible')) {
                            el.classList.remove('elementor-invisible');
                            let settings = {};
                            try {
                                if (el.dataset.settings) settings = JSON.parse(el.dataset.settings);
                            } catch (e) {}
                            const anim = settings._animation || settings.animation || 'fadeInUp';
                            el.classList.add('animated', 'is-visible', anim);
                        }
                    }
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

            document.querySelectorAll(selectorList).forEach(el => {
                if (!el.closest('.kolomPertama')) {
                    observer.observe(el);
                }
            });
        }
    }

    // ==========================================
    // 5. LOCAL RSVP (HADIR & TIDAK HADIR SAJA)
    // ==========================================
    const STORAGE_KEY = 'undangan_blue_javanese_wishes';

    function getLocalWishes() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {}
        return [];
    }

    function saveLocalWishes(wishes) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
        } catch (e) {}
    }

    function initRsvpForm() {
        const form = document.getElementById('ev-rsvp-form');
        if (!form) return;

        const presentRadio = form.querySelector('input[value="present"]');
        const notPresentRadio = form.querySelector('input[value="notpresent"]');
        const guestRow = form.querySelector('.ev-rsvp-guest-row');
        const guestField = form.querySelector('.ev-rsvp-guest-field');

        function toggleGuest() {
            const isPresent = Boolean(presentRadio && presentRadio.checked);
            if (guestRow) {
                guestRow.style.display = isPresent ? 'flex' : 'none';
            }
            if (guestField) {
                guestField.style.display = isPresent ? 'block' : 'none';
            }
        }

        [presentRadio, notPresentRadio].forEach(r => {
            if (r) r.addEventListener('change', toggleGuest);
        });

        // Form submit (capture phase to override external AJAX handler cleanly)
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            const authorInput = document.getElementById('author');
            const commentInput = document.getElementById('comment');
            const attendanceChecked = form.querySelector('input[name="attendance"]:checked');
            const guestSelect = document.getElementById('guest');

            const authorName = authorInput ? authorInput.value.trim() : '';
            const commentText = commentInput ? commentInput.value.trim() : '';

            if (!authorName) {
                if (window.Swal) {
                    Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Mohon isi nama Anda terlebih dahulu.' });
                } else {
                    alert('Mohon isi nama Anda terlebih dahulu.');
                }
                return;
            }

            if (!attendanceChecked) {
                if (window.Swal) {
                    Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Mohon pilih konfirmasi kehadiran (Hadir / Tidak Hadir).' });
                } else {
                    alert('Mohon pilih konfirmasi kehadiran (Hadir / Tidak Hadir).');
                }
                return;
            }

            const attendanceVal = attendanceChecked.value;
            const paxCount = attendanceVal === 'present' ? parseInt(guestSelect ? guestSelect.value : '1', 10) : 0;

            const newWish = {
                comment_id: Date.now(),
                author: authorName,
                attendance: attendanceVal,
                pax: paxCount,
                content: commentText,
                time_ago: 'Baru saja'
            };

            const wishes = getLocalWishes();
            wishes.unshift(newWish);
            saveLocalWishes(wishes);

            // Send to Backend API if available
            fetch('/api/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: authorName,
                    attendance: attendanceVal,
                    pax: paxCount,
                    message: commentText,
                    sticker: ''
                })
            }).catch(err => console.log('RSVP backend sync note:', err));

            // Clear input
            if (commentInput) commentInput.value = '';

            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Terima Kasih!',
                    text: 'Konfirmasi kehadiran dan ucapan Anda telah berhasil dikirimkan.',
                    confirmButtonColor: '#4E647A'
                });
            } else {
                alert('Terima kasih! Konfirmasi kehadiran dan ucapan Anda telah berhasil dikirimkan.');
            }
        }, true);
    }

    // ==========================================
    // 6. COPY TO CLIPBOARD HELPER
    // ==========================================
    function initCopyWidget() {
        document.querySelectorAll('.wdp-copy-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const textToCopy = this.dataset.clipboardText || (this.closest('.wdp-copy-box') ? this.closest('.wdp-copy-box').innerText : '');
                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        if (window.Swal) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Berhasil Disalin!',
                                text: textToCopy,
                                timer: 2000,
                                showConfirmButton: false
                            });
                        }
                    }).catch(() => {
                        const ta = document.createElement('textarea');
                        ta.value = textToCopy;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    });
                }
            });
        });
    }

    // ==========================================
    // 7. EXCLUSIVE GUEST LINK & 1-DEVICE LOCK GUARD
    // ==========================================
    const DEVICE_TOKEN_KEY = 'undangan_device_token_v1';

    function getOrCreateDeviceToken() {
        let token = '';
        try {
            token = localStorage.getItem(DEVICE_TOKEN_KEY) || '';
        } catch (e) {}

        if (!token) {
            try {
                const match = document.cookie.match(new RegExp('(^| )' + DEVICE_TOKEN_KEY + '=([^;]+)'));
                if (match && match[2]) {
                    token = decodeURIComponent(match[2]);
                }
            } catch (e) {}
        }

        if (!token) {
            const randPart = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID().replace(/-/g, '')
                : (Math.random().toString(36).substring(2) + Date.now().toString(36));
            token = 'dev_' + randPart.substring(0, 28);
        }

        try {
            localStorage.setItem(DEVICE_TOKEN_KEY, token);
        } catch (e) {}
        try {
            document.cookie = `${DEVICE_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
        } catch (e) {}

        return token;
    }

    function escapeHtmlStr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderExclusiveLockScreen(info) {
        // Stop audio & video and lock scroll
        const song = document.getElementById('song');
        if (song) {
            try { song.pause(); } catch (e) {}
        }
        const video = document.querySelector('.motionSection .elementor-background-video-container video');
        if (video) {
            try { video.pause(); } catch (e) {}
        }
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';

        let existing = document.getElementById('exclusive-lock-overlay');
        if (existing) existing.remove();

        const isDeviceLocked = info && info.reason === 'device_locked';
        const guestName = (info && info.guest_name) ? escapeHtmlStr(info.guest_name) : '';
        const salutation = (info && info.salutation) ? escapeHtmlStr(info.salutation) : 'Bapak/Ibu/Saudara/i';
        const title = escapeHtmlStr((info && info.title) || 'Undangan Terkunci');
        const message = escapeHtmlStr(
            (info && info.message) ||
            'Mohon maaf, tautan undangan ini bersifat pribadi dan hanya dapat diakses oleh penerima undangan yang terdaftar.'
        );

        const overlay = document.createElement('div');
        overlay.id = 'exclusive-lock-overlay';
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:999999',
            'background:radial-gradient(circle at center, #1e354d 0%, #0f1c2b 100%)',
            'color:#ffffff',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:24px',
            'font-family:"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
            'text-align:center'
        ].join(';');

        overlay.innerHTML = `
            <div style="max-width:440px;width:100%;background:rgba(255,255,255,0.06);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(212,175,55,0.38);border-radius:22px;padding:34px 26px;box-shadow:0 24px 60px rgba(0,0,0,0.48);position:relative;overflow:hidden;">
                <div style="width:74px;height:74px;margin:0 auto 16px;border-radius:50%;background:rgba(212,175,55,0.14);border:1.5px solid rgba(212,175,55,0.55);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 25px rgba(0,0,0,0.25);">
                    <img src="favicon.png" alt="Gunungan" style="width:48px;height:48px;object-fit:contain;" onerror="this.style.display='none'">
                </div>

                <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid rgba(248,113,113,0.4);padding:5px 14px;border-radius:999px;font-size:0.75rem;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:14px;">
                    🔒 Akses Undangan Terkunci
                </div>

                <h2 style="font-family:'Cinzel',serif;font-size:1.45rem;font-weight:700;color:#f5d77f;margin:0 0 10px;line-height:1.3;">
                    ${title}
                </h2>

                ${guestName ? `
                    <div style="background:rgba(15,28,43,0.65);border:1px solid rgba(212,175,55,0.3);border-radius:14px;padding:12px 16px;margin:14px 0;">
                        <div style="font-size:0.74rem;color:#cbd5e1;margin-bottom:3px;">Tautan Undangan Khusus Untuk:</div>
                        <div style="font-size:0.78rem;color:#e2e8f0;opacity:0.9;">${salutation}</div>
                        <div style="font-size:1.18rem;font-weight:800;color:#ffffff;margin-top:2px;">${guestName}</div>
                    </div>
                ` : ''}

                <p style="font-size:0.88rem;line-height:1.6;color:#e2e8f0;margin:12px 0 18px;">
                    ${message}
                </p>

                <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:11px 14px;font-size:0.76rem;color:#94a3b8;line-height:1.5;border:1px solid rgba(255,255,255,0.08);">
                    ${isDeviceLocked
                        ? 'Sistem keamanan <strong>1 Tautan = 1 Perangkat</strong> aktif. Jika Anda adalah pemilik undangan ini dan berganti HP/perangkat, silakan hubungi mempelai untuk mereset kunci perangkat Anda.'
                        : 'Pastikan Anda membuka tautan (link) undangan lengkap yang dikirimkan langsung melalui WhatsApp oleh mempelai.'}
                </div>

                <div style="margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1);font-family:'Cinzel',serif;font-size:0.82rem;color:#f5d77f;letter-spacing:1px;">
                    The Wedding of Alim &amp; Vina
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    async function initExclusiveAccessGuard() {
        const params = new URLSearchParams(window.location.search);
        const isAdminPreview = params.get('admin_preview') === '1' || params.get('preview') === 'admin';
        if (isAdminPreview) return;

        const keys = ['to', 'dear', 'kepada', 'u', 'guest', 'nama', 'name'];
        let recipient = '';
        for (const key of keys) {
            const val = params.get(key);
            if (val && val.trim()) {
                recipient = val.trim();
                break;
            }
        }
        const guestId = (params.get('id') || '').trim();

        // Immediately lock if opened without any guest link parameter
        if (!recipient && !guestId) {
            renderExclusiveLockScreen({
                reason: 'no_guest',
                title: 'Undangan Khusus Tamu Terdaftar',
                message: 'Mohon maaf, undangan digital ini bersifat pribadi dan hanya dapat dibuka melalui tautan (link) resmi yang dikirimkan khusus kepada masing-masing tamu undangan.'
            });
            return;
        }

        const deviceToken = getOrCreateDeviceToken();

        try {
            const res = await fetch('/api/verify-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: guestId,
                    name: recipient,
                    device_token: deviceToken,
                    admin_preview: isAdminPreview
                })
            });
            const data = await res.json();
            if (data && data.allowed === false) {
                renderExclusiveLockScreen(data);
            }
        } catch (err) {
            console.warn('Access verification check note:', err);
        }
    }

    // ==========================================
    // INITIALIZATION ON DOM READY
    // ==========================================
    function onReady() {
        initExclusiveAccessGuard();
        initGuestName();
        initCountdown();
        initCoverOpening();
        initScrollAnimations();
        initRsvpForm();
        initCopyWidget();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }

})(window.jQuery || function (fn) { document.addEventListener('DOMContentLoaded', fn); });
