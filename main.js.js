console.log

  
// ===========================================
// BAGIAN 1: KONFIGURASI DAN INICIALISASI WAKTU SHOLAT
// ===========================================

// Pengaturan default lokasi
// Anda bisa menyimpan lokasi ini di LocalStorage agar tidak hilang
let userCity = localStorage.getItem('userCity') || 'Jakarta';
let userCountry = localStorage.getItem('userCountry') || 'Indonesia';

// Method 3 (Makkah) atau 5 (Egyptian) adalah method standar.
// Method 5 (Egyptian General Authority of Survey) sering digunakan di Indonesia.
const PRAYER_CALCULATION_METHOD = 5; 
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

document.addEventListener('DOMContentLoaded', () => {
    // Tampilkan lokasi yang tersimpan saat pertama kali memuat
    const locationInput = document.getElementById('user-location');
    if (locationInput) {
        locationInput.value = userCity;
    }
    
    // Perbarui tanggal saat ini
    updateCurrentDate();
    
    // Panggil fungsi utama untuk mengambil waktu sholat
    fetchPrayerTimes(userCity, userCountry);
    
    // Tambahkan event listener untuk tombol simpan lokasi (jika ada)
    // Asumsi Anda memiliki tombol dengan ID 'save-location-btn'
    const saveBtn = document.getElementById('save-location-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveLocationAndFetch);
    }
});

// Fungsi untuk memperbarui tanggal
function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        // Opsi format tanggal yang lebih user-friendly
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('id-ID', options);
    }
}

// ===========================================
// BAGIAN 2: FUNGSI PENGAMBILAN DATA (FETCH)
// ===========================================

/**
 * Menyimpan lokasi baru yang diinput user dan mengambil data sholat.
 */
function saveLocationAndFetch() {
    const locationInput = document.getElementById('user-location');
    if (locationInput && locationInput.value.trim()) {
        const newCity = locationInput.value.trim();
        
        // Simpan ke LocalStorage
        localStorage.setItem('userCity', newCity);
        userCity = newCity;
        
        // Asumsi negaranya tetap Indonesia, atau bisa minta user input negara juga
        // Jika perlu input negara, ganti cara ini menjadi:
        // const [city, country] = newCity.split(',').map(s => s.trim());
        
        document.getElementById('fetch-status').textContent = 'Mengambil waktu sholat...';
        fetchPrayerTimes(userCity, userCountry);
    } else {
        alert("Mohon masukkan nama kota yang valid.");
    }
}


/**
 * Mengambil waktu sholat dari Aladhan API.
 * @param {string} city - Nama kota.
 * @param {string} country - Nama negara.
 */
async function fetchPrayerTimes(city, country) {
    const apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=${PRAYER_CALCULATION_METHOD}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.code !== 200 || !data.data || !data.data.timings) {
            throw new Error("Data waktu sholat tidak ditemukan untuk lokasi ini.");
        }

        const timings = data.data.timings;
        updatePrayerDisplay(timings);
        
        // Setelah data berhasil diambil, mulai hitungan mundur
        startCountdown(timings);
        
        document.getElementById('fetch-status').textContent = `${city}, ${country}`;
        
    } catch (error) {
        console.error("Gagal mengambil waktu sholat:", error);
        document.getElementById('fetch-status').textContent = `Gagal: ${error.message}. Menggunakan default.`;
        // Jika gagal, Anda bisa menampilkan waktu sholat dummy atau waktu terakhir yang disimpan
    }
}

// ===========================================
// BAGIAN 3: FUNGSI DISPLAY DAN COUNTDOWN
// ===========================================

/**
 * Memperbarui elemen HTML dengan waktu sholat yang diambil.
 * @param {object} timings - Objek waktu sholat dari API.
 */
function updatePrayerDisplay(timings) {
    // Menggunakan ID yang sesuai dengan HTML Anda
    document.getElementById('fajr-time').textContent = timings.Fajr.replace(' (WIB)', '');
    document.getElementById('dhuhr-time').textContent = timings.Dhuhr.replace(' (WIB)', '');
    document.getElementById('asr-time').textContent = timings.Asr.replace(' (WIB)', '');
    document.getElementById('maghrib-time').textContent = timings.Maghrib.replace(' (WIB)', '');
    document.getElementById('isha-time').textContent = timings.Isha.replace(' (WIB)', '');
    
    // Simpan timings di variabel global atau LocalStorage jika diperlukan di tempat lain
    localStorage.setItem('prayerTimings', JSON.stringify(timings));
}

let countdownInterval;

/**
 * Memulai logika hitungan mundur untuk sholat berikutnya.
 * @param {object} timings - Objek waktu sholat hari ini.
 */
function startCountdown(timings) {
    // Hentikan interval sebelumnya jika ada
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    const prayerTimesList = [
        { name: 'Subuh', time: timings.Fajr },
        { name: 'Dzuhur', time: timings.Dhuhr },
        { name: 'Ashar', time: timings.Asr },
        { name: 'Maghrib', time: timings.Maghrib },
        { name: 'Isya', time: timings.Isha },
    ];
    
    // Fungsi untuk mengupdate hitungan mundur setiap detik
    const updateCountdown = () => {
        const now = new Date();
        let nextPrayer = null;
        let nextPrayerName = '';
        let minDifference = Infinity;

        // 1. Cek waktu sholat hari ini
        for (const prayer of prayerTimesList) {
            // Buat objek Date untuk waktu sholat hari ini
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const prayerDate = new Date(now.getFullYear(), now.getMonth(), now.getDay(), hours, minutes, 0);

            const difference = prayerDate.getTime() - now.getTime();
            
            // Jika waktu sholat belum terlewati (perbedaan > 0)
            if (difference > 0 && difference < minDifference) {
                minDifference = difference;
                nextPrayer = prayerDate;
                nextPrayerName = prayer.name;
            }
        }
        
        // 2. Jika semua waktu sholat hari ini sudah terlewati, cari waktu sholat pertama besok (Subuh)
        if (!nextPrayer) {
            // Asumsi Subuh adalah waktu sholat pertama di list
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1); // Besok
            
            const fajrTime = prayerTimesList[0].time;
            const [hours, minutes] = fajrTime.split(':').map(Number);
            
            const tomorrowFajr = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDay(), hours, minutes, 0);

            minDifference = tomorrowFajr.getTime() - now.getTime();
            nextPrayerName = 'Subuh';
            nextPrayer = tomorrowFajr;
        }

        // 3. Tampilkan hasil hitungan mundur
        if (nextPrayer) {
            // Konversi milidetik ke jam, menit, detik
            let totalSeconds = Math.floor(minDifference / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const formatTime = (time) => String(time).padStart(2, '0');

            document.getElementById('next-prayer-name').textContent = `Menuju ${nextPrayerName}`;
            document.getElementById('countdown-timer').textContent = 
                `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`;
        }
    };
    
    // Jalankan fungsi updateCountdown segera, lalu ulangi setiap 1 detik
    updateCountdown(); 
    countdownInterval = setInterval(updateCountdown, 1000);
}



// ===========================================
// BAGIAN 4: FITUR QUOTE HARIAN (INSPIRASI)
// ===========================================

const quotes = [
    {
        text: "Barangsiapa menempuh jalan untuk menuntut ilmu, maka Allah akan mudahkan baginya jalan menuju surga.",
        source: "(HR. Muslim)"
    },
    {
        text: "Sesungguhnya amal itu tergantung niatnya, dan sesungguhnya setiap orang akan mendapatkan sesuai dengan apa yang ia niatkan.",
        source: "(HR. Bukhari dan Muslim)"
    },
    {
        text: "Takutlah kamu akan doa orang yang terzalimi, karena tidak ada dinding pemisah antara dia dengan Allah.",
        source: "(HR. Bukhari)"
    },
    {
        text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain.",
        source: "(HR. Ahmad)"
    },
    {
        text: "Janganlah kamu remehkan sedikit pun dari kebaikan, meskipun hanya dengan bermuka manis saat bertemu saudaramu.",
        source: "(HR. Muslim)"
    },
    {
        text: "Orang yang kuat bukanlah yang pandai bergulat, tapi orang yang mampu menahan dirinya ketika marah.",
        source: "(HR. Bukhari dan Muslim)"
    },
    {
        text: "Dunia ini adalah perhiasan, dan sebaik-baik perhiasan adalah wanita shalihah (istri/pasangan).",
        source: "(HR. Muslim)"
    },
    {
        text: "Senyummu di hadapan saudaramu adalah sedekah bagimu.",
        source: "(HR. Tirmidzi)"
    }
];


/**
 * Menampilkan quote (kutipan) harian secara acak
 */
