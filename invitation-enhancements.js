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
        const guestName = recipient || 'Tamu Undangan';
        let checkinUrl = `${origin}/checkin?name=${encodeURIComponent(guestName)}`;
        if (guestId) {
            checkinUrl += `&id=${encodeURIComponent(guestId)}`;
        }

        barcodeWrapper.dataset.url = checkinUrl;

        function renderQR() {
            if (typeof QRCode !== 'undefined') {
                barcodeWrapper.innerHTML = '';
                new QRCode(barcodeWrapper, {
                    text: checkinUrl,
                    width: 120,
                    height: 120,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else {
                setTimeout(renderQR, 200);
            }
        }
        renderQR();

        // Check if guest is already checked in and display status badge
        if (recipient) {
            fetch(`/api/checkin/status?name=${encodeURIComponent(recipient)}&id=${encodeURIComponent(guestId || '')}`)
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

        // Waktu kemunculan teks hero mengikuti saat bingkai Jawa biru muncul di video (~5.3 detik pada kecepatan asli 1.0x)
        const delayMs = 5400;
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

            // Pantau waktu video secara ringan tanpa mengubah playbackRate di tengah jalan
            video.addEventListener('timeupdate', function () {
                if (!canPlayGateVideo) return;
                if (video.currentTime >= 5.2 && !frameRevealed) {
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

            // Animasi bertahap yang halus & mengalir (blur-to-clear + cubic-bezier)
            const items = [
                { sel: '.elementor-element-79fc006', delay: 80 },    // The Wedding of
                { sel: '.elementor-element-e4d73f0', delay: 260 },   // Alim
                { sel: '.elementor-element-851f9c3', delay: 440 },   // &
                { sel: '.elementor-element-d7081b6', delay: 620 },   // Vina
                { sel: '.elementor-element-83b7a8d', delay: 820 },   // #AlimVinaWedding
                { sel: '.elementor-element-83546e9', delay: 1000 },  // 12 . 12 . 2026
                { sel: '.elementor-element-1f63a8d', delay: 1200 }   // Scroll indicator
            ];

            requestAnimationFrame(() => {
                items.forEach(item => {
                    setTimeout(() => {
                        const el = document.querySelector(item.sel);
                        if (el) {
                            el.classList.remove('elementor-invisible');
                            el.classList.add('hero-animated');
                            el.style.opacity = '1';
                            el.style.visibility = 'visible';
                            el.style.transform = 'translate3d(0, 0, 0) scale(1)';
                            el.style.filter = 'blur(0px)';
                        }
                    }, item.delay);
                });
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

            // Fallback timer tepat saat bingkai Jawa biru terbuka (~5.4 detik pada kecepatan normal 1.0x)
            revealTimerId = setTimeout(revealKolomPertama, delayMs);
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
    // INITIALIZATION ON DOM READY
    // ==========================================
    function onReady() {
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
