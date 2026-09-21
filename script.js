/* =========================================================
   SURAT DIGITAL — script.js
   Isi: 0 Konfigurasi · 1 Nama penerima · 2 Efek mengetik · 3 Reveal saat scroll
        4 Membuka amplop · 5 Pesan tersembunyi · 6 Baca lagi · 7 Musik
        8 Partikel, parallax & kursor
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 0. KONFIGURASI (aman diubah) ---------- */
  const CONFIG = {
    openDuration: 1900,   // ms sampai amplop memudar (samakan dengan animasi .is-opening di CSS)
    fadeDuration: 800,    // ms fade-out amplop (samakan dengan .stage di CSS)
    typingSpeed: 42,      // ms per huruf pada kalimat tulisan tangan
    particleCount: 14     // jumlah partikel melayang (dikurangi otomatis di layar kecil)
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (value) => (reduceMotion ? 0 : value);

  const stage    = $('#stage');
  const letter   = $('#letter');
  const openBtn  = $('#open-btn');
  const moreBtn  = $('#more-btn');
  const againBtn = $('#again-btn');
  const secret   = $('#secret');

  /* ---------- 1. NAMA PENERIMA ----------
     Cara mudah: ganti tulisan "kamu" pada elemen [data-recipient] di index.html.
     Opsional: buka index.html?to=Nama untuk mengganti nama lewat link. */
  const nameFromUrl = new URLSearchParams(location.search).get('to');
  if (nameFromUrl) {
    const name = nameFromUrl.trim().slice(0, 40);
    $$('[data-recipient]').forEach((el) => { el.textContent = name; });
    document.title = `Sebuah surat untuk ${name}`;
  }

  /* ---------- 2. EFEK MENGETIK ----------
     Teks asli tetap ada untuk screen reader (.sr-only);
     salinan visualnya dipecah per huruf dan ditampilkan bertahap. */
  function prepareTyping(el) {
    if (reduceMotion) return;                       // tanpa animasi: biarkan teks apa adanya
    const text = el.textContent.trim().replace(/\s+/g, ' ');

    const readable = document.createElement('span');
    readable.className = 'sr-only';
    readable.textContent = text;

    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');

    text.split(' ').forEach((word, i, words) => {
      const w = document.createElement('span');
      w.className = 'word';
      for (const char of word) {
        const c = document.createElement('span');
        c.className = 'ch';
        c.textContent = char;
        w.append(c);
      }
      visual.append(w);
      if (i < words.length - 1) visual.append(' ');
    });

    el.textContent = '';
    el.append(readable, visual);
    el._chars = $$('.ch', visual);
  }

  function playTyping(el) {
    if (!el._chars) return;
    cancelAnimationFrame(el._raf);
    let i = 0;
    let last = 0;
    const step = (now) => {
      if (!last) last = now;
      while (i < el._chars.length && now - last >= CONFIG.typingSpeed) {
        el._chars[i++].classList.add('on');
        last += CONFIG.typingSpeed;
      }
      if (i < el._chars.length) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  function resetTyping(el) {
    if (!el._chars) return;
    cancelAnimationFrame(el._raf);
    el._chars.forEach((c) => c.classList.remove('on'));
  }

  $$('[data-type]').forEach(prepareTyping);

  /* ---------- 3. REVEAL SAAT SCROLL ---------- */
  const reveals = $$('.reveal');
  let observer = null;

  function reveal(el) {
    el.classList.add('is-visible');
    if (el._chars) setTimeout(() => playTyping(el), 500);
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach(reveal);                        // browser lama: tampilkan semuanya
  }

  /* ---------- 4. MEMBUKA AMPLOP ---------- */
  function showLetter() {
    stage.hidden = true;
    letter.classList.add('is-open');
    window.scrollTo(0, 0);
    letter.focus({ preventScroll: true });          // pembaca layar langsung ke isi surat
  }

  openBtn.addEventListener('click', () => {
    openBtn.disabled = true;
    stage.classList.add('is-opening');              // memicu animasi CSS
    setTimeout(() => {
      stage.classList.add('is-leaving');            // amplop memudar
      setTimeout(showLetter, ms(CONFIG.fadeDuration));
    }, ms(CONFIG.openDuration));
  });

  /* ---------- 5. PESAN TERSEMBUNYI ("Ada satu hal lagi...") ---------- */
  const secretText = $('#secret-text');

  moreBtn.addEventListener('click', () => {
    if (typeof secret.showModal === 'function') secret.showModal();
    else secret.setAttribute('open', '');           // fallback browser lama
    resetTyping(secretText);
    setTimeout(() => playTyping(secretText), 600);
  });

  // Klik di luar kotak pesan juga menutup modal
  secret.addEventListener('click', (e) => { if (e.target === secret) secret.close(); });

  /* ---------- 6. BACA LAGI ---------- */
  function resetReveals() {
    letter.classList.add('is-resetting');           // matikan transisi sesaat agar reset tidak berkedip
    reveals.forEach((el) => {
      el.classList.remove('is-visible');
      resetTyping(el);
    });
    void letter.offsetWidth;                        // paksa browser menerapkan perubahan
    requestAnimationFrame(() => requestAnimationFrame(() => {
      letter.classList.remove('is-resetting');
      if (observer) reveals.forEach((el) => observer.observe(el));
    }));
  }

  againBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    const started = performance.now();
    const waitForTop = () => {                      // tunggu sampai scroll tiba di atas, lalu ulangi animasi
      if (window.scrollY > 2 && performance.now() - started < 2500) {
        requestAnimationFrame(waitForTop);
      } else {
        resetReveals();
      }
    };
    requestAnimationFrame(waitForTop);
  });

  /* ---------- 7. MUSIK (tanpa autoplay) ---------- */

  const openbtn = document.getElementById("open-btn");
const backsound = document.getElementById("backsound");

openBtn.addEventListener("click", function () {
    backsound.volume = 0.5;
    backsound.play();
});

  /* ---------- 8. PARTIKEL, PARALLAX, KURSOR ---------- */
  if (!reduceMotion) {
    // Partikel kecil yang melayang pelan
    const box = $('.particles');
    const count = innerWidth < 600 ? Math.ceil(CONFIG.particleCount * 0.6) : CONFIG.particleCount;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.setProperty('--x', `${Math.random() * 100}%`);
      p.style.setProperty('--s', `${(2 + Math.random() * 3).toFixed(1)}px`);
      p.style.setProperty('--d', `${(16 + Math.random() * 16).toFixed(1)}s`);
      p.style.setProperty('--delay', `${(-Math.random() * 30).toFixed(1)}s`);
      p.style.setProperty('--dx', `${(Math.random() * 80 - 40).toFixed(0)}px`);
      box.append(p);
    }

    // Parallax halus: nilai scroll dikirim ke CSS lewat variabel --scroll-y
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--scroll-y', Math.round(scrollY));
        ticking = false;
      });
    }, { passive: true });

    // Kursor halus, hanya untuk perangkat dengan mouse
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const cursor = document.createElement('div');
      cursor.className = 'cursor';
      cursor.setAttribute('aria-hidden', 'true');
      document.body.append(cursor);

      let x = 0, y = 0, tx = 0, ty = 0, raf = 0, placed = false;
      const follow = () => {
        x += (tx - x) * 0.16;
        y += (ty - y) * 0.16;
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        raf = (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) ? requestAnimationFrame(follow) : 0;
      };

      addEventListener('pointermove', (e) => {
        tx = e.clientX; ty = e.clientY;
        if (!placed) { x = tx; y = ty; placed = true; }
        cursor.classList.add('is-active');
        cursor.classList.toggle('is-hover', !!e.target.closest('button, a'));
        if (!raf) raf = requestAnimationFrame(follow);
      }, { passive: true });

      document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    }
  }
})();