function displayDailyQuote() {
    const quoteElement = document.getElementById('daily-quote-text');
    const sourceElement = document.getElementById('daily-quote-source');
    
    if (quoteElement && sourceElement) {
        // Logika untuk menampilkan quote yang sama selama 24 jam (Harian)
        // 1. Dapatkan hari ini dalam format YYYYMMDD
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        
        // 2. Cek apakah ada quote yang disimpan untuk hari ini
        const storedQuote = JSON.parse(localStorage.getItem('dailyQuote'));
        let selectedQuote;
        
        if (storedQuote && storedQuote.date === today) {
            // Gunakan quote yang sudah tersimpan
            selectedQuote = storedQuote.quote;
        } else {
            // Pilih quote baru secara acak
            const randomIndex = Math.floor(Math.random() * quotes.length);
            selectedQuote = quotes[randomIndex];
            
            // Simpan quote baru dan tanggalnya
            localStorage.setItem('dailyQuote', JSON.stringify({
                date: today,
                quote: selectedQuote
            }));
        }

        // Tampilkan quote ke dalam elemen HTML
        quoteElement.textContent = selectedQuote.text;
        sourceElement.textContent = `— ${selectedQuote.source}`;
    }
}


// Tambahkan pemanggilan fungsi ini ke event listener DOMContentLoaded di main.js Anda
document.addEventListener('DOMContentLoaded', () => {
    // ... (kode inisialisasi waktu sholat, dll.)
    
    // Panggil fungsi quote harian
    displayDailyQuote();
    
    // ... (kode event listener lainnya)
});


// ===========================================
// BAGIAN 6: FITUR FIQIH PRAKTIS DI BERANDA
// ===========================================

const fiqhTopics = [
    { 
        title: "Syarat Wudhu yang Sering Lupa", 
        snippet: "Rukun Wudhu: 1. Niat; 2. Membasuh wajah; 3. Membasuh kedua tangan sampai siku; 4. Mengusap sebagian kepala; 5. Membasuh kedua kaki sampai mata kaki; 6. Tertib (berurutan). Sering lupa pada urutan dan niatnya.", 
        source: "Fiqih Thaharah"
    },
    { 
        title: "Kapan Sholat Dzuhur Boleh Digabung dengan Ashar (Jamak)?", 
        snippet: "Sholat boleh dijamak (digabung) hanya saat kamu bepergian jauh (minimal 80.64 km) atau dalam kondisi darurat seperti sakit parah. Jangan jamak hanya karena sibuk kuliah/kerja, kecuali bepergian.", 
        source: "Fiqih Sholat Safar"
    },
    { 
        title: "Hukum Shalat di Kendaraan Umum", 
        snippet: "Jika dalam perjalanan dan khawatir waktu sholat habis, kamu boleh shalat di kendaraan (mobil/kereta) dengan duduk, namun wajib menghadap kiblat saat Takbiratul Ihram jika memungkinkan.", 
        source: "Fiqih Sholat"
    },
    { 
        title: "Apa Hukum Mencicipi Masakan Saat Puasa?", 
        snippet: "Mencicipi masakan diperbolehkan asalkan hanya di ujung lidah dan tidak menelannya. Hal ini tidak membatalkan puasa, namun harus hati-hati dan dihindari berlebihan.", 
        source: "Fiqih Puasa"
    }
];

/**
 * Memuat dan menampilkan satu topik Fiqih Praktis ke Beranda secara acak.
 */
function displayDailyFiqhSnippet() {
    const titleElement = document.getElementById('fiqh-topic-title');
    const snippetElement = document.getElementById('fiqh-snippet');
    
    if (titleElement && snippetElement) {
        // Pilih topik Fiqih secara acak
        const randomIndex = Math.floor(Math.random() * fiqhTopics.length);
        const selectedTopic = fiqhTopics[randomIndex];
        
        // Isi konten card
        titleElement.textContent = selectedTopic.title;
        snippetElement.textContent = selectedTopic.snippet;
    }
}


// Tambahkan pemanggilan fungsi ini ke event listener DOMContentLoaded di main.js Anda
document.addEventListener('DOMContentLoaded', () => {
    // ... (kode inisialisasi Waktu Sholat dan Quote Harian)
    
    // Panggil fungsi Fiqih Praktis
    displayDailyFiqhSnippet(); 
    
    // ... (kode event listener lainnya)
});




   
       // =======================================================
// FUNGSI UNTUK MENGUPDATE TANGGAL OTOMATIS
// =======================================================
function updateDate() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    
    // Pastikan elemen ditemukan sebelum dilanjutkan
    if (!dateDisplay) return; 

    const now = new Date();
    
    // Opsi untuk format tanggal
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    // Menggunakan locale 'id-ID' untuk mendapatkan nama hari dan bulan dalam bahasa Indonesia
    const formattedDate = now.toLocaleDateString('id-ID', options);
    
    // Perbarui teks di HTML
    dateDisplay.textContent = formattedDate;
}
 
 
// =======================================================
// DATA KUTIPAN INSPIRATIF
// =======================================================
const inspirationalQuotes = [
    {
        quote: "Amalan yang paling dicintai oleh Allah adalah amalan yang kontinyu (berkelanjutan) meskipun sedikit.",
        source: "Hadis Riwayat Bukhari dan Muslim"
    },
    {
        quote: "Bukan kesulitan yang membuat kita takut, tapi ketakutan yang membuat kita sulit. Jangan pernah menyerah.",
        source: "Sayyidina Ali bin Abi Thalib"
    },
    {
        quote: "Istiqomah adalah saat kamu memilih untuk tetap berjalan di jalan yang benar, meskipun kamu tidak melihat siapa pun berjalan bersamamu.",
        source: "Anonim"
    },
    {
        quote: "Jangan pernah meremehkan perbuatan baik sekecil apapun, bahkan tersenyum kepada saudaramu.",
        source: "Hadis"
    },
    {
        quote: "Hidup ini sangat singkat. Jangan sibuk dengan urusan duniawi sampai melupakan akhirat.",
        source: "Imam Syafi'i"
    }
];

// =======================================================
// FUNGSI MENAMPILKAN KUTIPAN ACAK
// =======================================================
function displayRandomQuote() {
    const quoteEl = document.getElementById('dailyQuoteText');
    const sourceEl = document.getElementById('quoteSource');

    if (quoteEl && sourceEl) {
        // Ambil indeks acak
        const randomIndex = Math.floor(Math.random() * inspirationalQuotes.length);
        const randomQuote = inspirationalQuotes[randomIndex];

        // Tampilkan kutipan dengan format yang rapi
        quoteEl.textContent = `“${randomQuote.quote}”`;
        sourceEl.textContent = `— ${randomQuote.source}`;
    }
}


 

// =======================================================
// FUNGSI PENGATUR HALAMAN (SHOWSECTION)
// FUNGSI INI WAJIB ADA AGAR TOMBOL MENU BEKERJA
// =======================================================
function showSection(sectionId) {
    // 1. Sembunyikan semua section yang ada
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    // 2. Tampilkan section yang diminta
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        
        // Reset scroll ke atas
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }

        // Panggil fungsi inisialisasi fitur (jika ada)
        if (sectionId === 'doa-bacaan') {
            console.log('Halaman Doa Harian dimuat!');
        }
       if (sectionId === 'qibla-section') {
    findQibla(); // Panggil fungsi untuk menghitung dan memutar kompas
} 
    
    }
}






// =======================================================
// FUNGSI PENDUKUNG (ADDPOINTS, UPDATE DATE)
// =======================================================
function addPoints(points) {
    const DAILY_SCORE_KEY = 'istiqomah_daily_score';
    const currentScore = parseInt(localStorage.getItem(DAILY_SCORE_KEY) || 0);
    const newScore = currentScore + points;
    localStorage.setItem(DAILY_SCORE_KEY, newScore);
    if (typeof updateScoreDisplay === 'function') {
        updateScoreDisplay(newScore);
    }
}

function updateDate() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    if (!dateDisplay) return; 

    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const formattedDate = now.toLocaleDateString('id-ID', options);
    dateDisplay.textContent = formattedDate;
}


// =======================================================
// INISIALISASI SAAT HALAMAN DIMUAT
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // Tampilkan halaman Beranda (home-section) saat pertama kali dimuat
    try {
        // PENTING: Gunakan ID yang benar untuk Beranda Anda (home-section atau home)
        showSection('home-section'); 
        updateDate(); // Panggil fungsi update tanggal
    } catch (error) {
        console.error("Aplikasi gagal inisialisasi:", error);
    }
    
    // Tempatkan semua kode inisialisasi lain di sini
});

    
    
 // =======================================================
// KONSTANTA DAN FUNGSI KOMPAS KIBLAT
// =======================================================

// Koordinat Ka'bah, Mekkah (digunakan untuk perhitungan)
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

/**
 * Mengkonversi sudut dari radian ke derajat.
 */
function toDegrees(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Mengkonversi sudut dari derajat ke radian.
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Fungsi utama untuk menghitung arah Kiblat.
 */
function calculateQibla(userLat, userLon) {
    const latK = toRadians(KAABA_LAT); // Lintang Ka'bah
    const lonK = toRadians(KAABA_LON); // Bujur Ka'bah
    const latU = toRadians(userLat);   // Lintang Pengguna
    const lonU = toRadians(userLon);   // Bujur Pengguna

    // Perhitungan menggunakan rumus bola besar (Great Circle Bearing)
    const y = Math.sin(lonK - lonU);
    const x = Math.cos(latU) * Math.tan(latK) - Math.sin(latU) * Math.cos(lonK - lonU);
    
    // Hasil bearing dalam radian, lalu konversi ke derajat
    let bearing = toDegrees(Math.atan2(y, x));

    // Pastikan hasilnya antara 0 dan 360 derajat (dari Utara)
    if (bearing < 0) {
        bearing += 360;
    }

    return bearing;
}

/**
 * Menggunakan Geolocation API untuk mendapatkan lokasi dan menampilkan Kiblat.
 */
function findQibla() {
    const statusEl = document.getElementById('qibla-status');
    const degreeEl = document.getElementById('qibla-degree');
    const needleEl = document.getElementById('qibla-needle');

    if (navigator.geolocation) {
        statusEl.textContent = "Mencari lokasi Anda...";
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                
                // Hitung arah Kiblat
                const qiblaDirection = calculateQibla(userLat, userLon);
                
                // Tampilkan hasil
                statusEl.textContent = "Kiblat Ditemukan!";
                degreeEl.textContent = `${qiblaDirection.toFixed(2)}°`;
                
                // Putar jarum kompas menggunakan CSS Transform
                if (needleEl) {
                    needleEl.style.transform = `rotate(${qiblaDirection}deg)`;
                }
            },
            (error) => {
                // Tangani error jika pengguna menolak atau GPS mati
                statusEl.textContent = "Gagal Akses Lokasi (Izin Ditolak atau GPS Mati).";
                degreeEl.textContent = "--";
                console.error("Geolocation error:", error);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        statusEl.textContent = "Geolocation tidak didukung oleh browser Anda.";
        degreeEl.textContent = "N/A";
    }
}
   

    
    
// =======================================================
// FUNGSI BARU UNTUK SISTEM POIN HARIAN (GANTI FUNGSI LAMA)
// =======================================================

const DAILY_SCORE_KEY = 'istiqomah_daily_score'; // Kunci penyimpanan skor harian

// FUNGSI BARU: Menghitung poin hari ini (10 poin per sholat fardhu)
function calculateDailyPoints(status) {
    let points = 0;
    // Kita anggap semua input di checklist-sholat-card adalah sholat fardhu
    for (const id in status) {
        if (status[id] === true) {
            points += 10; // Setiap sholat yang dicentang memberikan 10 poin
        }
    }
    return points;
}

// FUNGSI BARU: Memperbarui tampilan skor total di dashboard
function updateScoreDisplay(points) {
    const scoreElement = document.getElementById('dailyScoreDisplay');
    if (scoreElement) {
        scoreElement.textContent = points.toString();
    }
}


// FUNGSI 1: Menyimpan status checklist & MENGHITUNG POIN (GANTI FUNGSI saveChecklistStatus)
function saveChecklistStatus() {
    const checklistInputs = document.querySelectorAll('.checklist-sholat-card input[type="checkbox"]');
    const status = {};
    
    checklistInputs.forEach(input => {
        const id = input.getAttribute('data-id');
        if (id) {
            status[id] = input.checked;
        }
    });

    // 1. Hitung poin hari ini
    const dailyPoints = calculateDailyPoints(status);
    
    // 2. Simpan status checklist dengan kunci harian
    const dailyKey = getDailyStorageKey();
    localStorage.setItem(dailyKey, JSON.stringify(status));
    
    // 3. Simpan poin harian
    localStorage.setItem(DAILY_SCORE_KEY, dailyPoints.toString());
    
    // 4. Perbarui tampilan
    updateScoreDisplay(dailyPoints);
    console.log(`Status checklist dan Poin Harian (${dailyPoints}) berhasil disimpan.`);
}


// FUNGSI 2: Memuat status checklist & POIN (GANTI FUNGSI loadChecklistStatus)
function loadChecklistStatus() {
    const dailyKey = getDailyStorageKey();
    const savedStatus = localStorage.getItem(dailyKey);
    
    // 1. Muat dan tampilkan skor harian
    const savedScore = localStorage.getItem(DAILY_SCORE_KEY);
    updateScoreDisplay(savedScore ? parseInt(savedScore) : 0);

    // 2. Muat status centang
    if (!savedStatus) {
        return; 
    }

    try {
        const status = JSON.parse(savedStatus);
        
        for (const id in status) {
            const input = document.querySelector(`input[data-id="${id}"]`);
            if (input) {
                input.checked = status[id];
            }
        }
    } catch (e) {
        console.error("Gagal memuat status checklist:", e);
    }
}
// =======================================================
    
    
    
    
// =======================================================
// FUNGSI BARU UNTUK KUNCI PENYIMPANAN
// =======================================================

// Fungsi untuk mendapatkan kunci yang unik untuk hari ini (misal: 'checklist_2025-09-27')
function getDailyStorageKey() {
    const today = new Date();
    // Menggunakan ISO string untuk mendapatkan format YYYY-MM-DD
    const dateString = today.toISOString().split('T')[0]; 
    return `checklist_${dateString}`; // Kunci akan berubah setiap hari
}

// FUNGSI 1: Menyimpan status checklist ke localStorage (MODIFIKASI)
function saveChecklistStatus() {
    const checklistInputs = document.querySelectorAll('.checklist-sholat-card input[type="checkbox"]');
    const status = {};
    
    checklistInputs.forEach(input => {
        const id = input.getAttribute('data-id');
        if (id) {
            status[id] = input.checked;
        }
    });

    const dailyKey = getDailyStorageKey();
    // Simpan data menggunakan kunci harian
    localStorage.setItem(dailyKey, JSON.stringify(status));
    console.log("Status checklist berhasil disimpan untuk hari ini:", dailyKey);
}

// FUNGSI 2: Memuat status checklist dari localStorage (MODIFIKASI)
function loadChecklistStatus() {
    const dailyKey = getDailyStorageKey();
    const savedStatus = localStorage.getItem(dailyKey); // Ambil data hari ini
    
    if (!savedStatus) {
        // Jika tidak ada data tersimpan untuk hari ini, SEMUA CHECKBOX AKAN KOSONG
        return; 
    }

    try {
        const status = JSON.parse(savedStatus);
        
        for (const id in status) {
            const input = document.querySelector(`input[data-id="${id}"]`);
            if (input) {
                // Atur status centang
                input.checked = status[id];
            }
        }
        console.log("Status checklist berhasil dimuat untuk hari ini:", dailyKey);
    } catch (e) {
        console.error("Gagal memuat status checklist dari localStorage:", e);
    }
}

// =======================================================
// KONSTANTA BARU
// =======================================================
const TOTAL_PRAYERS = 5; // Jumlah total sholat fardhu (Subuh, Dzuhur, Ashar, Maghrib, Isya)
const MAX_DAILY_POINTS = TOTAL_PRAYERS * 10; // Poin maksimal harian: 50
const STREAK_KEY = 'istiqomah_streak_count'; // Kunci untuk menyimpan streak saat ini


// FUNGSI BARU: Fungsi untuk mendapatkan tanggal N hari yang lalu
function getPreviousDateKey(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo); // Mundur N hari
    const dateString = date.toISOString().split('T')[0];
    return `checklist_${dateString}`;
}

// FUNGSI BARU: Menghitung Streak Beruntun
function calculateStreak() {
    let currentStreak = 0;
    
    // Looping mundur hari demi hari
    for (let daysAgo = 1; daysAgo < 365; daysAgo++) { 
        
        // Dapatkan kunci penyimpanan dari hari sebelumnya
        const yesterdayKey = getPreviousDateKey(daysAgo);
        const yesterdayScoreKey = 'istiqomah_daily_score'; // Anggap skor hari lalu disimpan di key ini
        
        // Ambil skor dari hari sebelumnya
        const yesterdayScore = localStorage.getItem(yesterdayScoreKey.replace('daily_score', yesterdayKey));
        
        // Karena kita tidak menyimpan skor harian dengan kunci tanggal,
        // KITA HARUS MEMERIKSA CHECKLIST NYA LANGSUNG

        const yesterdayChecklist = localStorage.getItem(yesterdayKey);

        // Jika tidak ada data tersimpan untuk hari itu, streak PATAH.
        if (!yesterdayChecklist) {
            break; 
        }

        try {
            const status = JSON.parse(yesterdayChecklist);
            let checkedCount = 0;
            for (const id in status) {
                if (status[id] === true) {
                    checkedCount++;
                }
            }

            // Cek apakah SEMUA sholat (5) diselesaikan hari itu
            if (checkedCount === TOTAL_PRAYERS) {
                currentStreak++; // Streak berlanjut
            } else {
                break; // Streak PATAH jika ada yang bolong
            }

        } catch (e) {
            console.error("Gagal parse data streak untuk hari:", yesterdayKey);
            break;
        }
    }
    
    return currentStreak;
}


// FUNGSI BARU: Memperbarui tampilan Streak
function updateStreakDisplay(streakCount) {
    const streakEl = document.getElementById('currentStreakDisplay');
    if (streakEl) {
        streakEl.textContent = streakCount.toString();
        // Opsional: berikan efek glow jika streak tinggi
        if (streakCount > 0) {
             streakEl.style.textShadow = '0 0 8px rgba(255, 126, 95, 0.7)';
        } else {
             streakEl.style.textShadow = 'none';
        }
    }
}


// MODIFIKASI: Perbarui loadChecklistStatus() untuk menampilkan streak saat halaman dimuat
function loadChecklistStatus() {
    // ... (kode pemuatan checklist dan poin yang sudah ada di sini) ...
    
    // 1. Muat dan tampilkan skor harian (Tetap sama)
    const savedScore = localStorage.getItem(DAILY_SCORE_KEY);
    updateScoreDisplay(savedScore ? parseInt(savedScore) : 0);
    
    // 2. Muat status centang (Tetap sama)
    // ...
    
    // 3. HITUNG DAN TAMPILKAN STREAK SAAT MEMUAT
    const currentStreak = calculateStreak();
    updateStreakDisplay(currentStreak);

    // ... (lanjutan try/catch kode pemuatan status)
}




// FUNGSI 3: Menginisialisasi Event Listener (TETAP SAMA)
function initializeChecklistStorage() {
    // 1. Muat status checklist yang terakhir disimpan saat aplikasi dimulai
    loadChecklistStatus();

    // 2. Tambahkan event listener ke setiap checkbox
    const checklistInputs = document.querySelectorAll('.checklist-sholat-card input[type="checkbox"]');
    checklistInputs.forEach(input => {
        // Setiap perubahan akan memicu penyimpanan dengan kunci harian
        input.addEventListener('change', saveChecklistStatus); 
    });
}
// =======================================================

    
    
    
  // =======================================================
// FUNGSI BARU: WAKTU SHOLAT DINAMIS
// =======================================================
const PRAYER_API_URL = "https://api.aladhan.com/v1/timingsByCity";
const LOCATION_CITY = "Bengkulu";
const LOCATION_COUNTRY = "Indonesia";

let prayerTimes = {};
let orderedPrayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function formatTime(time24) {
// API Aladhan sudah memberikan format 24 jam (HH:MM).
// Kita langsung kembalikan nilainya tanpa konversi ke AM/PM.
return time24;
}

function updatePrayerTable(times) {
    const tableBody = document.getElementById('prayerTimesBody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Bersihkan tabel
    const today = new Date();
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    
    // Menampilkan waktu sholat dan mencari sholat berikutnya
    let nextPrayerIndex = -1;
    let nextPrayerTime = Infinity;

    orderedPrayerNames.forEach((name, index) => {
        // Ambil waktu sholat dari API
        const time24 = times[name];
        const [h, m] = time24.split(':').map(Number);
        const prayerMinutes = h * 60 + m;

        // Bandingkan untuk mencari sholat berikutnya
        if (prayerMinutes > nowMinutes && prayerMinutes < nextPrayerTime) {
            nextPrayerTime = prayerMinutes;
            nextPrayerIndex = index;
        }

        // Tampilkan di tabel
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${name}</td>
            <td class="time-value">${formatTime(time24)}</td>
        `;
        // if (index === nextPrayerIndex) {
        //     row.classList.add('active-prayer'); // Tandai sholat berikutnya
        // }
    });
    
    // Jika semua sholat hari ini sudah terlewat, set sholat berikutnya ke Subuh besok
    if (nextPrayerIndex === -1) {
         nextPrayerIndex = 0; // Subuh
    }
    
    return orderedPrayerNames[nextPrayerIndex];
}


function startCountdown(nextPrayerName) {
    const countdownEl = document.getElementById('countdownTimer');
    const nextPrayerNameEl = document.getElementById('nextPrayerName');
    
    if (!countdownEl || !nextPrayerNameEl) return;
    
    const nextTime24 = prayerTimes[nextPrayerName];
    if (!nextTime24) return;

    // Tampilkan nama sholat berikutnya
    nextPrayerNameEl.textContent = nextPrayerName;

    const [targetH, targetM] = nextTime24.split(':').map(Number);
    
    // Fungsi yang diperbarui setiap detik
    setInterval(() => {
        const now = new Date();
        let target = new Date();
        target.setHours(targetH, targetM, 0, 0);

        // Jika waktu target sudah terlewat hari ini, set target untuk besok
        if (now > target) {
            target.setDate(target.getDate() + 1);
        }
        
        const diffSeconds = Math.floor((target.getTime() - now.getTime()) / 1000);
        
        const h = Math.floor(diffSeconds / 3600);
        const m = Math.floor((diffSeconds % 3600) / 60);
        const s = diffSeconds % 60;

        // Format countdown: HH:MM:SS
        countdownEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        // Jika hitungan mundur selesai (00:00:00), muat ulang data (opsional, untuk kesegaran)
        if (diffSeconds <= 0) {
             // Muat ulang waktu sholat untuk hari berikutnya
             fetchPrayerTimes(); 
        }

    }, 1000);
}


async function fetchPrayerTimes() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // Bulan dimulai dari 0
    const day = today.getDate();

    try {
        const response = await fetch(`${PRAYER_API_URL}/${day}-${month}-${year}?city=${LOCATION_CITY}&country=${LOCATION_COUNTRY}&method=11`); // Method 11 adalah Kemenag RI
        const data = await response.json();

        if (data.code === 200 && data.status === 'OK') {
            // Simpan waktu sholat (hanya waktu utama)
            prayerTimes = {
                Fajr: data.data.timings.Fajr,
                Dhuhr: data.data.timings.Dhuhr,
                Asr: data.data.timings.Asr,
                Maghrib: data.data.timings.Maghrib,
                Isha: data.data.timings.Isha
            };
            
            // Perbarui tabel dan dapatkan sholat berikutnya
            const nextPrayer = updatePrayerTable(prayerTimes);
            
            // Mulai hitungan mundur (Hanya panggil sekali)
            if (!window.prayerCountdownStarted) {
                startCountdown(nextPrayer);
                window.prayerCountdownStarted = true;
            } else {
                 // Jika sudah berjalan, cukup update tabel dan nama sholat berikutnya
                 document.getElementById('nextPrayerName').textContent = nextPrayer;
            }

        } else {
            document.getElementById('countdownTimer').textContent = "Error API";
            console.error("Gagal memuat waktu sholat:", data.data);
        }
    } catch (error) {
        document.getElementById('countdownTimer').textContent = "Error Jaringan";
        console.error("Gagal fetch waktu sholat:", error);
    }
}




// =======================================================
// FUNGSI MENAMPILKAN SEMUA KUTIPAN DI HALAMAN KHUSUS
// =======================================================
function populateQuoteSection() {
    const container = document.getElementById('allQuotesContainer');
    if (!container) return;

    // Kosongkan container sebelum mengisi ulang
    container.innerHTML = ''; 

    // Ambil data kutipan yang sudah ada
    inspirationalQuotes.forEach(item => {
        const quoteItem = document.createElement('div');
        // Gunakan class baru untuk styling
        quoteItem.classList.add('container', 'quote-list-item');
        
        // 1. Kutipan
        const quoteText = document.createElement('p');
        quoteText.classList.add('list-quote-text');
        quoteText.textContent = `"${item.quote}"`;

        // 2. Sumber
        const quoteSource = document.createElement('p');
        quoteSource.classList.add('list-quote-source');
        quoteSource.textContent = `— ${item.source}`;
        
        quoteItem.appendChild(quoteText);
        quoteItem.appendChild(quoteSource);
        container.appendChild(quoteItem);
    });
}



// Panggil fungsi utama saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // ... kode inisialisasi Anda yang lain ...
    
    // Panggil ini untuk memulai
    fetchPrayerTimes(); 
});
  
    
  document.addEventListener('DOMContentLoaded', () => {
    // ... kode inisialisasi yang sudah ada (misalnya: initializeColorTheme(), fetchPrayerTimes()) ...
    
    // Panggil fungsi penyimpanan data BARU
    initializeChecklistStorage();
    
    // ... sisa kode di dalam DOMContentLoaded ...
});
  
    
    
// ===== FUNGSI CLOCK YANG SUDAH DIMODIFIKASI (FORMAT 24 JAM) =====
function clock() {
    let hour = document.getElementById('hour');
    let minute = document.getElementById('minute');
    let seconds = document.getElementById('seconds');
    // let ampm = document.getElementById('ampm'); // Baris ini tidak perlu lagi

    // Cek apakah elemen jam ada di halaman aktif.
    if (!hour) return; 
    let date = new Date();
    let h = date.getHours(); // Langsung ambil jam 24 jam
    let m = date.getMinutes();
    let s = date.getSeconds();
    
    // TIDAK PERLU LOGIKA KONVERSI 12 JAM/AM/PM
    // if (h >= 12) { ... }
    
    // Pastikan angka selalu 2 digit (misalnya 09 bukan 9)
    h = (h < 10) ? '0' + h : h;
    m = (m < 10) ? '0' + m : m;
    s = (s < 10) ? '0' + s : s;

    hour.innerHTML = h;
    minute.innerHTML = m;
    seconds.innerHTML = s;
    // ampm.innerHTML = ''; // Tidak perlu menampilkan AM/PM
};
// =======================================================
// Panggilan setInterval tetap sama:
var interval = setInterval(clock, 1000); 
// =======================================================


document.addEventListener('DOMContentLoaded', () => {
    // ... kode yang sudah ada ...
    
    // Panggil fungsi untuk menampilkan tanggal saat load
    updateDate(); 

    // Panggil fungsi showSection untuk menampilkan Beranda
    try {
        showSection('home-section'); 
    } catch (error) {
        console.error("Gagal menampilkan section awal:", error);
    }
});



    
    
// GLOBAL VARIABLES (Tambahan Data Baru)
const dailyHadiths = [
    { text: "Sesungguhnya amalan itu tergantung pada niatnya, dan sesungguhnya setiap orang akan mendapatkan sesuai dengan apa yang ia niatkan.", source: "HR. Bukhari & Muslim" },
    { text: "Barangsiapa yang salat malam (Tarawih) pada bulan Ramadhan karena iman dan mengharap pahala dari Allah, maka diampuni dosa-dosanya yang telah lalu.", source: "HR. Bukhari" },
    { text: "Jagalah Allah, niscaya Dia akan menjagamu. Jagalah Allah, niscaya kamu akan mendapati-Nya di hadapanmu.", source: "HR. Tirmidzi" },
    { text: "Berilah kabar gembira dan janganlah membuat orang lari, mudahkanlah dan janganlah mempersulit.", source: "HR. Bukhari" },
    { text: "Senyummu di hadapan saudaramu (sesama muslim) adalah sedekah bagimu.", source: "HR. Tirmidzi" }
];

const simulatedPrayerTimes = [
    { name: 'Subuh', time: '04:30' },
    { name: 'Dzuhur', time: '12:00' },
    { name: 'Ashar', time: '15:30' },
    { name: 'Maghrib', time: '18:00' },
    { name: 'Isya', time: '19:15' }
];

    
    
        // GLOBAL VARIABLES (Disimpan di localStorage untuk simulasi)
        let myChart;
        let userPoints = parseInt(localStorage.getItem('userPoints')) || 0;
        let journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        const sholatFardhu = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

        // Leaderboard Data (Simulasi)
        let leaderboardData = [
            { name: "Siti", points: 3450 },
            { name: "Budi", points: 3086 },
            { name: "Ahmad", points: 1267 },
            { name: "Ria", points: 788   },
        ];
        
// --- FUNGSI TAB NAVIGATION (PENTING!) ---
function openTab(tabName) {
    // Sembunyikan semua konten tab
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = 'none';
        tabContents[i].classList.remove('active');
    }

    // Hapus status 'active' dari semua item sidebar
    const sidebarItems = document.getElementsByClassName('sidebar-item');
    for (let i = 0; i < sidebarItems.length; i++) {
        sidebarItems[i].classList.remove('active');
    }

    // Tampilkan tab yang dipilih
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
        // Panggil fungsi render ulang jika itu adalah tab spesifik
        if (tabName === 'statistic-tab') {
            createChart(); // Pastikan grafik di-render ulang
        }
        if (tabName === 'leaderboard-tab') {
            renderLeaderboard(); // Pastikan leaderboard di-render ulang
        }
    }
}





        
        
        function getChecklistPoints(status) {
    if (status === 'sholat-done') {
        return 10; // Setiap sholat yang ditandai memberi 10 poin
    }
    return 0;
}


// --- FUNGSI TANTANGAN SUNNAH MINGGUAN (BARU) ---

const weeklyChallenges = [
    "Sholat Dhuha minimal 2 rakaat setiap hari.",
    "Membaca Surah Al-Kahfi di hari Jumat.",
    "Puasa Sunnah Senin atau Kamis.",
    "Membaca 1 halaman Al-Qur'an setelah Sholat Subuh.",
    "Bersedekah, sekecil apapun, minimal 3 kali dalam seminggu.",
    "Sholat Sunnah Rawatib Qobliyah/Ba'diyah secara konsisten."
];

function setWeeklyChallenge() {
    const today = new Date();
    // Hitung hari Senin terakhir (atau hari ini jika hari Senin)
    const dayOfWeek = today.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    
    // Gunakan tanggal (hari) untuk menentukan indeks tantangan (0-5)
    // Formula sederhana: (Nomor Hari dalam Sejarah Sejak 1970 / 7) MOD Jumlah Tantangan
    // Ini memastikan tantangan berubah setiap minggu.
    const dayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
    
    // Tantangan berubah setiap 7 hari
    const challengeIndex = Math.floor(dayNumber / 7) % weeklyChallenges.length;
    
    const challengeText = weeklyChallenges[challengeIndex];
    
    // Tampilkan di UI
    const challengeElement = document.getElementById('sunnah-challenge');
    if(challengeElement) {
        challengeElement.textContent = challengeText;
    }
    
    // Simpan tantangan saat ini ke Local Storage (jika perlu untuk pengecekan progres)
    localStorage.setItem('currentChallenge', challengeText);
}

        
        
        // Checklist State
        let currentColor = 'green'; // Default color
        
        function initializeChecklist() {
            const data = {};
            sholatFardhu.forEach(sholat => {
                data[sholat] = Array(40).fill(''); // '' = Kosong
            });
            return data;
        }

        let checklistData = JSON.parse(localStorage.getItem('checklistData')) || initializeChecklist();

        // --- CORE UTILITY FUNCTIONS ---
        
        function showSection(sectionId) {
            // Sembunyikan semua section
            document.querySelectorAll('section[id$="-section"]').forEach(section => {
                section.style.display = 'none';
            });
            
            // Tampilkan section yang diminta
            const targetSection = document.getElementById(`${sectionId}-section`);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
            
            // Logika khusus untuk Search
            if (sectionId === 'search-results') {
                // Pastikan section search-results ditampilkan
                document.getElementById('search-results-section').style.display = 'block';
                // Panggil go() lagi untuk memicu penampilan hasil
                if (window.google && window.google.search && window.google.search.cse) {
                     window.google.search.cse.element.go();
                }
            }
        }

        function toggleTheme() {
            const currentTheme = document.body.getAttribute('data-theme');
            const toggleButton = document.querySelector('.theme-toggle button');
            if (currentTheme === 'dark') {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if (toggleButton) toggleButton.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if (toggleButton) toggleButton.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
            }
        }

        function showToast(message) {
            const toast = document.getElementById('toast');
            if (!toast) return; 

            toast.textContent = message;
            toast.style.display = 'block';
            
            // Reset animation
            toast.style.animation = 'none';
            toast.offsetHeight; // Trigger reflow
            toast.style.animation = 'fadein 0.5s, fadeout 0.5s 2.5s';

            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }

        function playAudio(audioId) {
            const audio = document.getElementById(audioId);
            if (audio && audio.src && audio.src.includes('URL_AUDIO')) {
                showToast("URL Audio tidak valid. Ini adalah simulasi.");
            } else if (audio) {
                 audio.play();
                 showToast(`Memainkan audio untuk: ${audioId.replace('Audio', '')}`);
            } else {
                showToast("Audio element not found.");
            }
        }
        
        function previewImage(event) {
            const reader = new FileReader();
            reader.onload = function(){
                const output = document.getElementById('profile-picture');
                if (output) {
                    output.src = reader.result;
                    localStorage.setItem('profilePic', reader.result);
                    showToast("Foto profil berhasil diunggah (tersimpan lokal)!");
                }
            };
            if (event.target.files.length > 0) {
                 reader.readAsDataURL(event.target.files[0]);
            }
        }

        // --- POINT & LEADERBOARD FUNCTIONS ---

        function updatePoints(pointsChange) {
            userPoints += pointsChange;
            if (userPoints < 0) userPoints = 0; // Poin tidak bisa negatif
            localStorage.setItem('userPoints', userPoints);
            
            // Update UI
            document.getElementById('ibadah-points').textContent = userPoints;
            document.getElementById('profile-points').textContent = userPoints;
            document.getElementById('user-current-points').textContent = userPoints;
            
            renderLeaderboard();
            checkAllAchievements();
        }

        function loadUserPoints() {
            const ibadahPoints = document.getElementById('ibadah-points');
            const profilePoints = document.getElementById('profile-points');
            const userCurrentPoints = document.getElementById('user-current-points');
            
            if (ibadahPoints) ibadahPoints.textContent = userPoints;
            if (profilePoints) profilePoints.textContent = userPoints;
            if (userCurrentPoints) userCurrentPoints.textContent = userPoints;
        }

        function renderLeaderboard() {
            // Tambahkan/Update poin user ke leaderboard
            const userIndex = leaderboardData.findIndex(item => item.name === 'Remaja Istiqomah (Anda)');
            if (userIndex > -1) {
                leaderboardData[userIndex].points = userPoints;
            } else {
                leaderboardData.push({ name: "Remaja Istiqomah (Anda)", points: userPoints });
            }
            
            // Urutkan berdasarkan poin
            leaderboardData.sort((a, b) => b.points - a.points);

            const tbody = document.getElementById('leaderboard-body');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            // Tampilkan top 5
            leaderboardData.slice(0, 5).forEach((item, index) => {
                const tr = tbody.insertRow();
                tr.insertCell(0).innerHTML = `<strong>#${index + 1}</strong>`;
                tr.insertCell(1).textContent = item.name;
                tr.insertCell(2).textContent = item.points;
            });
        }
        
        // --- JOURNAL FUNCTIONS ---

        function getJournalPoints(ibadahType) {
            switch (ibadahType) {
                case 'Sholat Fardhu': return 10; // Sudah ada di checklist, ini untuk pencatatan ekstra
                case 'Sholat Sunnah': return 20;
                case 'Baca Al-Quran': return 30;
                case 'Sedekah': return 50;
                case 'Puasa Sunnah': return 100;
                case 'Lain-lain': return 10;
                default: return 0;
            }
        }

        function addIbadah() {
            const ibadahSelect = document.getElementById('ibadah-select');
            const ibadahDetail = document.getElementById('ibadah-detail');
            if (!ibadahSelect) return;
            
            const type = ibadahSelect.value;
            const detail = ibadahDetail ? ibadahDetail.value.trim() : '';
            const points = getJournalPoints(type);
            
            if (type) {
                const newEntry = {
                    id: Date.now(),
                    date: new Date().toLocaleDateString('id-ID'),
                    type: type,
                    detail: detail,
                    points: points
                };
                
                journalEntries.unshift(newEntry); // Tambah di awal
                localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
                updatePoints(points);
                renderJournal();
                showToast(`Berhasil mencatat ${type}! Mendapat +${points} Poin.`);
                
                if (ibadahDetail) ibadahDetail.value = ''; // Reset detail
            } else {
                showToast("Pilih jenis ibadah terlebih dahulu.");
            }
        }

        function deleteJournalEntry(id) {
            const entryIndex = journalEntries.findIndex(entry => entry.id === id);
            if (entryIndex > -1) {
                const entry = journalEntries[entryIndex];
                
                // Kurangi poin
                updatePoints(-entry.points); 
                
                // Hapus entri
                journalEntries.splice(entryIndex, 1);
                localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
                renderJournal();
                showToast(`Entri jurnal berhasil dihapus. Poin dikurangi.`);
            }
        }

        function renderJournal() {
            const journalList = document.getElementById('journal-list');
            if (!journalList) return;
            
            journalList.innerHTML = '';
            
            if (journalEntries.length === 0) {
                journalList.innerHTML = '<p style="text-align: center; color: #777;">Belum ada catatan ibadah hari ini. Ayo mulai mencatat!</p>';
                checkFirstJournalAchievement(); // Panggil tetap di sini
                return;
            }

            journalEntries.forEach(entry => {
                const div = document.createElement('div');
                div.className = 'journal-entry';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: ${entry.type === 'Sholat Fardhu' ? '#3498db' : '#27ae60'};">${entry.type}</h4>
                        <span style="font-weight: bold;">+${entry.points} Poin</span>
                    </div>
                    <p style="font-size: 0.9em; margin-bottom: 5px;">${entry.date}</p>
                    ${entry.detail ? `<p style="font-style: italic;">${entry.detail}</p>` : ''}
                    <div class="journal-entry-actions">
                        <button class="delete-btn" onclick="deleteJournalEntry(${entry.id})"><i class="fas fa-trash"></i> Hapus</button>
                    </div>
                `;
                journalList.appendChild(div);
            });
            
            checkFirstJournalAchievement();
        }

        // --- CHECKLIST FUNCTIONS ---
        
function getSymbol(color) {
    if (color === 'green') return '✓';
    if (color === 'orange') return '●';
    if (color === 'red') return '✗';
    // Tambahan untuk mengembalikan string kosong jika status adalah '' (kosong)
    return ''; 
}

        
        function getChecklistPoints(color) {
            if (color === 'green') return 50;
            if (color === 'orange') return 30;
            if (color === 'red') return -50;
            return 0;
        }

        function handleColorBtnClick(event) {
            // Hapus status 'active' dari semua tombol
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Tambahkan status 'active' ke tombol yang diklik
            event.currentTarget.classList.add('active');
            currentColor = event.currentTarget.getAttribute('data-color');
            showToast(`Mode checklist: ${currentColor}`);
        }

            function renderChecklist() {
        const tbody = document.getElementById('checklist-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        // Iterasi melalui setiap sholat fardhu (kunci dalam checklistData)
        sholatFardhu.forEach(sholat => {
            const tr = tbody.insertRow();
            tr.insertCell(0).innerHTML = `<strong>${sholat}</strong>`;

            for (let i = 0; i < 40; i++) {
                const status = checklistData[sholat][i];
                const cell = tr.insertCell(i + 1);
                cell.className = `checklist-cell ${status}`;
                cell.textContent = getSymbol(status);
                cell.setAttribute('data-sholat', sholat);
                cell.setAttribute('data-day', i + 1);
                cell.onclick = handleChecklistClick;
            }
        });
        updateChecklistProgress(); // Panggil saat render
    }

        
function handleChecklistClick(event) {
    const cell = event.target;
    const sholat = cell.getAttribute('data-sholat');
    const dayIndex = parseInt(cell.getAttribute('data-day')) - 1;
    
    // Safety check
    if (!sholat || isNaN(dayIndex) || dayIndex < 0 || dayIndex >= 40) return;
    
    const previousStatus = checklistData[sholat][dayIndex];
    const previousPoints = getChecklistPoints(previousStatus);
    
    // 1. Tentukan Poin yang Akan Diperoleh/Dipotong
    let pointChange = 0;
    
    // Logika BARU untuk 2 kali klik:
    let newStatus = currentColor;
    let toastMessage = `Berhasil mencatat ${sholat} Hari ${dayIndex + 1}.`;

    if (previousStatus === currentColor) {
        // Jika status yang diklik sama dengan warna saat ini, HAPUS (set ke kosong)
        newStatus = '';
        pointChange -= previousPoints; // Kurangi poin sebelumnya
        toastMessage = `Checklist ${sholat} Hari ${dayIndex + 1} dibatalkan.`;
    } else {
        // Jika status berbeda atau kosong, terapkan warna baru
        if (previousStatus !== '') {
            pointChange -= previousPoints; // Kurangi poin sebelumnya (jika ada)
        }
        pointChange += getChecklistPoints(newStatus); // Tambah poin baru
    }

    // 2. Update Status & Data
    checklistData[sholat][dayIndex] = newStatus;
    localStorage.setItem('checklistData', JSON.stringify(checklistData));
    
    // 3. Update UI
    cell.textContent = getSymbol(newStatus);
    cell.className = `checklist-cell ${newStatus}`;
    
    // 4. Update Poin Global
    if (pointChange !== 0) {
        updatePoints(pointChange);
    }
            
    // 5. Cek achievements dan perbarui progres
    checkAllAchievements();
    updateChecklistProgress();
    showToast(toastMessage);
}



        function clearChecklist() {
            if (confirm("Anda yakin ingin mereset checklist 40 hari? Data akan hilang.")) {
                checklistData = initializeChecklist();
                localStorage.removeItem('checklistData');
                renderChecklist();
                updateChecklistProgress();
                showToast("Checklist berhasil direset!");
            }
        }

        // --- ACHIEVEMENTS FUNCTIONS ---
        
        function checkAchievement(id) {
            const badge = document.getElementById(id);
            if (badge && !badge.classList.contains('unlocked')) {
                badge.classList.add('unlocked');
                showNotification(`Pencapaian Baru Terbuka: ${badge.querySelector('.badge-text').textContent}!`);
                localStorage.setItem(id, 'unlocked');
            }
        }
        
        function showNotification(message) {
            const notification = document.getElementById('prayer-notification');
            if (!notification) return;
            
            const h4 = notification.querySelector('h4');
            const p = notification.querySelector('p');

            if (h4) h4.innerHTML = `<i class="fas fa-trophy"></i> Selamat!`;
            if (p) p.textContent = message;
            notification.style.display = 'block';
            notification.classList.remove('hidden');

            setTimeout(() => {
                // Sembunyikan setelah 5 detik
                notification.classList.add('hidden');
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 500); // Tunggu sampai animasi slideOut selesai
            }, 5000);
        }

        function checkFirstJournalAchievement() {
            if (journalEntries.length >= 1) {
                checkAchievement('badge-first-journal');
            }
        }

        function checkPointMasterAchievement() {
            if (userPoints >= 500) {
                checkAchievement('badge-point-master');
            }
        }
        
        function checkChecklistAchievements() {
            // Cek Hari Pertama
            const isFirstDayFilled = sholatFardhu.some(sholat => checklistData[sholat][0] !== '');
            if (isFirstDayFilled) {
                checkAchievement('badge-first-day');
            }

            // Cek 10 Hari Berturut-turut (Semua sholat harus hijau/orange)
            let consecutiveDays = 0;
            let totalCompletedDays = 0; // Untuk 40 Hari Sempurna

            for (let i = 0; i < 40; i++) {
                const isDayComplete = sholatFardhu.every(sholat => 
                    checklistData[sholat][i] === 'green' || checklistData[sholat][i] === 'orange'
                );
                
                if (isDayComplete) {
                    consecutiveDays++;
                    totalCompletedDays++;
                    if (consecutiveDays >= 10) {
                        checkAchievement('badge-10-days');
                    }
                } else {
                    consecutiveDays = 0; // Reset jika ada yang bolong
                }
            }
            // Check 40 Hari Sempurna (totalCompletedDays)
            if (totalCompletedDays >= 40) {
                checkAchievement('badge-40-days'); 
            }
        }

        function checkAllAchievements() {
            checkFirstJournalAchievement();
            checkPointMasterAchievement();
            checkChecklistAchievements();
        }

        function loadAchievements() {
            document.querySelectorAll('.badge').forEach(badge => {
                if (localStorage.getItem(badge.id) === 'unlocked') {
                    badge.classList.add('unlocked');
                }
            });
        }


        // --- QUIZ FUNCTIONS (Simulasi Sederhana) ---
        
        const quizQuestions = [
            { question: "Apa rukun Islam yang kedua?", options: ["Syahadat", "Sholat", "Puasa", "Zakat"], answer: "Sholat" },
            { question: "Berapa rakaat Sholat Subuh?", options: ["2", "3", "4", "1"], answer: "2" },
            { question: "Kitab suci utama agama Islam adalah?", options: ["Injil", "Taurat", "Al-Qur'an", "Zabur"], answer: "Al-Qur'an" }
        ];

        function renderQuiz() {
            const quizContainer = document.getElementById('quiz-container');
            if (!quizContainer) return;
            
            const quizCompleted = localStorage.getItem('quizCompleted') === new Date().toLocaleDateString('id-ID');

            if (quizCompleted) {
                 quizContainer.innerHTML = `
                    <p style="text-align: center; color: #e74c3c;">Anda telah menyelesaikan kuis hari ini. Kembali besok untuk kuis baru!</p>
                `;
                return;
            }

            quizContainer.innerHTML = '';
            quizQuestions.forEach((q, index) => {
                let html = `<div class="quiz-item"><h4>${index + 1}. ${q.question}</h4>`;
                q.options.forEach(opt => {
                    // Beri nama yang unik untuk setiap set radio button
                    html += `
                        <label>
                            <input type="radio" name="q${index}" value="${opt}"> ${opt}
                        </label>
                    `;
                });
                html += `</div>`;
                quizContainer.innerHTML += html;
            });
            quizContainer.innerHTML += `<button onclick="submitQuiz()">Kirim Jawaban</button>`;
        }

        function submitQuiz() {
            let score = 0;
            const totalQuestions = quizQuestions.length;
            let allAnswered = true;

            quizQuestions.forEach((q, index) => {
                const selected = document.querySelector(`input[name="q${index}"]:checked`);
                if (!selected) {
                    allAnswered = false;
                } else if (selected.value === q.answer) {
                    score++;
                }
            });

            if (!allAnswered) {
                showToast("Harap jawab semua pertanyaan!");
                return;
            }

            const quizPoints = score * 50; // Contoh: 50 poin per jawaban benar
            
            showToast(`Skor Kuis: ${score}/${totalQuestions}. Mendapat +${quizPoints} Poin!`);
            
            if (quizPoints > 0) {
                updatePoints(quizPoints);
            }
            
            // Tandai kuis sudah selesai hari ini
            localStorage.setItem('quizCompleted', new Date().toLocaleDateString('id-ID'));
            
            // Sembunyikan Kuis setelah submit (simulasi kuis harian)
            const quizContainer = document.getElementById('quiz-container');
            if (quizContainer) {
                quizContainer.innerHTML = `
                    <p style="text-align: center; color: #27ae60;">Kuis selesai! Skor Anda: ${score}/${totalQuestions}. Anda mendapat +${quizPoints} Poin.</p>
                    <p style="text-align: center; color: #e74c3c;">Kembali besok untuk kuis baru!</p>
                `;
            }
            
            // Cek Quiz Master (Simulasi hitungan)
            let quizPerfectCount = parseInt(localStorage.getItem('quizPerfectCount')) || 0;
            if (score === totalQuestions) {
                quizPerfectCount++;
                localStorage.setItem('quizPerfectCount', quizPerfectCount);
                if (quizPerfectCount >= 5) {
                    checkAchievement('badge-quiz-master');
                }
            } else {
                // Tidak harus reset, biar mudah, kita hanya hitung yang sempurna
            }
        }

        // --- CHART/TABLE FUNCTIONS (Simulasi Data) ---
        const ibadahData = {
            labels: ['2020', '2021', '2022', '2023', '2024'],
            datasets: [{
                label: 'Persentase Rutin Ibadah (%)',
                data: [70, 65, 55, 50, 45],
                borderColor: '#3498db',
                tension: 0.1,
                backgroundColor: 'rgba(52, 152, 219, 0.5)'
            }]
        };

        const tableData = [
            { year: 2020, percent: 70, factor: 'Kurangnya Komunitas', solution: 'Buat Program Pembinaan Masjid' },
            { year: 2021, percent: 65, factor: 'Pengaruh Game Online', solution: 'Edukasi Dampak Buruk Adiksi' },
            { year: 2022, percent: 55, factor: 'Awal Era Sosmed (TikTok/Reels)', solution: 'Gunakan Sosmed untuk Konten Agama' },
            { year: 2023, percent: 50, factor: 'Sibuk Akademik/Les', solution: 'Integrasi Jadwal Ibadah Fleksibel' },
            { year: 2024, percent: 45, factor: 'Konten Negatif & Gaya Hidup Hedon', solution: 'Penguatan Akidah dan Program Mentoring' }
        ];
        
        // Simpan data di local storage agar bisa diedit
        let dynamicTableData = JSON.parse(localStorage.getItem('dynamicTableData')) || tableData;

        function createChart() {
            const ctx = document.getElementById('myChart');
            if (!ctx) return;
            
            if (myChart) {
                myChart.destroy(); // Hancurkan chart lama jika ada
            }

            myChart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: ibadahData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Persentase (%)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Tahun'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y + '%';
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }

        function filterChart() {
            const yearFilter = document.getElementById('yearFilter');
            if (!yearFilter || !myChart) return;
            
            const filter = yearFilter.value;
            let currentData = { ...ibadahData };

            if (filter === '2020-2022') {
                currentData.labels = ['2020', '2021', '2022'];
                currentData.datasets[0].data = [70, 65, 55];
            } else if (filter === '2022-2024') {
                currentData.labels = ['2022', '2023', '2024'];
                currentData.datasets[0].data = [55, 50, 45];
            } else {
                currentData = ibadahData;
            }

            myChart.data = currentData;
            myChart.update();
        }
        
        function renderTable() {
            const tbody = document.getElementById('dataTable');
            if (!tbody || !tbody.querySelector('tbody')) return;
            
            const actualTbody = tbody.querySelector('tbody');
            actualTbody.innerHTML = '';
            
            dynamicTableData.forEach((row, index) => {
                const tr = actualTbody.insertRow();
                tr.insertCell(0).textContent = row.year;
                tr.insertCell(1).textContent = row.percent;
                tr.insertCell(2).textContent = row.factor;
                tr.insertCell(3).textContent = row.solution;
                tr.insertCell(4).innerHTML = `<button class="edit-btn" onclick="editData(${index})">Edit</button> <button class="delete-btn" onclick="deleteData(${index})">Hapus</button>`;
            });
        }
        
        function editData(index) {
            const data = dynamicTableData[index];
            const newYear = prompt("Edit Tahun:", data.year);
            const newPercent = prompt("Edit Persentase (%):", data.percent);
            const newFactor = prompt("Edit Faktor Penyebab:", data.factor);
            const newSolution = prompt("Edit Saran Solusi:", data.solution);

            if (newYear !== null && newPercent !== null) {
                dynamicTableData[index] = {
                    year: newYear,
                    percent: parseInt(newPercent) || 0,
                    factor: newFactor || data.factor,
                    solution: newSolution || data.solution
                };
                localStorage.setItem('dynamicTableData', JSON.stringify(dynamicTableData));
                renderTable();
                showToast("Data berhasil diperbarui!");
            }
        }
        
        function deleteData(index) {
            if (confirm("Yakin ingin menghapus data ini?")) {
                dynamicTableData.splice(index, 1);
                localStorage.setItem('dynamicTableData', JSON.stringify(dynamicTableData));
                renderTable();
                showToast("Data berhasil dihapus!");
            }
        }
        
        // --- JADWAL SHOLAT & LOKASI FUNCTIONS (MODIFIKASI DAN PENAMBAHAN) ---

        function updatePrayerNotification() {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes(); // Waktu dalam menit
            let nextPrayer = null;

            // Cari waktu sholat berikutnya
            for (const prayer of simulatedPrayerTimes) {
                const [hour, minute] = prayer.time.split(':').map(Number);
                const prayerTimeInMinutes = hour * 60 + minute;

                if (prayerTimeInMinutes > currentTime) {
                    nextPrayer = prayer;
                    break;
                }
            }


function updateNextPrayerFromFiktif(fiktifTimes) {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes(); 
    let nextPrayer = null;

    // Ubah objek fiktif menjadi array seperti simulatedPrayerTimes
    const tempPrayerArray = Object.keys(fiktifTimes).map(name => ({
        name: name,
        time: fiktifTimes[name]
    }));
    
    // Cari waktu sholat berikutnya
    for (const prayer of tempPrayerArray) {
        const [hour, minute] = prayer.time.split(':').map(Number);
        const prayerTimeInMinutes = hour * 60 + minute;

        if (prayerTimeInMinutes > currentTimeInMinutes) {
            nextPrayer = prayer;
            break;
        }
    }
    
    const nextPrayerTimeEl = document.getElementById('next-prayer-time');
    const nextPrayerNameEl = document.getElementById('next-prayer-name');
    
    if (!nextPrayer) {
        // Jika sudah melewati Isya, ambil Subuh untuk keesokan hari
        nextPrayer = tempPrayerArray[0];
    }
    
    if (nextPrayerTimeEl) nextPrayerTimeEl.textContent = nextPrayer.time;
    if (nextPrayerNameEl) nextPrayerNameEl.textContent = nextPrayer.name;
}


            if (!nextPrayer) {
                // Jika sudah melewati Isya, ambil Subuh di hari berikutnya (simulasi)
                nextPrayer = simulatedPrayerTimes[0];
            }
            
            const nextPrayerTimeEl = document.getElementById('next-prayer-time');
            const nextPrayerNameEl = document.getElementById('next-prayer-name');
            
            if (nextPrayerTimeEl) nextPrayerTimeEl.textContent = nextPrayer.time;
            if (nextPrayerNameEl) nextPrayerNameEl.textContent = nextPrayer.name;

            // Cek apakah waktu sholat TEPAT tiba (untuk notifikasi)
            const [h, m] = nextPrayer.time.split(':').map(Number);
            const prayerTimeTargetInMinutes = h * 60 + m;
            
            // Logika untuk memicu notifikasi jika waktu sholat sudah tiba/melebihi 
            if (prayerTimeTargetInMinutes === currentTime + 1) { // Notif muncul 1 menit setelah waktu target
                showPrayerNotificationAlert(nextPrayer.name);
            }
        }

        function showPrayerNotificationAlert(prayerName) {
            const notification = document.getElementById('prayer-notification');
            if (!notification) return;
            
            // Ganti teks notifikasi default
            const h4 = notification.querySelector('h4');
            const p = notification.querySelector('p');
            
            if (h4) h4.innerHTML = `<i class="fas fa-bell"></i> Waktu Sholat Tiba!`;
            if (p) p.innerHTML = `Ayo, segera tunaikan sholat <span id="prayer-name">${prayerName}</span>.`;
            
            notification.style.display = 'block';
            notification.classList.remove('hidden');

            // Sembunyikan setelah 8 detik
            setTimeout(() => {
                notification.classList.add('hidden');
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 500); 
            }, 8000);
        }

        function saveLocation() {
            const locationInput = document.getElementById('user-location');
            if (!locationInput) return;
            
            const location = locationInput.value;
            localStorage.setItem('userLocation', location);
            showToast(`Lokasi '${location}' berhasil disimpan!`);
        }

        function loadLocation() {
            const savedLocation = localStorage.getItem('userLocation');
            const locationInput = document.getElementById('user-location');
            if (savedLocation && locationInput) {
                locationInput.value = savedLocation;
            }
        }

        // --- HADIS HARIAN FUNCTION (PENAMBAHAN) ---
        function loadDailyHadith() {
            const hadithTextElement = document.getElementById('daily-hadith-text');
            const hadithSourceElement = document.getElementById('daily-hadith-source');
            if (!hadithTextElement || !hadithSourceElement) return;
            
            // Gunakan hari dalam setahun untuk memilih hadis, agar hadis berubah setiap hari
            const start = new Date(new Date().getFullYear(), 0, 0);
            const diff = new Date() - start;
            const oneDay = 1000 * 60 * 60 * 24;
            const dayOfYear = Math.floor(diff / oneDay);

            const index = dayOfYear % dailyHadiths.length;
            const hadith = dailyHadiths[index];

            
            if (hadithTextElement && hadithSourceElement) {
                hadithTextElement.textContent = hadith.text;
                hadithSourceElement.textContent = `— ${hadith.source}`;
            }
        }

        // --- CHECKLIST PROGRESS FUNCTIONS (PENAMBAHAN) ---
        function updateChecklistProgress() {
    let daysCompleted = 0;

    for (let i = 0; i < 40; i++) {
        // Cek apakah SEMUA sholat fardhu di hari itu sudah di-checklist (hijau atau oranye)
        const isDayComplete = sholatFardhu.every(sholat => 
            checklistData[sholat][i] === 'green' || checklistData[sholat][i] === 'orange' 
        );
        if (isDayComplete) {
            daysCompleted++;
        }
    }

            
            const percentage = (daysCompleted / 40) * 100;

            const fill = document.getElementById('checklist-progress-fill');
            const text = document.getElementById('checklist-progress-text');
            
            if(fill && text) {
                fill.style.width = `${percentage}%`;
                text.textContent = `${daysCompleted}/40 Hari Selesai`;
            }
        }




        // --- INITIALIZATION (MODIFIKASI) ---
        
        document.addEventListener('DOMContentLoaded', () => {
            
            // --- INI SANGAT PENTING: Panggil semua fungsi inisialisasi di sini ---
            
            // Load theme
            const savedTheme = localStorage.getItem('theme');
            const toggleButton = document.querySelector('.theme-toggle button');
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                if (toggleButton) toggleButton.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
            } else {
                 if (toggleButton) toggleButton.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
            }

            // Load profile picture
            const savedPic = localStorage.getItem('profilePic');
            const profilePicEl = document.getElementById('profile-picture');
            if (savedPic && profilePicEl) {
                profilePicEl.src = savedPic;
            } else if (profilePicEl) {
                 profilePicEl.src = "https://via.placeholder.com/100?text=Profile";
            }
            
            // ...
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tampilkan halaman Beranda saat pertama kali dimuat
    try {
        showSection('home-section'); 
    } catch (error) {
        console.error("Gagal menampilkan section awal:", error);
    }
    
    // 2. Update Tanggal dan Jam secara berkala
    updateDate(); 
    setInterval(updateDate, 1000); 

    // 3. Muat skor harian saat ini
    updateScoreDisplay(parseInt(localStorage.getItem('istiqomah_daily_score') || 0));

    // 4. Panggil fungsi untuk menampilkan kutipan harian (BARU DITAMBAHKAN)
    displayRandomQuote(); 
    
    // ... kode inisialisasi lainnya
});

            

            // Inisialisasi Data & UI
            loadUserPoints();
            renderJournal();
            renderChecklist();
            renderTable();
            renderQuiz();
            loadAchievements();
            renderLeaderboard();
            checkAllAchievements(); 
            loadDailyHadith(); 
            setWeeklyChallenge();
            loadLocation(); 
            updatePrayerNotification(); 
            displayRandomQuote();

            // Set interval untuk mengecek waktu sholat setiap menit
            setInterval(updatePrayerNotification, 60000);

            // Inisialisasi Chart
            createChart(); // Panggil tanpa pengecekan if(myChart)

            // Peringatan Data Lokal
            showToast("Perhatian: Semua data (poin, checklist, dll.) hanya tersimpan di browser Anda.");
            
            
            // Inisialisasi Listener untuk tombol checklist
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.addEventListener('click', handleColorBtnClick);
            });
            
            // Inisialisasi Google Custom Search Engine (CSE)
            if (window.google && window.google.search && window.google.search.cse) {
                // Panggil go() sekali untuk menginisialisasi search box
                window.google.search.cse.element.go();
                
                const searchResults = document.querySelector('.gcse-searchresults-only');
                const searchBoxContainer = document.querySelector('.gcse-searchbox-only');
                
                // Tambahkan event listener pada search box untuk auto-pindah ke hasil pencarian
                if (searchBoxContainer) {
                    const observer = new MutationObserver((mutationsList, observer) => {
                        // Cek apakah ada hasil pencarian yang muncul
                        const isSearchVisible = searchResults && (searchResults.querySelector('.gsc-webResult') || searchResults.querySelector('.gsc-result-info'));
                        if (isSearchVisible) {
                            showSection('search-results');
                        }
                    });

                    // Amati perubahan pada search box itu sendiri (input)
                    observer.observe(searchBoxContainer, { childList: true, subtree: true });
                }
            }
            
            // index.js

// ... (semua fungsi dan variabel lain yang sudah Anda buat)

// --- Fungsi Inisialisasi ---
function initApp() {
    // 1. Tampilkan komponen Beranda (struktur dasar)
    renderBerandaStructure(); 
    
    // 2. Mulai ambil data yang perlu di-update (Waktu Salat, Poin, dll.)
    fetchSholatTimes().then(data => {
        updateSholatTimes(data);
    });

    // ... logika inisialisasi lainnya
}

// Pastikan fungsi ini dipanggil segera saat dokumen siap
document.addEventListener('DOMContentLoaded', initApp); 

        });

