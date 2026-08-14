// ===================== GLOBAL UI UTILITIES =====================
window.showToast = function(message, type = 'success', duration = 4000) {
    if (typeof Swal !== 'undefined') {
        const iconMap = {
            success: 'success',
            danger: 'error',
            warning: 'warning',
            info: 'info'
        };
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: iconMap[type] || 'info',
            title: message,
            showConfirmButton: false,
            timer: duration,
            timerProgressBar: true
        });
    } else {
        alert(message);
    }
};

window.showLoading = function(text = 'Menyimpan data...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (overlay) { overlay.classList.remove('hidden'); }
    if (loadingText) { loadingText.textContent = text; }
};

window.hideLoading = function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
};

window.showConfirm = function(title, message, okText = 'Hapus', okClass = 'btn btn-danger') {
    if (typeof Swal !== 'undefined') {
        const isDanger = okClass.includes('danger');
        return Swal.fire({
            title: title,
            html: message,
            icon: isDanger ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: isDanger ? '#dc2626' : '#2563eb',
            cancelButtonColor: '#6b7280',
            confirmButtonText: okText,
            cancelButtonText: 'Batal'
        }).then((result) => {
            return result.isConfirmed;
        });
    } else {
        return new Promise((resolve) => {
            resolve(confirm(`${title}\n\n${message.replace(/<[^>]*>?/gm, '')}`));
        });
    }
};

window.renderJorongDropdowns = function() {
    if (typeof window.getAllJorongs !== 'function') return;
    const jorongs = window.getAllJorongs();
    
    // Cek apakah user adalah admin jorong
    const isAdminJorong = window.currentUser && window.currentUser.role === 'admin' && window.currentUser.jorong;
    const myJorong = isAdminJorong ? window.currentUser.jorong : null;

    const filterSelect = document.getElementById('filter-jorong');
    if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = isAdminJorong ? '' : '<option value="">Semua Jorong</option>';
        
        if (isAdminJorong) {
            const opt = document.createElement('option');
            opt.value = myJorong; opt.textContent = myJorong;
            filterSelect.appendChild(opt);
            filterSelect.value = myJorong;
            filterSelect.style.pointerEvents = 'none';
            filterSelect.style.background = '#e9ecef';
        } else {
            jorongs.forEach(j => {
                const opt = document.createElement('option');
                opt.value = j; opt.textContent = j;
                filterSelect.appendChild(opt);
            });
            if (currentVal && (jorongs.includes(currentVal) || currentVal === '')) filterSelect.value = currentVal;
            filterSelect.style.pointerEvents = 'auto';
            filterSelect.style.background = '#fff';
        }
    }

    const jorongSelects = [document.getElementById('jorong'), document.getElementById('tw-jorong'), document.getElementById('admin-jorong')];
    jorongSelects.forEach(select => {
        if (select) {
            const currentVal = select.value;
            select.innerHTML = isAdminJorong ? '' : '<option value="" disabled selected>Pilih Jorong...</option>';
            
            if (isAdminJorong) {
                const opt = document.createElement('option');
                opt.value = myJorong; opt.textContent = myJorong;
                select.appendChild(opt);
                select.value = myJorong;
                select.style.pointerEvents = 'none';
                select.style.background = '#e9ecef';
            } else {
                jorongs.forEach(j => {
                    const opt = document.createElement('option');
                    opt.value = j; opt.textContent = j;
                    select.appendChild(opt);
                });
                if (currentVal && jorongs.includes(currentVal)) select.value = currentVal;
                select.style.pointerEvents = 'auto';
                select.style.background = '#fff';
            }
        }
    });
};

let statusChartInstance = null;
let risikoChartInstance = null;
let demografiChartInstance = null;
let trenKasusChartInstance = null;

// Pagination & Search State
const PAGE_SIZE = 10;
window.statePage = {
    'warga': 1,
    'skrining': 1,
    'fu-ht': 1,
    'fu-risk': 1
};

function populateBulanDropdown() {
    try {
        const filterBulan = document.getElementById('filter-bulan');
        if (!filterBulan) return;
        if (typeof ScreeningDB === 'undefined') return;
        
        const currentVal = filterBulan.value;
        filterBulan.innerHTML = '<option value="">Semua Waktu</option>';
        
        const screenings = ScreeningDB.getAll() || [];
        const months = new Set();
        const dates = new Set();
        
        screenings.forEach(s => {
            let tgl = s.tanggalSkrining || s.createdAt || s.waktuSkrining;
            if (!tgl) return;
            
            try {
                if (typeof tgl === 'string' && tgl.includes('/')) {
                    const p = tgl.split('/');
                    if (p.length === 3 && p[2].length === 4) {
                        tgl = `${p[2]}-${p[1]}-${p[0]}`;
                    }
                }
                const d = new Date(tgl);
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    months.add(`${year}-${month}`);
                    dates.add(`${year}-${month}-${day}`);
                }
            } catch (e) {
                console.warn('Failed to parse date:', tgl);
            }
        });
        
        const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
        const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        // Add Months
        if (sortedMonths.length > 0) {
            const optgroupMonth = document.createElement('optgroup');
            optgroupMonth.label = "Per Bulan";
            sortedMonths.forEach(m => {
                const parts = m.split('-');
                if (parts.length === 2) {
                    const year = parts[0];
                    const monthIdx = parseInt(parts[1], 10) - 1;
                    if (!isNaN(monthIdx)) {
                        const option = document.createElement('option');
                        option.value = m;
                        option.textContent = `${monthNames[monthIdx]} ${year}`;
                        optgroupMonth.appendChild(option);
                    }
                }
            });
            filterBulan.appendChild(optgroupMonth);
        }

        // Add Specific Dates
        if (sortedDates.length > 0) {
            const optgroupDate = document.createElement('optgroup');
            optgroupDate.label = "Per Tanggal Spesifik";
            sortedDates.forEach(dateStr => {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const year = parts[0];
                    const monthIdx = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    if (!isNaN(monthIdx)) {
                        const option = document.createElement('option');
                        option.value = dateStr;
                        option.textContent = `${day} ${monthNames[monthIdx]} ${year}`;
                        optgroupDate.appendChild(option);
                    }
                }
            });
            filterBulan.appendChild(optgroupDate);
        }
        
        if (currentVal) {
            const exists = Array.from(filterBulan.options).some(o => o.value === currentVal);
            if (exists) filterBulan.value = currentVal;
        }
    } catch(err) {
        console.error("Error in populateBulanDropdown:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.renderJorongDropdowns === 'function') window.renderJorongDropdowns();
    populateBulanDropdown();

    // === Restore filter state from localStorage (Bug 6 fix) ===
    try {
        const savedJorong = localStorage.getItem('filter_jorong');
        const savedBulan = localStorage.getItem('filter_bulan');
        const savedGender = localStorage.getItem('filter_gender');
        const fJorong = document.getElementById('filter-jorong');
        const fBulan = document.getElementById('filter-bulan');
        const fGender = document.getElementById('filter-gender');
        if (savedJorong && fJorong) {
            const optExists = Array.from(fJorong.options).some(o => o.value === savedJorong);
            if (optExists) fJorong.value = savedJorong;
        }
        if (savedBulan && fBulan) {
            const optExists = Array.from(fBulan.options).some(o => o.value === savedBulan);
            if (optExists) fBulan.value = savedBulan;
        }
        if (savedGender && fGender) fGender.value = savedGender;
    } catch (e) {
        console.warn("localStorage is disabled or corrupted, skipping filter restore.");
    }

    // Helper to safely add event listener (element might not exist)
    function safeOn(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    }

    // Helper to save filter state
    function saveFilterState() {
        try {
            const j = document.getElementById('filter-jorong');
            const b = document.getElementById('filter-bulan');
            const g = document.getElementById('filter-gender');
            if (j) localStorage.setItem('filter_jorong', j.value);
            if (b) localStorage.setItem('filter_bulan', b.value);
            if (g) localStorage.setItem('filter_gender', g.value);
        } catch (e) {
            console.warn("localStorage is disabled or corrupted, cannot save filter state.");
        }
    }

    // === Set up ALL event listeners FIRST (before any rendering) ===
    safeOn('filter-jorong', 'change', () => {
        window.statePage = { 'warga': 1, 'skrining': 1, 'fu-ht': 1, 'fu-risk': 1 };
        saveFilterState();
        renderDashboard();
    });

    safeOn('filter-bulan', 'change', () => {
        window.statePage = { 'warga': 1, 'skrining': 1, 'fu-ht': 1, 'fu-risk': 1 };
        saveFilterState();
        renderDashboard();
    });

    safeOn('filter-gender', 'change', () => {
        window.statePage = { 'warga': 1, 'skrining': 1, 'fu-ht': 1, 'fu-risk': 1 };
        saveFilterState();
        renderDashboard();
    });

    safeOn('table-search', 'input', (e) => {
        window.statePage['skrining'] = 1;
        const jorong = document.getElementById('filter-jorong');
        const bulan = document.getElementById('filter-bulan');
        const gender = document.getElementById('filter-gender');
        renderTable(jorong ? jorong.value : '', e.target.value, bulan ? bulan.value : '', gender ? gender.value : '');
    });

    safeOn('warga-search', 'input', () => { window.statePage['warga'] = 1; renderWargaTable(); });
    safeOn('fu-ht-search', 'input', () => { window.statePage['fu-ht'] = 1; renderFollowUpTables(); });
    safeOn('fu-risk-search', 'input', () => { window.statePage['fu-risk'] = 1; renderFollowUpTables(); });

    safeOn('btn-import', 'click', () => {
        const fileInput = document.getElementById('file-excel');
        if (fileInput) fileInput.click();
    });

    safeOn('file-excel', 'change', handleExcelImport);

    // === Only render dashboard if it's currently visible ===
    const dashboardPage = document.getElementById('page-dashboard');
    if (dashboardPage && !dashboardPage.classList.contains('hidden')) {
        renderDashboard();
    }

    // Re-render saat data Firestore siap
    document.addEventListener('firestore-ready', () => {
        populateBulanDropdown();
        const dp = document.getElementById('page-dashboard');
        if (dp && !dp.classList.contains('hidden')) {
            renderDashboard();
        }
    });
});

function renderDashboard() {
    if (typeof ScreeningDB === 'undefined') {
        console.error("ScreeningDB is not defined. Make sure database.js is loaded.");
        return;
    }

    if (typeof PatientDB !== 'undefined' && typeof PatientDB.removeDuplicates === 'function') {
        PatientDB.removeDuplicates();
    }

    const currentBulan = document.getElementById('filter-bulan')?.value || '';
    const currentGender = document.getElementById('filter-gender')?.value || '';
    const globalStats = ScreeningDB.getStats(currentBulan, currentGender);
    const currentJorong = document.getElementById('filter-jorong').value;
    const currentSearch = document.getElementById('table-search').value;

    let statsToUse = globalStats;
    if (currentJorong && currentJorong !== '' && currentJorong !== 'Semua Jorong') {
        if (globalStats.perJorong && globalStats.perJorong[currentJorong]) {
            statsToUse = globalStats.perJorong[currentJorong];
        } else {
            // Jika jorong dipilih tapi tidak ada datanya, gunakan stats kosong (nol)
            statsToUse = {
                totalScreened: 0,
                total: 0,
                sehat: 0,
                htTerkontrol: 0,
                htTidakTerkontrol: 0,
                faktorRisikoCount: { merokok: 0, alkohol: 0, obesitas: 0, aktivitasFisikKurang: 0, riwayatKeluarga: 0, stress: 0 }
            };
        }
    }

    // Helper to calculate percentage safely
    const calcPercent = (val, total) => {
        if (total === 0) return ' (0%)';
        return ` (${(val / total * 100).toFixed(0)}%)`;
    };

    const total = statsToUse.totalScreened !== undefined ? statsToUse.totalScreened : (statsToUse.total || 0);
    
    // Total keseluruhan warga (semua pasien terdaftar, bukan hanya yang diskrining)
    let allWarga = PatientDB.getAll();
    if (currentJorong && currentJorong !== '' && currentJorong !== 'Semua Jorong') {
        allWarga = allWarga.filter(p => (p.jorong || '').toLowerCase() === currentJorong.toLowerCase());
    }
    if (currentGender) {
        allWarga = allWarga.filter(p => p.jenisKelamin === currentGender);
    }
    const totalWargaEl = document.getElementById('stat-total-warga');
    if (totalWargaEl) totalWargaEl.textContent = allWarga.length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-sehat').textContent = (statsToUse.sehat || 0) + calcPercent(statsToUse.sehat || 0, total);
    document.getElementById('stat-terkontrol').textContent = (statsToUse.htTerkontrol || 0) + calcPercent(statsToUse.htTerkontrol || 0, total);
    document.getElementById('stat-tidak-terkontrol').textContent = (statsToUse.htTidakTerkontrol || 0) + calcPercent(statsToUse.htTidakTerkontrol || 0, total);

    const totalRiskScore = statsToUse.totalRiskScore || 0;
    const avgRiskScore = total > 0 ? parseFloat((totalRiskScore / total).toFixed(1)) : 0;
    let avgRiskLevel = 'Rendah';
    if (avgRiskScore >= 9) avgRiskLevel = 'Tinggi';
    else if (avgRiskScore >= 5) avgRiskLevel = 'Sedang';

    document.getElementById('stat-avg-risiko').textContent = avgRiskScore;
    document.getElementById('stat-avg-risiko').nextElementSibling.textContent = `Rata-rata Skor Risiko (${avgRiskLevel})`;

    renderCharts(statsToUse);
    
    renderTable(currentJorong, currentSearch, currentBulan, currentGender);
    
    // Render tren kasus hipertensi
    renderTrenKasus(currentJorong, currentGender);

    // NEW render warga table
    renderWargaTable(currentJorong);

    // NEW render follow-up tables
    if (typeof renderFollowUpTables === 'function') {
        renderFollowUpTables(currentJorong, currentBulan, currentGender);
    }

    // NEW render Demografi
    if (typeof PatientDB !== 'undefined' && typeof PatientDB.getDemographicsStats === 'function') {
        const filterStr = currentJorong === 'Semua Jorong' ? '' : currentJorong;
        const demoStats = PatientDB.getDemographicsStats(filterStr, currentGender);
        const totalPendudukEl = document.getElementById('stat-total-penduduk');
        if (totalPendudukEl) {
            totalPendudukEl.textContent = demoStats.total;
        }
        renderDemografiChart(demoStats);
    }
}

function renderCharts(stats) {
    // 1. Status Chart (Doughnut)
    const ctxStatus = document.getElementById('chart-status').getContext('2d');
    if (statusChartInstance) {
        statusChartInstance.destroy();
    }
    statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Bukan Hipertensi', 'HT Terkontrol', 'HT Tidak Terkontrol'],
            datasets: [{
                data: [stats.sehat || 0, stats.htTerkontrol || 0, stats.htTidakTerkontrol || 0],
                backgroundColor: ['#16a34a', '#2563eb', '#dc2626'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // 2. Risiko Chart (Horizontal Bar)
    const ctxRisiko = document.getElementById('chart-risiko').getContext('2d');
    if (risikoChartInstance) {
        risikoChartInstance.destroy();
    }
    
    const faktor = stats.faktorRisiko || {};
    risikoChartInstance = new Chart(ctxRisiko, {
        type: 'bar',
        data: {
            labels: ['Merokok', 'Kurang Aktivitas', 'Makan Asin', 'Riwayat Keluarga', 'Obesitas', 'Alkohol'],
            datasets: [{
                data: [
                    faktor.merokok || 0,
                    faktor.kurangAktivitas || 0,
                    faktor.makanAsin || 0,
                    faktor.riwayatKeluarga || 0,
                    faktor.obesitas || 0,
                    faktor.alkohol || 0
                ],
                backgroundColor: [
                    '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderDemografiChart(demoStats) {
    const ctx = document.getElementById('chart-demografi');
    if (!ctx) return;
    
    if (demografiChartInstance) {
        demografiChartInstance.destroy();
    }
    
    const data = [
        demoStats.kategori.bayi,
        demoStats.kategori.baduta,
        demoStats.kategori.balita,
        demoStats.kategori.apras,
        demoStats.kategori.anak,
        demoStats.kategori.remajaAwal,
        demoStats.kategori.remajaAkhir,
        demoStats.kategori.produktif,
        demoStats.kategori.praLansia,
        demoStats.kategori.lansia,
        demoStats.kategori.lansiaResti
    ];

    const labels = [
        'Bayi (0-11 bln)',
        'Baduta (12-23 bln)',
        'Balita (24-59 bln)',
        'APRAS (60-72 bln)',
        'Anak (6-11 thn)',
        'Remaja Awal (12-14 thn)',
        'Remaja Akhir (15-18 thn)',
        'Usia Produktif (19-44 thn)',
        'Pra Lansia (45-59 thn)',
        'Lansia (60-69 thn)',
        'Lansia Resti (≥70 thn)'
    ];

    demografiChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Penduduk',
                data: data,
                backgroundColor: [
                    '#fda4af', '#f43f5e', '#e11d48', '#be123c', // Pinks/Reds
                    '#fb923c', '#f97316', // Oranges
                    '#fcd34d', '#f59e0b', // Yellows
                    '#34d399', // Green
                    '#38bdf8', // Blues
                    '#6366f1' // Indigo
                ],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.raw} jiwa`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 } // no decimals for people
                }
            },
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const dataIndex = activeElements[0].index;
                    const catKeys = ['bayi', 'baduta', 'balita', 'apras', 'anak', 'remajaAwal', 'remajaAkhir', 'produktif', 'praLansia', 'lansia', 'lansiaResti'];
                    const clickedCat = catKeys[dataIndex];
                    showCategoryModal(clickedCat, labels[dataIndex]);
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            }
        }
    });
}

function renderTable(filterJorong = '', searchQuery = '', filterBulan = '', filterGender = '') {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (typeof ScreeningDB === 'undefined' || typeof PatientDB === 'undefined') return;

    // We only want to show patients who have at least one screening
    let allScreenings = ScreeningDB.getAll();
    if (filterBulan) {
        allScreenings = allScreenings.filter(s => {
            let tgl = s.tanggalSkrining || s.createdAt || s.waktuSkrining;
            if (!tgl) return false;
            
            if (typeof tgl === 'string' && tgl.includes('/')) {
                const p = tgl.split('/');
                if (p.length === 3 && p[2].length === 4) {
                    tgl = `${p[2]}-${p[1]}-${p[0]}`;
                }
            }
            
            return filterBulan.length === 10 ? tgl.substring(0, 10) === filterBulan : tgl.substring(0, 7) === filterBulan;
        });
    }
    
    // Gender filter
    if (filterGender) {
        allScreenings = allScreenings.filter(s => {
            const patient = PatientDB.getById(s.patientId) || {};
            const jk = patient.jenisKelamin || s.jenisKelamin || '';
            return jk === filterGender;
        });
    }

    if (allScreenings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 32px;">Belum ada data skrining.</td></tr>';
        return;
    }

    let latestPerPatient = {};
    allScreenings.forEach(s => {
        if (!latestPerPatient[s.patientId] || new Date(s.tanggalSkrining) > new Date(latestPerPatient[s.patientId].tanggalSkrining)) {
            latestPerPatient[s.patientId] = s;
        }
    });

    let screenings = Object.values(latestPerPatient);
    
    // Sort descending by latest screening date
    screenings.sort((a, b) => new Date(b.tanggalSkrining) - new Date(a.tanggalSkrining));

    // Filter
    if (filterJorong && filterJorong !== 'Semua Jorong') screenings = screenings.filter(s => (s.jorong || '').toLowerCase() === filterJorong.toLowerCase());
    if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        screenings = screenings.filter(s => {
            const nama = (s.nama || '').toLowerCase();
            const nik = (PatientDB.getById(s.patientId)?.nik || s.nik || '');
            return nama.includes(q) || nik.includes(q);
        });
    }

    const totalItems = screenings.length;
    window.updatePaginationUI('skrining', totalItems);

    const startIdx = (window.statePage['skrining'] - 1) * PAGE_SIZE;
    const paginated = screenings.slice(startIdx, startIdx + PAGE_SIZE);

    if (paginated.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 32px;">Data tidak ditemukan.</td></tr>';
        return;
    }

    paginated.forEach((s, index) => {
        const tr = document.createElement('tr');
        const patient = PatientDB.getById(s.patientId) || {};
        const nik = patient.nik || s.nik || '-';
        const jk = (patient.jenisKelamin || s.jenisKelamin) === 'female' ? 'Perempuan' : 'Laki-laki';
        const globalIndex = startIdx + index + 1;

        const totalSkrining = allScreenings.filter(sc => String(sc.patientId) === String(s.patientId)).length;

        tr.innerHTML = `
            <td>${globalIndex}</td>
            <td>${nik}</td>
            <td>${patient.nama || s.nama || '-'}</td>
            <td>${patient.jorong || s.jorong || '-'}</td>
            <td>${patient.umur || s.umur || '-'}</td>
            <td>${jk}</td>
            <td style="text-align: center;">
                <button class="btn btn-info btn-sm" onclick="showHistoryModal('${s.patientId}')" style="display:inline-flex; align-items:center; gap:6px;">
                    <i class="ph-bold ph-list-magnifying-glass"></i> Detail Riwayat (${totalSkrining}x)
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}window.showHistoryModal = function(patientId) {
    try {
        const modal = document.getElementById('history-modal');
        const tbody = document.getElementById('modal-history-body');
        const nameSpan = document.getElementById('modal-patient-name');
        
        if (!modal || !tbody) {
            console.error('History modal elements not found');
            alert('Elemen modal riwayat tidak ditemukan di halaman.');
            return;
        }
        
        // Normalisasi ID ke string untuk perbandingan yang konsisten
        const pid = String(patientId);
        const patient = PatientDB.getById(pid) || PatientDB.getAll().find(p => String(p.id) === pid || String(p.nik) === pid);
        if(patient && nameSpan) nameSpan.textContent = patient.nama;

        let history = ScreeningDB.getAll().filter(s => String(s.patientId) === pid);
        
        console.log(`showHistoryModal: pid=${pid}, found ${history.length} screenings`);
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="21" style="text-align:center; color:var(--text-muted); padding:20px;">Belum ada data skrining untuk warga ini.</td></tr>';
            modal.classList.remove('hidden');
            return;
        }
        
        // Sort oldest first to calculate index
        history.sort((a, b) => new Date(a.tanggalSkrining || 0) - new Date(b.tanggalSkrining || 0));
        history.forEach((s, idx) => { s._ke = idx + 1; });
        
        // Sort newest first for display
        history.sort((a, b) => new Date(b.tanggalSkrining || 0) - new Date(a.tanggalSkrining || 0));

        tbody.innerHTML = '';
        
        history.forEach(s => {
            try {
                const tr = document.createElement('tr');
                const dateStr = s.tanggalSkrining ? new Date(s.tanggalSkrining).toLocaleDateString('id-ID') : '-';
                
                // IMT Badge (safe access)
                const imtVal = (s.hasil && s.hasil.imt && s.hasil.imt.nilai != null) ? s.hasil.imt.nilai : '-';
                const imtKat = (s.hasil && s.hasil.imt && s.hasil.imt.kategori ? s.hasil.imt.kategori : '').toLowerCase();
                let imtClass = 'status-badge';
                if (imtKat.includes('normal')) imtClass += ' normal';
                else if (imtKat.includes('obesitas')) imtClass += ' danger';
                else if (imtKat.includes('pre-obese') || imtKat.includes('overweight')) imtClass += ' warning';
                else imtClass += ' info';

                // Tensi
                const sistolik = s.sistolik || '-';
                const diastolik = s.diastolik || '-';

                // Status HT (safe access)
                const statusHT = (s.hasil && s.hasil.statusHT) ? s.hasil.statusHT : 'Bukan Hipertensi';
                let statusHTClass = 'status-badge';
                if (statusHT === 'Bukan Hipertensi' || statusHT === 'Normal' || statusHT === 'Sehat') statusHTClass += ' normal';
                else if (statusHT === 'Terkontrol') statusHTClass += ' terkontrol';
                else statusHTClass += ' tidak-terkontrol';

                // Skor Risiko (safe access)
                const riskScore = (s.hasil && s.hasil.riskScore) ? s.hasil.riskScore : 0;
                let riskClass = 'status-badge ';
                let riskLabel = '';
                if (riskScore >= 9) { riskClass += 'danger'; riskLabel = `Tinggi (${riskScore})`; }
                else if (riskScore >= 5) { riskClass += 'warning'; riskLabel = `Sedang (${riskScore})`; }
                else { riskClass += 'normal'; riskLabel = `Rendah (${riskScore})`; }

                // Risiko CVD (WHO) (safe access)
                let cvdRisk = '-';
                if (s.hasil && s.hasil.komplikasi && Array.isArray(s.hasil.komplikasi) && s.hasil.komplikasi.length > 0) {
                    if (typeof s.hasil.komplikasi[0] === 'object' && s.hasil.komplikasi[0].level) {
                        cvdRisk = s.hasil.komplikasi.map(k => k.level).join(', ');
                    } else if (typeof s.hasil.komplikasi[0] === 'string') {
                        cvdRisk = s.hasil.komplikasi.join(', ');
                    }
                }
                if (s.hasil && s.hasil.komplikasiList && Array.isArray(s.hasil.komplikasiList) && s.hasil.komplikasiList.length > 0 && cvdRisk === '-') {
                    cvdRisk = s.hasil.komplikasiList.join(', ');
                }

                // Individual columns (all safe)
                const bbTbStr = s.beratBadan ? `${s.beratBadan}kg / ${s.tinggiBadan || '?'}cm` : '-';
                const riwKelStr = s.riwayatKeluarga === 'yes' ? 'Ya' : 'Tidak';
                const merokokStr = s.merokok === 'active' ? 'Aktif' : (s.merokok === 'passive' ? 'Pasif' : 'Tidak');
                const garamStr = s.polaGaram === 'high' ? 'Tinggi' : (s.polaGaram === 'medium' ? 'Sedang' : 'Rendah');
                const alkoholStr = s.alkohol === 'ya' ? 'Ya' : 'Tidak';
                const fisikStr = s.aktivitasFisik === 'active' ? 'Aktif' : (s.aktivitasFisik === 'moderate' ? 'Sedang' : 'Kurang');
                const komorStr = Array.isArray(s.komorbiditas) && s.komorbiditas.length > 0 ? s.komorbiditas.join(', ') : '-';
                const kompStr = Array.isArray(s.komplikasiHT) && s.komplikasiHT.length > 0 ? s.komplikasiHT.join(', ') : '-';
                const stresStr = Array.isArray(s.stress) ? (s.stress.length > 0 ? s.stress.join(', ') : 'Tidak Ada') : (s.stress === 'ya' ? 'Ya' : 'Tidak Ada');
                const riwHtStr = s.riwayatHT === 'ya' ? 'Ya' : 'Tidak';
                const obatHtStr = s.minumObatHT === 'ya' ? 'Ya' : 'Tidak';
                
                const penyertaStr = s.penyakitPenyerta || '-';

                // Edukasi (safe access)
                let edukasi = [];
                if (s.edukasi && s.edukasi.hipertensi) edukasi.push('Penjelasan HT');
                if (s.edukasi && s.edukasi.dashDiet) edukasi.push('DASH Diet');
                if (s.edukasi && s.edukasi.aktivitas) edukasi.push('Akt. Fisik');
                if (s.edukasi && s.edukasi.alkohol) edukasi.push('Batas Alkohol');
                const eduStr = edukasi.length > 0 ? edukasi.map(str => `<div><small style="color:var(--success);">✓ ${str}</small></div>`).join('') : '-';

                // Escape ID untuk onclick (hindari karakter aneh)
                const safeId = String(s.id || '').replace(/'/g, "\\'");
                const safePid = String(patientId).replace(/'/g, "\\'");

                // Kategori Kasus (safe access)
                const katKasus = (s.hasil && s.hasil.kategoriKasus) ? s.hasil.kategoriKasus : '-';
                let katClass = 'status-badge';
                if (katKasus === 'Baru') katClass += ' warning';
                else if (katKasus === 'Lama') katClass += ' info';
                else katClass += ' normal';

                tr.innerHTML = `
                    <td style="font-weight:bold;">${s._ke || '-'}</td>
                    <td>${dateStr}</td>
                    <td style="font-size: 0.85em;">${bbTbStr}</td>
                    <td><span class="${imtClass}">${imtVal}</span></td>
                    <td>${sistolik}/${diastolik}</td>
                    <td><span class="${statusHTClass}">${statusHT}</span></td>
                    <td><span class="${katClass}">${katKasus}</span></td>
                    <td><span class="${riskClass}">${riskLabel}</span></td>
                    <td>${cvdRisk}</td>
                    <td style="font-size: 0.85em;">${riwKelStr}</td>
                    <td style="font-size: 0.85em;">${merokokStr}</td>
                    <td style="font-size: 0.85em;">${garamStr}</td>
                    <td style="font-size: 0.85em;">${alkoholStr}</td>
                    <td style="font-size: 0.85em;">${fisikStr}</td>
                    <td style="font-size: 0.85em;">${stresStr}</td>
                    <td style="font-size: 0.85em;">${riwHtStr}</td>
                    <td style="font-size: 0.85em;">${obatHtStr}</td>
                    <td style="font-size: 0.85em;">${komorStr}</td>
                    <td style="font-size: 0.85em;">${kompStr}</td>
                    <td style="font-size: 0.85em;">${penyertaStr}</td>
                    <td style="font-size: 0.85em; line-height: 1.3;">${eduStr}</td>
                    <td style="text-align:center;">
                        ${(window.currentUser && window.currentUser.role === 'admin' && window.currentUser.jorong !== (patient ? patient.jorong : '')) ? 
                            '<span style="color:var(--text-muted); font-size: 0.85rem;" title="Beda Jorong"><i class="ph-bold ph-lock"></i></span>' :
                            `<button class="btn btn-danger btn-sm" onclick="deleteScreeningRecord('${safeId}', '${safePid}')" title="Hapus riwayat ini">
                                <i class="ph-bold ph-trash"></i>
                            </button>`
                        }
                    </td>
                `;
                tbody.appendChild(tr);
            } catch (rowErr) {
                console.error('Error rendering screening row:', rowErr, s);
                // Tetap lanjut ke baris berikutnya
            }
        });

        modal.classList.remove('hidden');
    } catch (e) {
        console.error('showHistoryModal error:', e);
        alert('Gagal membuka riwayat: ' + e.message);
    }
};

window.deleteScreeningRecord = async function(screeningId, patientId) {
    const confirmed = await showConfirm(
        'Hapus Riwayat Skrining',
        'Apakah Anda yakin ingin menghapus catatan skrining ini?'
    );
    if (confirmed) {
        showLoading('Menghapus riwayat...');
        setTimeout(() => {
            try {
                ScreeningDB.deleteById(screeningId);
                showToast('Riwayat skrining berhasil dihapus.', 'danger');
                showHistoryModal(patientId);
                if (typeof renderDashboard === 'function') renderDashboard();
            } catch (e) {
                console.error("Error deleting screening record:", e);
                showToast("Terjadi kesalahan saat menghapus riwayat.", "danger");
            } finally {
                hideLoading();
            }
        }, 300);
    }
};

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

function handleExcelImport(e) {
    if (window.currentUser && window.currentUser.role !== 'superadmin') {
        Swal.fire('Akses Ditolak', 'Hanya Super Admin yang dapat mengimpor data masal.', 'error');
        e.target.value = '';
        return;
    }

    const file = e.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        showAlert('import-alert', 'Library Excel (SheetJS) gagal dimuat.', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            
            if (jsonData.length === 0) {
                Swal.fire('Peringatan', 'File Excel kosong atau format tidak sesuai.', 'warning');
                return;
            }

            const isScreeningFile = jsonData.some(row => row['Sistolik'] !== undefined || row['sistolik'] !== undefined || row['BB (kg)'] !== undefined || row['Tanggal Skrining'] !== undefined);

            if (isScreeningFile) {
                let addedScreenings = 0;
                let failedScreenings = [];
                
                jsonData.forEach(row => {
                    const nik = String(row['NIK'] || row['nik'] || '').trim();
                    const nama = String(row['Nama'] || row['nama'] || row['NAMA'] || '').trim();
                    if (!nik && !nama) return;
                    
                    const patients = PatientDB.getAll();
                    let patient = null;
                    if (nik && nik !== '-') patient = patients.find(p => p.nik === nik);
                    if (!patient && nama && nama !== '-') patient = patients.find(p => (p.nama || '').toLowerCase() === nama.toLowerCase());
                    
                    if (!patient) {
                        // Auto-create patient if missing
                        let tglLahir = row['Tanggal Lahir'] || row['tanggal_lahir'] || '';
                        if (typeof tglLahir === 'number') tglLahir = new Date((tglLahir - 25569) * 86400 * 1000).toISOString();
                        
                        patient = {
                            nik: nik || '-',
                            nama: nama || '-',
                            umur: parseInt(row['Umur'] || row['umur'] || row['Usia'] || 0),
                            tanggalLahir: tglLahir,
                            jenisKelamin: (String(row['Jenis Kelamin'] || row['jenis_kelamin'] || row['JK'] || 'male')).toLowerCase().includes('p') ? 'female' : 'male',
                            jorong: String(row['Jorong'] || row['jorong'] || row['Alamat'] || '')
                        };
                        PatientDB.add(patient);
                    }
                    
                    const sistolik = parseInt(row['Sistolik'] || row['sistolik'] || 0);
                    const diastolik = parseInt(row['Diastolik'] || row['diastolik'] || 0);
                    const bb = parseFloat(row['BB (kg)'] || row['bb'] || 0);
                    const tb = parseFloat(row['TB (cm)'] || row['tb'] || 0);
                    
                    if (!sistolik && !bb) return; 

                    let tglSkrining = row['Tanggal Skrining'] || row['tanggal_skrining'];
                    if (typeof tglSkrining === 'number') tglSkrining = new Date((tglSkrining - 25569) * 86400 * 1000).toISOString();
                    else if (typeof tglSkrining === 'string') {
                        const parts = tglSkrining.split(/[-/]/);
                        if (parts.length === 3) tglSkrining = parts[2].length === 4 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString() : new Date(tglSkrining).toISOString();
                        else tglSkrining = new Date().toISOString();
                    } else tglSkrining = new Date().toISOString();
                    if(isNaN(new Date(tglSkrining).getTime())) tglSkrining = new Date().toISOString();

                    const checkStr = (val) => {
                        const s = String(val || '').toUpperCase();
                        return (s === 'YA' || s === 'TRUE' || s.includes('☑') || s === 'V' || s === '1') ? 'ya' : 'tidak';
                    };
                    const checkStrMerokok = (val) => {
                        const s = String(val || '').toUpperCase();
                        if (s.includes('AKTIF') || s === 'YA' || s === 'TRUE' || s.includes('☑')) return 'active';
                        if (s.includes('PASIF')) return 'passive';
                        return 'no';
                    };
                    
                    const screeningData = {
                        patientId: patient.id,
                        tanggalSkrining: tglSkrining,
                        sistolik: sistolik,
                        diastolik: diastolik,
                        beratBadan: bb,
                        tinggiBadan: tb,
                        merokok: checkStrMerokok(row['Merokok (Aktif/Pasif/Tidak)']),
                        polaGaram: checkStr(row['Konsumsi Garam Berlebih (Ya/Tidak)']),
                        alkohol: checkStr(row['Konsumsi Alkohol (Ya/Tidak)']),
                        aktivitasFisik: checkStr(row['Kurang Aktivitas Fisik (Ya/Tidak)']) === 'ya' ? 'rare' : 'active',
                        stress: (row['Faktor Stress'] || row['Stress (Ya/Tidak)'] || row['Stress'] || '').toString().split(',').map(x => x.trim()).filter(Boolean),
                        riwayatKeluarga: checkStr(row['Riwayat Keluarga / Genetik HT (Ya/Tidak)']) === 'ya' ? 'yes' : 'no',
                        riwayatHT: checkStr(row['Riwayat Hipertensi (Ya/Tidak)']), 
                        minumObatHT: checkStr(row['Rutin Minum Obat HT (Ya/Tidak)']),
                        komorbiditas: (row['Komorbid (Ketik: Diabetes / Ginjal / Jantung)'] || '').split(',').map(s=>s.trim()).filter(s=>s && s !== '-'),
                        penyakitPenyerta: String(row['Penyakit Penyerta Lainnya'] || '').replace('-', '').trim(),
                        obatAntihipertensi: String(row['Obat Antihipertensi'] || '').replace('-', '').trim(),
                        komplikasiHT: (row['Komplikasi (Ketik: Stroke / Ginjal / Mata / Jantung)'] || '').toString().split(',').map(x => x.trim()).filter(Boolean)
                    };

                    if (typeof HypertensionScreening !== 'undefined') {
                        const expert = new HypertensionScreening({ ...screeningData, umur: patient.umur || 40 });
                        screeningData.hasil = expert.evaluate();
                    }
                    ScreeningDB.add(screeningData);
                    addedScreenings++;
                });

                let alertMsg = `<b>Data Skrining</b><br>Berhasil ditambahkan: ${addedScreenings} data.<br><br>`;
                if (failedScreenings.length > 0) {
                    alertMsg += `<b style="color: #d97706;">Peringatan: ${failedScreenings.length} baris dilewati</b> karena warga belum terdaftar:<br><small>${failedScreenings.join(', ')}</small>`;
                }
                if (typeof window.renderJorongDropdowns === 'function') window.renderJorongDropdowns();
                if (typeof populateBulanDropdown === 'function') populateBulanDropdown();
                if (typeof renderDashboard === 'function') renderDashboard();
                
                Swal.fire({ title: 'Import Selesai', html: alertMsg, icon: failedScreenings.length > 0 ? 'warning' : 'success' });

            } else {
                const patients = jsonData.map(row => {
                    let tglLahir = row['Tanggal Lahir'] || row['tanggal_lahir'] || '';
                    if (typeof tglLahir === 'number') {
                        tglLahir = new Date((tglLahir - 25569) * 86400 * 1000).toISOString();
                    }
                    return {
                        nik: String(row['NIK'] || row['nik'] || ''),
                        nama: String(row['Nama'] || row['nama'] || row['NAMA'] || ''),
                        umur: parseInt(row['Umur'] || row['umur'] || row['Usia'] || 0),
                        tanggalLahir: tglLahir,
                        jenisKelamin: (String(row['Jenis Kelamin'] || row['jenis_kelamin'] || row['JK'] || 'male')).toLowerCase().includes('p') ? 'female' : 'male',
                        jorong: String(row['Jorong'] || row['jorong'] || row['Alamat'] || '')
                    };
                });

                if (typeof PatientDB !== 'undefined') {
                    const result = PatientDB.importBulk(patients);
                    if (typeof window.renderJorongDropdowns === 'function') window.renderJorongDropdowns();
                    Swal.fire('Import Selesai', `<b>Data Warga</b><br>Data baru ditambahkan: ${result.added}<br>Data diperbarui: ${result.updated}<br>Total Warga: ${result.total}`, 'success');
                } else {
                    Swal.fire('Error', 'PatientDB tidak ditemukan. Data tidak disimpan.', 'error');
                }
            }
            
            renderDashboard();
            
            // Reset input file
            document.getElementById('file-excel').value = '';
            
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Terjadi kesalahan saat memproses file Excel.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleExcelExport() {
    if (typeof XLSX === 'undefined' || typeof ScreeningDB === 'undefined') return;

    const allScreenings = ScreeningDB.getAll();
    if (allScreenings.length === 0) {
        Swal.fire('Peringatan', 'Tidak ada data skrining untuk diexport.', 'warning');
        return;
    }

    const filterJorong = document.getElementById('filter-jorong')?.value || '';

    let latestPerPatient = {};
    allScreenings.forEach(s => {
        if (!latestPerPatient[s.patientId] || new Date(s.tanggalSkrining) > new Date(latestPerPatient[s.patientId].tanggalSkrining)) {
            latestPerPatient[s.patientId] = s;
        }
    });
    let screenings = Object.values(latestPerPatient).sort((a, b) => new Date(b.tanggalSkrining) - new Date(a.tanggalSkrining));

    if (filterJorong && filterJorong !== 'Semua Jorong') {
        screenings = screenings.filter(s => {
            let jorong = s.jorong;
            if (typeof PatientDB !== 'undefined' && s.patientId) {
                const patient = PatientDB.getById(s.patientId);
                if (patient && patient.jorong) jorong = patient.jorong;
            }
            return jorong === filterJorong;
        });
        if (screenings.length === 0) {
            Swal.fire('Peringatan', `Tidak ada data skrining untuk diexport untuk jorong ${filterJorong}.`, 'warning');
            return;
        }
    }

    const exportData = screenings.map((s, i) => {
        let nik = s.nik || '-';
        let jenisKelamin = '-';
        let tanggalLahir = s.tanggalLahir ? new Date(s.tanggalLahir).toLocaleDateString('id-ID') : '-';
        if (typeof PatientDB !== 'undefined' && s.patientId) {
            const patient = PatientDB.getById(s.patientId);
            if (patient && patient.nik) nik = patient.nik;
            if (patient && patient.jenisKelamin) jenisKelamin = patient.jenisKelamin === 'female' ? 'Perempuan' : 'Laki-laki';
            if (patient && patient.tanggalLahir && tanggalLahir === '-') tanggalLahir = new Date(patient.tanggalLahir).toLocaleDateString('id-ID');
        }

        let edukasiExport = [];
        if (s.edukasi?.hipertensi) edukasiExport.push('Penjelasan HT');
        if (s.edukasi?.dashDiet) edukasiExport.push('DASH Diet');
        if (s.edukasi?.aktivitas) edukasiExport.push('Akt. Fisik');
        if (s.edukasi?.alkohol) edukasiExport.push('Batas Alkohol');
        const eduExportStr = edukasiExport.length > 0 ? edukasiExport.join(', ') : '-';

        return {
            'No': i + 1,
            'Tanggal Skrining': s.tanggalSkrining ? new Date(s.tanggalSkrining).toLocaleDateString('id-ID') : '-',
            'Nama': s.nama || '-',
            'NIK': nik,
            'Jenis Kelamin': jenisKelamin,
            'Tanggal Lahir': tanggalLahir,
            'Umur': s.umur || 0,
            'Jorong / Alamat': s.jorong || '-',
            
            // Pengukuran
            'BB (kg)': s.beratBadan || '-',
            'TB (cm)': s.tinggiBadan || '-',
            'IMT': s.hasil?.imt?.nilai || '-',
            'Kategori IMT': s.hasil?.imt?.kategori || '-',
            'Sistolik': s.sistolik || '-',
            'Diastolik': s.diastolik || '-',
            
            // Status Hipertensi & Komplikasi
            'Riwayat Hipertensi (Ya/Tidak)': s.riwayatHT === 'ya' ? 'Ya' : 'Tidak',
            'Rutin Minum Obat HT (Ya/Tidak)': s.minumObatHT === 'ya' ? 'Ya' : 'Tidak',
            'Komorbid (Ketik: Diabetes / Ginjal / Jantung)': (Array.isArray(s.komorbiditas) && s.komorbiditas.length > 0) ? s.komorbiditas.join(', ') : '-',
            'Komplikasi (Ketik: Stroke / Ginjal / Mata / Jantung)': (Array.isArray(s.komplikasiHT) && s.komplikasiHT.length > 0) ? s.komplikasiHT.join(', ') : '-',
            'Penyakit Penyerta Lainnya': s.penyakitPenyerta || '-',
            'Obat Antihipertensi': s.obatAntihipertensi || '-',
            
            // Faktor Risiko Detail
            'Riwayat Keluarga / Genetik HT (Ya/Tidak)': s.riwayatKeluarga === 'yes' ? 'Ya' : 'Tidak',
            'Merokok (Aktif/Pasif/Tidak)': s.merokok === 'active' ? 'Aktif' : (s.merokok === 'passive' ? 'Pasif' : 'Tidak'),
            'Konsumsi Garam Berlebih (Ya/Tidak)': s.polaGaram === 'high' ? 'Ya' : 'Tidak',
            'Konsumsi Alkohol (Ya/Tidak)': s.alkohol === 'ya' ? 'Ya' : 'Tidak',
            'Kurang Aktivitas Fisik (Ya/Tidak)': s.aktivitasFisik === 'rare' ? 'Ya' : 'Tidak',
            'Faktor Stress': Array.isArray(s.stress) ? s.stress.join(', ') : (s.stress || ''),
            
            // Output Sistem Tambahan
            'Klasifikasi TD': s.hasil?.klasifikasiTD || '-',
            'Status HT (Sistem)': s.hasil?.statusHT || '-',
            'Kategori Kasus': s.hasil?.kategoriKasus || '-',
            'Risiko CVD (WHO)': (() => {
                if (s.hasil?.komplikasi && Array.isArray(s.hasil.komplikasi) && s.hasil.komplikasi.length > 0) {
                    if (typeof s.hasil.komplikasi[0] === 'object' && s.hasil.komplikasi[0].level) {
                        return s.hasil.komplikasi.map(k => k.level).join(', ');
                    }
                }
                return (s.hasil?.komplikasiList || []).join(', ') || '-';
            })(),
            'Skor Risiko': (s.hasil?.riskScore !== undefined && s.hasil?.riskScore !== null) ? s.hasil.riskScore : 0,
            'Edukasi Diberikan': eduExportStr
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-adjust column widths
    if (exportData.length > 0) {
        const colWidths = Object.keys(exportData[0]).map(key => {
            let maxLen = key.length;
            exportData.forEach(row => {
                const val = row[key];
                if (val && String(val).length > maxLen) {
                    maxLen = String(val).length;
                }
            });
            return { wch: Math.min(maxLen + 2, 50) }; // Add padding, limit max width to 50
        });
        ws['!cols'] = colWidths;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Skrining');
    XLSX.writeFile(wb, 'Data_Skrining_KotoTangah.xlsx');
}

function showAlert(containerId, message, type = 'info') {
    Swal.fire({
        icon: type === 'error' ? 'error' : type,
        html: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
}

// NEW functions
function downloadTemplate() {
    if (typeof XLSX === 'undefined') return;

    const filterJorong = document.getElementById('filter-jorong')?.value || '';
    const exampleJorong1 = filterJorong && filterJorong !== 'Semua Jorong' ? filterJorong : 'Anduriang Munggu Gadang';
    const exampleJorong2 = filterJorong && filterJorong !== 'Semua Jorong' ? filterJorong : 'Aur';

    // Sheet 1: Data Warga
    const wsData = XLSX.utils.aoa_to_sheet([
        ['No', 'NIK', 'Nama', 'Umur', 'Jenis Kelamin', 'Jorong', 'Tanggal Lahir'],
        [1, '1305201001800001', 'Ahmad Contoh', 55, 'L', exampleJorong1, '1969-05-20'],
        [2, '1305201002750002', 'Siti Contoh', 48, 'P', exampleJorong2, '1976-02-14'],
        ['', '', '', '', '', '', '']
    ]);
    
    wsData['!cols'] = [
        {wch: 5},
        {wch: 20},
        {wch: 25},
        {wch: 8},
        {wch: 15},
        {wch: 22},
        {wch: 15}
    ];
    
    // Sheet 2: Petunjuk
    const wsPetunjuk = XLSX.utils.aoa_to_sheet([
        ['PETUNJUK PENGISIAN TEMPLATE DATA WARGA'],
        [''],
        ['Kolom NIK: Isi dengan 16 digit NIK KTP warga'],
        ['Kolom Nama: Isi nama lengkap warga'],
        ['Kolom Umur: Isi umur dalam tahun'],
        ['Kolom Jenis Kelamin: Isi L (Laki-laki) atau P (Perempuan)'],
        ['Kolom Jorong: Isi sesuai nama jorong (misal: ' + exampleJorong1 + ')'],
        ['Kolom Tanggal Lahir: Opsional, format YYYY-MM-DD'],
        [''],
        ['PENTING: Jangan mengubah nama kolom (header) pada baris pertama!']
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, 'Template Warga');
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
    
    XLSX.writeFile(wb, 'Template_Import_Warga.xlsx');
}

window.downloadSkriningTemplate = function() {
    if (typeof XLSX === 'undefined') return;

    const filterJorong = document.getElementById('filter-jorong')?.value || '';
    const exampleJorong1 = filterJorong && filterJorong !== 'Semua Jorong' ? filterJorong : 'Anduriang Munggu Gadang';

    // Sheet 1: Data Skrining
    const wsTemplate = XLSX.utils.aoa_to_sheet([
        ['No', 'NIK', 'Nama', 'Jenis Kelamin', 'Tanggal Lahir', 'Umur', 'Jorong / Alamat', 'Tanggal Skrining', 'Sistolik', 'Diastolik', 'BB (kg)', 'TB (cm)', 'Riwayat Hipertensi (Ya/Tidak)', 'Rutin Minum Obat HT (Ya/Tidak)', 'Komorbid (Ketik: Diabetes / Ginjal / Jantung)', 'Komplikasi (Ketik: Stroke / Ginjal / Mata / Jantung)', 'Penyakit Penyerta Lainnya', 'Obat Antihipertensi', 'Riwayat Keluarga / Genetik HT (Ya/Tidak)', 'Merokok (Aktif/Pasif/Tidak)', 'Konsumsi Garam Berlebih (Ya/Tidak)', 'Konsumsi Alkohol (Ya/Tidak)', 'Kurang Aktivitas Fisik (Ya/Tidak)', 'Faktor Stress'],
        ['1', '1234567890123456', 'Jhon Doe', 'Laki-laki', '1980-01-01', '45', exampleJorong1, '2024-07-29', '140', '90', '70', '165', 'Ya', 'Tidak', 'Diabetes, Jantung', 'Mata', '-', 'Ya', 'Aktif', 'Ya', 'Tidak', 'Ya', 'Perekonomian, KDRT']
    ]);
    
    // Sheet 2: Petunjuk
    const wsPetunjuk = XLSX.utils.aoa_to_sheet([
        ['PETUNJUK PENGISIAN TEMPLATE DATA SKRINING'],
        [''],
        ['Kolom NIK: Isi dengan 16 digit NIK KTP warga'],
        ['Kolom Nama: Isi nama lengkap warga'],
        ['Kolom Tanggal Skrining: Format YYYY-MM-DD'],
        ['Kolom Sistolik & Diastolik: Angka tensi darah'],
        ['Kolom BB & TB: Berat Badan (kg) & Tinggi Badan (cm)'],
        ['Kolom Pertanyaan (Merokok, dsb): Isi YA atau TIDAK'],
        ['CATATAN: Jika nama warga belum terdaftar, sistem akan otomatis mendaftarkannya berdasarkan data di baris ini!']
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, 'Template Skrining');
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
    XLSX.writeFile(wb, 'Template_Import_Skrining.xlsx');
};

// (Removed old handleSimpanWarga, replaced with the new window.handleSimpanWarga)

function renderWargaTable() {
    const filterJorong = document.getElementById('filter-jorong')?.value || '';
    const filterGender = document.getElementById('filter-gender')?.value || '';
    const tbody = document.getElementById('warga-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (typeof PatientDB === 'undefined' || typeof ScreeningDB === 'undefined') return;
    
    let patients = PatientDB.getAll();
    
    if (filterJorong && filterJorong !== 'Semua Jorong') {
        patients = patients.filter(p => (p.jorong || '').toLowerCase() === filterJorong.toLowerCase());
    }
    if (filterGender) {
        patients = patients.filter(p => p.jenisKelamin === filterGender);
    }

    const searchQuery = document.getElementById('warga-search')?.value?.toLowerCase() || '';
    if (searchQuery) {
        patients = patients.filter(p => (p.nama || '').toLowerCase().includes(searchQuery) || (p.nik || '').includes(searchQuery));
    }
    
    // Sort descending by id
    patients.sort((a, b) => {
        return (b.id > a.id) ? 1 : -1;
    });

    const totalItems = patients.length;
    window.updatePaginationUI('warga', totalItems);

    const startIdx = (window.statePage['warga'] - 1) * PAGE_SIZE;
    const paginated = patients.slice(startIdx, startIdx + PAGE_SIZE);

    if (paginated.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Tidak ada data warga.</td></tr>';
        return;
    }

    paginated.forEach((p, index) => {
        const tr = document.createElement('tr');
        const globalIndex = startIdx + index + 1;
        
        const screenings = ScreeningDB.getByPatientId(p.id).sort((a, b) => new Date(b.tanggalSkrining) - new Date(a.tanggalSkrining));
        const hasScreening = screenings.length > 0;
        
        let statusBadge = '';
        if (hasScreening) {
            statusBadge = '<span class="status-badge terkontrol">Sudah Diskrining</span>';
        } else {
            statusBadge = '<span class="status-badge" style="background:#e5e7eb; color:#4b5563">Belum</span>';
        }
        
        const jkLabel = p.jenisKelamin === 'female' ? 'P' : 'L';
        
        // Buat string array of objects untuk dikirim ke onclick 
        // (Atau lebih aman simpan data di global/window dan pass ID-nya saja)
        
        // Formatting Umur
        let umurText = `${p.umur || 0} thn`;
        if (typeof p.umurBulan === 'number') {
            const y = Math.floor(p.umurBulan / 12);
            const m = p.umurBulan % 12;
            if (p.umurBulan < 12) {
                umurText = `${m} bln`;
            } else if (m > 0 && y < 6) {
                umurText = `${y} thn ${m} bln`; // Show months for < 6 years
            } else {
                umurText = `${y} thn`;
            }
        }

        let actions = '';
        if (window.currentUser && window.currentUser.role === 'admin' && window.currentUser.jorong !== p.jorong) {
            actions = `
                <button class="btn btn-outline btn-sm" onclick="showInfoWarga('${p.id}')"><i class="ph-bold ph-info"></i> Info</button>
                <span style="color:var(--text-muted); font-size: 0.85rem; margin-left:4px;" title="Beda Jorong"><i class="ph-bold ph-lock"></i></span>
            `;
        } else {
            actions = `
                <button class="btn btn-outline btn-sm" onclick="showInfoWarga('${p.id}')"><i class="ph-bold ph-info"></i> Info</button>
                <button class="btn btn-primary btn-sm" onclick="editWarga('${p.id}')" style="margin-left: 4px;"><i class="ph-bold ph-pencil"></i> Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteWarga('${p.id}', '${p.nama}')" style="margin-left: 4px;"><i class="ph-bold ph-trash"></i> Hapus</button>
            `;
        }

        tr.innerHTML = `
            <td>${globalIndex}</td>
            <td>${p.nik || '-'}</td>
            <td><b>${p.nama}</b></td>
            <td>${umurText}</td>
            <td>${jkLabel}</td>
            <td>${p.jorong || '-'}</td>
            <td>${statusBadge}</td>
            <td style="text-align: center;">
                ${actions}
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Menampilkan modal riwayat
window.showHistory = function(patientId) {
    if (typeof showHistoryModal === 'function') {
        showHistoryModal(patientId);
    }
};

// ===================== KELOLA WARGA LOGIC =====================
window.handleSimpanWarga = function(isEdit = false) {
    const nik = document.getElementById('tw-nik').value;
    const nama = document.getElementById('tw-nama').value;
    const umurThn = parseInt(document.getElementById('tw-umur').value) || 0;
    const umurBln = parseInt(document.getElementById('tw-umurBulan').value) || 0;
    const jk = document.getElementById('tw-jk').value;
    const jorong = document.getElementById('tw-jorong').value;

    if (!nik || !nama) {
        Swal.fire('Peringatan', 'NIK dan Nama wajib diisi!', 'warning');
        return;
    }

    if (nik.length !== 16) {
        Swal.fire('Peringatan', 'NIK harus 16 digit.', 'warning');
        return;
    }

    const patients = PatientDB.getAll();
    if (!isEdit && patients.some(p => p.nik === nik)) {
        Swal.fire('Peringatan', 'Data Warga dengan NIK tersebut sudah ada.', 'warning');
        return;
    }

    const totalBulan = (umurThn * 12) + umurBln;

    PatientDB.add({
        nik: nik,
        nama: nama,
        umur: umurThn,
        umurBulan: totalBulan,
        jenisKelamin: jk,
        jorong: jorong
    });

    document.getElementById('form-tambah-warga').classList.add('hidden');
    document.getElementById('tw-nik').value = '';
    document.getElementById('tw-nama').value = '';
    document.getElementById('tw-umur').value = '';
    document.getElementById('tw-umurBulan').value = '';
    
    // Refresh table & stats
    renderDashboard();
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Berhasil!',
            html: `Data warga <b>${nama}</b> berhasil ditambahkan.`,
            icon: 'success',
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#2563eb'
        });
    } else {
        const alertBox = document.getElementById('import-alert');
        if (alertBox) {
            alertBox.className = 'alert alert-success';
            alertBox.innerHTML = `<strong>Berhasil!</strong> Data warga ${nama} ditambahkan.`;
            alertBox.classList.remove('hidden');
            setTimeout(() => alertBox.classList.add('hidden'), 3000);
        }
    }
};

// ===================== FOLLOW-UP LOGIC =====================

window.switchFollowUpTab = function(tabName) {
    const btnHt = document.getElementById('tab-btn-ht');
    const btnRisk = document.getElementById('tab-btn-risk');
    const contentHt = document.getElementById('tab-content-ht');
    const contentRisk = document.getElementById('tab-content-risk');

    if (tabName === 'ht') {
        btnHt.style.background = 'var(--primary)';
        btnHt.style.color = 'white';
        btnHt.style.border = 'none';
        
        btnRisk.style.background = 'transparent';
        btnRisk.style.color = 'var(--text)';
        btnRisk.style.border = '1px solid var(--border)';
        
        contentHt.classList.remove('hidden');
        contentRisk.classList.add('hidden');
    } else {
        btnRisk.style.background = 'var(--primary)';
        btnRisk.style.color = 'white';
        btnRisk.style.border = 'none';
        
        btnHt.style.background = 'transparent';
        btnHt.style.color = 'var(--text)';
        btnHt.style.border = '1px solid var(--border)';
        
        contentRisk.classList.remove('hidden');
        contentHt.classList.add('hidden');
    }
};

window.renderFollowUpTables = function(filterJorong = '', filterBulan = '', filterGender = '') {
    if (typeof PatientDB === 'undefined' || typeof ScreeningDB === 'undefined') return;

    // Read filter values from DOM if not passed
    if (!filterJorong) filterJorong = document.getElementById('filter-jorong')?.value || '';
    if (!filterBulan) filterBulan = document.getElementById('filter-bulan')?.value || '';
    if (!filterGender) filterGender = document.getElementById('filter-gender')?.value || '';

    // RBAC: Override jorong if regular admin, so Follow-Up only shows their own jorong
    if (window.currentUser && window.currentUser.role === 'admin' && window.currentUser.jorong) {
        filterJorong = window.currentUser.jorong;
    }

    const patients = PatientDB.getAll();
    const screenings = ScreeningDB.getAll();
    
    // Get latest screening per patient
    const latestScreenings = {};
    screenings.forEach(s => {
        if (!latestScreenings[s.patientId] || new Date(s.tanggalSkrining) > new Date(latestScreenings[s.patientId].tanggalSkrining)) {
            latestScreenings[s.patientId] = s;
        }
    });

    let htList = [];
    let riskList = [];
    
    Object.values(latestScreenings).forEach(s => {
        let tgl = s.tanggalSkrining || s.createdAt || s.waktuSkrining;
        if (filterBulan && tgl) {
            if (typeof tgl === 'string' && tgl.includes('/')) {
                const p = tgl.split('/');
                if (p.length === 3 && p[2].length === 4) {
                    tgl = `${p[2]}-${p[1]}-${p[0]}`;
                }
            }
            const isMatch = filterBulan.length === 10 ? tgl.substring(0, 10) === filterBulan : tgl.substring(0, 7) === filterBulan;
            if (!isMatch) return;
        } else if (filterBulan && !tgl) {
            return;
        }
        
        const p = patients.find(pat => pat.id === s.patientId);
        if (!p) return;

        if (filterJorong && filterJorong !== 'Semua Jorong' && (p.jorong || '').toLowerCase() !== filterJorong.toLowerCase()) return;
        if (filterGender && p.jenisKelamin !== filterGender) return;

        const data = {
            id: p.id,
            nama: p.nama,
            jorong: p.jorong,
            statusHT: s.hasil?.statusHT || '-',
            tensi: `${s.sistolik}/${s.diastolik}`,
            riskScore: s.hasil?.riskScore || 0,
            komplikasiList: s.hasil?.komplikasiList || []
        };

        if (data.statusHT === 'Terkontrol' || data.statusHT === 'Tidak Terkontrol') {
            htList.push(data);
        }
        
        // Add everyone to risk list so we can sort them
        riskList.push(data);
    });

    // Sort risk list by riskScore descending
    riskList.sort((a, b) => b.riskScore - a.riskScore);

    // Apply Search
    const searchHt = document.getElementById('fu-ht-search')?.value?.toLowerCase() || '';
    if (searchHt) htList = htList.filter(item => item.nama.toLowerCase().includes(searchHt));
    
    const searchRisk = document.getElementById('fu-risk-search')?.value?.toLowerCase() || '';
    if (searchRisk) riskList = riskList.filter(item => item.nama.toLowerCase().includes(searchRisk));

    // Pagination for HT List
    window.updatePaginationUI('fu-ht', htList.length);
    const startHt = (window.statePage['fu-ht'] - 1) * PAGE_SIZE;
    const paginatedHt = htList.slice(startHt, startHt + PAGE_SIZE);

    // Render HT List
    const tbodyHt = document.getElementById('fu-ht-body');
    if (tbodyHt) {
        tbodyHt.innerHTML = '';
        if (paginatedHt.length === 0) {
            tbodyHt.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tidak ada pasien hipertensi.</td></tr>';
        } else {
            paginatedHt.forEach(item => {
                const badgeClass = item.statusHT === 'Terkontrol' ? 'terkontrol' : 'tidak-terkontrol';
                tbodyHt.innerHTML += `
                    <tr>
                        <td><b>${item.nama}</b></td>
                        <td>${item.jorong || '-'}</td>
                        <td><span class="status-badge ${badgeClass}">${item.statusHT}</span></td>
                        <td>${item.tensi}</td>
                        <td style="text-align: center;">
                            <button class="btn btn-primary btn-sm" onclick="openFollowUpModal('${item.id}')"><i class="ph-bold ph-notebook"></i> Catat Follow-Up</button>
                        </td>
                    </tr>
                `;
            });
        }
    }

    // Pagination for Risk List
    window.updatePaginationUI('fu-risk', riskList.length);
    const startRisk = (window.statePage['fu-risk'] - 1) * PAGE_SIZE;
    const paginatedRisk = riskList.slice(startRisk, startRisk + PAGE_SIZE);

    // Render Risk List
    const tbodyRisk = document.getElementById('fu-risk-body');
    if (tbodyRisk) {
        tbodyRisk.innerHTML = '';
        if (paginatedRisk.length === 0) {
            tbodyRisk.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tidak ada data.</td></tr>';
        } else {
            paginatedRisk.forEach(item => {
                let riskColor = 'normal';
                if (item.riskScore >= 20) riskColor = 'tidak-terkontrol'; // Tinggi
                else if (item.riskScore >= 10) riskColor = 'warning'; // Sedang
                else riskColor = 'terkontrol'; // Rendah

                tbodyRisk.innerHTML += `
                    <tr>
                        <td><b>${item.nama}</b></td>
                        <td>${item.jorong || '-'}</td>
                        <td><span class="status-badge ${riskColor}">${item.riskScore}%</span></td>
                        <td><small>${item.komplikasiList.join(', ') || '-'}</small></td>
                        <td style="text-align: center;">
                            <button class="btn btn-primary btn-sm" onclick="openFollowUpModal('${item.id}')"><i class="ph-bold ph-notebook"></i> Catat Follow-Up</button>
                        </td>
                    </tr>
                `;
            });
        }
    }
};

window.openFollowUpModal = function(patientId) {
    const patient = PatientDB.getById(patientId);
    if (!patient) return;

    document.getElementById('fu-patient-name').textContent = patient.nama;
    document.getElementById('fu-patient-id').value = patient.id;
    document.getElementById('fu-edit-id').value = '';
    document.getElementById('fu-tanggal').value = new Date().toISOString().split('T')[0];
    
    // Clear Q&A container and add one empty row
    const qaContainer = document.getElementById('fu-qa-container');
    qaContainer.innerHTML = '';
    window.addFollowUpQA();
    
    const catatanPetugas = document.getElementById('fu-catatan-petugas');
    if (catatanPetugas) catatanPetugas.value = '';

    const historyContainer = document.getElementById('fu-history-list');
    historyContainer.innerHTML = '';

    const followUps = patient.followUps || [];
    const sortedFUs = followUps.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (sortedFUs.length === 0) {
        historyContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; text-align:center;">Belum ada riwayat follow-up.</p>';
    } else {
        sortedFUs.forEach(fu => {
            const dateStr = new Date(fu.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
            
            let contentHtml = '';
            if (fu.qaList && Array.isArray(fu.qaList)) {
                contentHtml = '<ul style="padding-left:20px; margin:0; margin-bottom:8px;">';
                fu.qaList.forEach(item => {
                    contentHtml += `<li style="margin-bottom:8px;"><b>Q:</b> ${item.q}<br><b>A:</b> ${item.a}</li>`;
                });
                contentHtml += '</ul>';
                if (fu.catatanPetugas) {
                    contentHtml += `<div style="background:var(--bg-hover); padding:8px; border-radius:4px; font-size:0.9rem;"><b>Catatan Petugas:</b><br>${fu.catatanPetugas}</div>`;
                }
            } else {
                contentHtml = fu.catatan || '';
            }

            historyContainer.innerHTML += `
                <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border-left: 4px solid var(--primary); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px;"><i class="ph-bold ph-calendar-blank"></i> ${dateStr}</div>
                        <div style="color: var(--text); font-size: 0.95rem; line-height: 1.5;">${contentHtml}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-warning btn-sm" onclick="editFollowUpRecord('${patient.id}', '${fu.id}')" title="Edit catatan ini" style="padding: 6px 8px;">
                            <i class="ph-bold ph-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteFollowUpRecord('${patient.id}', '${fu.id}')" title="Hapus catatan ini" style="padding: 6px 8px;">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    const modal = document.getElementById('followup-modal');
    modal.classList.remove('hidden');
};

window.deleteFollowUpRecord = async function(patientId, followUpId) {
    const confirmed = await showConfirm(
        'Hapus Catatan Follow-Up',
        'Apakah Anda yakin ingin menghapus catatan follow-up ini?'
    );
    if (confirmed) {
        showLoading('Menghapus catatan...');
        setTimeout(() => {
            try {
                PatientDB.deleteFollowUp(patientId, followUpId);
                showToast('Catatan follow-up berhasil dihapus.', 'danger');
                openFollowUpModal(patientId);
                renderDashboard();
            } catch (e) {
                console.error("Error deleting follow-up:", e);
                showToast("Terjadi kesalahan.", "danger");
            } finally {
                hideLoading();
            }
        }, 300);
    }
};

window.editFollowUpRecord = function(patientId, followUpId) {
    const patient = PatientDB.getById(patientId);
    if (!patient || !patient.followUps) return;

    const fu = patient.followUps.find(f => f.id === followUpId);
    if (!fu) return;

    // Set Edit ID
    document.getElementById('fu-edit-id').value = fu.id;
    document.getElementById('fu-tanggal').value = fu.tanggal;
    
    const catatanPetugas = document.getElementById('fu-catatan-petugas');
    if (catatanPetugas) catatanPetugas.value = fu.catatanPetugas || '';

    // Render Q&A
    const qaContainer = document.getElementById('fu-qa-container');
    qaContainer.innerHTML = '';
    
    if (fu.qaList && fu.qaList.length > 0) {
        fu.qaList.forEach(item => {
            const id = Date.now() + Math.floor(Math.random() * 1000);
            const html = `
                <div id="qa-${id}" style="display: flex; gap: 12px; align-items: flex-start; background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                        <input type="text" class="form-input fu-q-input" value="${item.q}" required>
                        <textarea class="form-input fu-a-input" rows="2" required>${item.a}</textarea>
                    </div>
                    <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('qa-${id}').remove()" style="padding: 8px;" title="Hapus Pertanyaan">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            `;
            qaContainer.insertAdjacentHTML('beforeend', html);
        });
    } else {
        window.addFollowUpQA();
    }
};

window.addFollowUpQA = function() {
    const container = document.getElementById('fu-qa-container');
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const html = `
        <div id="qa-${id}" style="display: flex; gap: 12px; align-items: flex-start; background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                <input type="text" class="form-input fu-q-input" placeholder="Pertanyaan (misal: Apakah bapak sudah mengurangi makan garam?)" required>
                <textarea class="form-input fu-a-input" rows="2" placeholder="Jawaban / Keterangan Nakes..." required></textarea>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('qa-${id}').remove()" style="padding: 8px;" title="Hapus Pertanyaan">
                <i class="ph-bold ph-trash"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
};

window.saveAndPrintFollowUp = function() {
    const patientId = document.getElementById('fu-patient-id').value;
    const editId = document.getElementById('fu-edit-id').value;
    const tanggal = document.getElementById('fu-tanggal').value;
    const qInputs = document.querySelectorAll('.fu-q-input');
    const aInputs = document.querySelectorAll('.fu-a-input');
    const catatanPetugas = document.getElementById('fu-catatan-petugas')?.value || '';

    if (!patientId || !tanggal || qInputs.length === 0) {
        showToast('Mohon isi minimal satu pertanyaan dan jawaban.', 'warning');
        return;
    }

    let qaList = [];
    for(let i = 0; i < qInputs.length; i++) {
        if(qInputs[i].value.trim() && aInputs[i].value.trim()) {
            qaList.push({
                q: qInputs[i].value.trim(),
                a: aInputs[i].value.trim()
            });
        }
    }

    if (qaList.length === 0) {
        showToast('Pastikan pertanyaan dan jawaban tidak kosong.', 'warning');
        return;
    }

    showLoading('Menyimpan & Mencetak...');
    setTimeout(() => {
        // Save to Database
        if (editId) {
            PatientDB.updateFollowUp(patientId, editId, {
                tanggal: tanggal,
                qaList: qaList,
                catatanPetugas: catatanPetugas,
                catatan: 'Wawancara Follow-Up'
            });
        } else {
            PatientDB.addFollowUp(patientId, {
                tanggal: tanggal,
                qaList: qaList,
                catatanPetugas: catatanPetugas,
                catatan: 'Wawancara Follow-Up'
            });
        }

        // Get Patient Data for Doc
        const patient = PatientDB.getById(patientId);
        const screenings = ScreeningDB.getByPatientId(patientId).sort((a,b) => new Date(b.tanggalSkrining) - new Date(a.tanggalSkrining));
        const latestBP = screenings.length > 0 ? `${screenings[0].sistolik}/${screenings[0].diastolik} mmHg` : '-';

        // Generate HTML for Word Document
        const dateStr = new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let qaHtml = '<ol style="font-family: Arial, sans-serif;">';
        qaList.forEach(item => {
            qaHtml += `
                <li style="margin-bottom: 12px;">
                    <p style="margin: 0; font-weight: bold;">Tanya: ${item.q}</p>
                    <p style="margin: 0; margin-top: 4px;">Jawab: ${item.a}</p>
                </li>
            `;
        });
        qaHtml += '</ol>';

        let catatanPetugasHtml = '';
        if (catatanPetugas) {
            catatanPetugasHtml = `
                <div style="margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #4CAF50;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px;">Catatan Tambahan Petugas:</h4>
                    <p style="margin: 0; line-height: 1.5;">${catatanPetugas.replace(/\\n/g, '<br>')}</p>
                </div>
            `;
        }

        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Hasil Follow-Up</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 20px;">HASIL WAWANCARA FOLLOW-UP HIPERTENSI</h2>
                    <h3 style="margin: 5px 0 0 0; font-size: 16px; color: #555;">SiDini-Tensi Nagari Koto Tangah</h3>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <tr><td style="width: 150px; padding: 4px;"><b>Tanggal Follow-up</b></td><td>: ${dateStr}</td></tr>
                    <tr><td style="padding: 4px;"><b>Nama Pasien</b></td><td>: ${patient.nama}</td></tr>
                    <tr><td style="padding: 4px;"><b>NIK</b></td><td>: ${patient.nik || '-'}</td></tr>
                    <tr><td style="padding: 4px;"><b>Jorong</b></td><td>: ${patient.jorong || '-'}</td></tr>
                    <tr><td style="padding: 4px;"><b>Umur / JK</b></td><td>: ${patient.umur} thn / ${patient.jenisKelamin === 'female' ? 'Perempuan' : 'Laki-laki'}</td></tr>
                    <tr><td style="padding: 4px;"><b>Tekanan Darah (Terakhir)</b></td><td>: ${latestBP}</td></tr>
                </table>

                <h4 style="font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Daftar Pertanyaan & Jawaban:</h4>
                ${qaHtml}
                
                ${catatanPetugasHtml}

                <div style="margin-top: 50px; text-align: right;">
                    <p style="margin-bottom: 60px;">Petugas / Nakes,</p>
                    <p>_______________________</p>
                </div>
            </body>
            </html>
        `;

        // Create Blob and Download
        const blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FollowUp_${patient.nama.replace(/\\s+/g, '_')}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        hideLoading();
        showToast('Catatan follow-up disimpan & diunduh!', 'success');
        openFollowUpModal(patientId);
        renderDashboard();
    }, 400);
};
// ===================== KATEGORI MODAL LOGIC =====================
window.showCategoryModal = function(categoryKey, categoryLabel) {
    if (typeof PatientDB === 'undefined') return;

    const currentJorong = document.getElementById('filter-jorong').value;
    let patients = PatientDB.getAll();
    
    if (currentJorong && currentJorong !== 'Semua Jorong') {
        patients = patients.filter(p => p.jorong === currentJorong);
    }

    const filtered = patients.filter(p => {
        const bulan = typeof p.umurBulan === 'number' ? p.umurBulan : (p.umur || 0) * 12;
        switch(categoryKey) {
            case 'bayi': return bulan >= 0 && bulan <= 11;
            case 'baduta': return bulan >= 12 && bulan <= 23;
            case 'balita': return bulan >= 24 && bulan <= 59;
            case 'apras': return bulan >= 60 && bulan <= 72;
            case 'anak': return bulan >= 73 && bulan <= 143;
            case 'remajaAwal': return bulan >= 144 && bulan <= 179;
            case 'remajaAkhir': return bulan >= 180 && bulan <= 227;
            case 'produktif': return bulan >= 228 && bulan <= 539;
            case 'praLansia': return bulan >= 540 && bulan <= 719;
            case 'lansia': return bulan >= 720 && bulan <= 839;
            case 'lansiaResti': return bulan >= 840;
            default: return false;
        }
    });

    document.getElementById('category-modal-title').textContent = categoryLabel;
    
    const tbody = document.getElementById('category-modal-body');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada warga di kategori ini.</td></tr>';
    } else {
        filtered.forEach((p, idx) => {
            let umurText = `${p.umur || 0} thn`;
            if (typeof p.umurBulan === 'number') {
                const y = Math.floor(p.umurBulan / 12);
                const m = p.umurBulan % 12;
                if (p.umurBulan < 12) umurText = `${m} bln`;
                else if (m > 0 && y < 6) umurText = `${y} thn ${m} bln`;
                else umurText = `${y} thn`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b>${p.nama}</b><br><small style="color:var(--text-muted)">NIK: ${p.nik}</small></td>
                    <td>${p.jorong || '-'}</td>
                    <td>${umurText}</td>
                </tr>
            `;
        });
    }

    document.getElementById('category-modal').classList.remove('hidden');
};

// ===================== PAGINATION HELPERS =====================
window.updatePaginationUI = function(tableId, totalItems) {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    const currentPage = window.statePage[tableId];
    
    const infoEl = document.getElementById(`${tableId}-page-info`);
    if (infoEl) {
        infoEl.textContent = `Halaman ${currentPage} dari ${totalPages} (Total: ${totalItems} data)`;
    }

    // Controls wrapper is the parent of btn-group
    const controlsDiv = document.querySelector(`#${tableId}-page-info`)?.parentElement;
    if (controlsDiv) {
        const btns = controlsDiv.querySelectorAll('.btn');
        if (btns.length >= 2) {
            btns[0].disabled = currentPage <= 1; // Prev
            btns[1].disabled = currentPage >= totalPages; // Next
        }
    }
};

window.nextPage = function(tableId) {
    window.statePage[tableId]++;
    if(tableId === 'warga') renderWargaTable();
    else if(tableId === 'skrining') renderTable(document.getElementById('filter-jorong').value, document.getElementById('table-search').value, document.getElementById('filter-bulan')?.value || '', document.getElementById('filter-gender')?.value || '');
    else if(tableId === 'fu-ht' || tableId === 'fu-risk') renderFollowUpTables();
};

window.prevPage = function(tableId) {
    if (window.statePage[tableId] > 1) {
        window.statePage[tableId]--;
        if(tableId === 'warga') renderWargaTable();
        else if(tableId === 'skrining') renderTable(document.getElementById('filter-jorong').value, document.getElementById('table-search').value, document.getElementById('filter-bulan')?.value || '', document.getElementById('filter-gender')?.value || '');
        else if(tableId === 'fu-ht' || tableId === 'fu-risk') renderFollowUpTables();
    }
};

window.deleteWarga = async function(patientId, nama) {
    const confirmed = await showConfirm(
        'Hapus Data Warga',
        `Apakah Anda yakin ingin menghapus data warga <b>"${nama}"</b>?<br>Semua riwayat skrining dan follow-up milik warga ini juga akan dihapus secara permanen.`
    );
    if (confirmed) {
        showLoading('Menghapus data...');
        setTimeout(() => {
            try {
                // Kumpulkan ID skrining SEBELUM dihapus
                const screeningIds = (typeof ScreeningDB !== 'undefined')
                    ? ScreeningDB.getAll().filter(s => s.patientId === patientId).map(s => s.id)
                    : [];

                // Hapus dari memory/localStorage (skip individual Firestore sync)
                PatientDB.delete(patientId, true);
                ScreeningDB.deleteByPatientId(patientId, true);

                // Timpa Firestore dengan batch tunggal (mengganti panggilan individual yg crash)
                FirestoreSync.deleteWargaWithScreenings(patientId, screeningIds);

                showToast(`Data warga "${nama}" berhasil dihapus.`, 'danger');
                if (typeof renderDashboard === 'function') renderDashboard();
            } catch (e) {
                console.error("Error deleting warga:", e);
                showToast("Error: " + (e.message || "Kesalahan tak dikenal"), "danger", 6000);
            } finally {
                hideLoading();
            }
        }, 400);
    }
};

window.handleSimpanWarga = function() {
    const nik = document.getElementById('tw-nik')?.value || '';
    const nama = document.getElementById('tw-nama')?.value || '';
    const tanggalLahir = document.getElementById('tw-tanggalLahir')?.value || '';
    const jk = document.getElementById('tw-jk')?.value || 'male';
    const jorong = document.getElementById('tw-jorong')?.value || '';
    const umurVal = parseInt(document.getElementById('tw-umur')?.value) || 0;
    const umurUnit = document.getElementById('tw-umurUnit')?.value || 'tahun';

    if (!nik || !nama || !jorong) {
        showToast('Harap isi NIK, Nama, dan Jorong terlebih dahulu.', 'warning');
        return;
    }

    const form = document.getElementById('form-tambah-warga');
    const editId = form ? form.getAttribute('data-edit-id') : null;

    // Check if NIK already exists (only for new patient or if NIK changed)
    const existingPatient = PatientDB.getByNIK(nik);
    if (existingPatient) {
        if (!editId || existingPatient.id !== editId) {
            Swal.fire('Gagal Menyimpan', `Warga dengan NIK <b>${nik}</b> sudah terdaftar di sistem atas nama <b>${existingPatient.nama}</b>.`, 'error');
            return;
        }
    }

    const isBulan = umurUnit === 'bulan';
    const umurTahun = isBulan ? Math.floor(umurVal / 12) : umurVal;
    const totalBulan = isBulan ? umurVal : (umurVal * 12);

    const data = {
        nik: nik,
        nama: nama,
        tanggalLahir: tanggalLahir,
        umur: umurTahun,
        umurBulan: totalBulan,
        jenisKelamin: jk,
        jorong: jorong
    };

    showLoading(editId ? 'Memperbarui data...' : 'Menyimpan data...');

    setTimeout(() => {
        try {
            if (editId) {
                PatientDB.update(editId, data);
                showToast(`Data warga <b>${nama}</b> berhasil diperbarui!`, 'success');
            } else {
                PatientDB.add(data);
                showToast(`Data warga <b>${nama}</b> berhasil ditambahkan!`, 'success');
            }

            // Reset and hide form
            if (form) {
                form.removeAttribute('data-edit-id');
                form.classList.add('hidden');
                
                const titleEl = form.querySelector('h4');
                if (titleEl) titleEl.innerHTML = '<i class="ph-fill ph-user-plus" style="color:var(--primary)"></i> Tambah Data Warga Baru';
                
                document.getElementById('tw-nik').value = '';
                document.getElementById('tw-nama').value = '';
                if (document.getElementById('tw-tanggalLahir')) document.getElementById('tw-tanggalLahir').value = '';
                document.getElementById('tw-umur').value = '';
                if (document.getElementById('tw-umurUnit')) document.getElementById('tw-umurUnit').value = 'tahun';
                if (document.getElementById('tw-umurDisplay')) document.getElementById('tw-umurDisplay').value = '';
                document.getElementById('tw-jorong').value = '';
            }

            if (typeof renderDashboard === 'function') renderDashboard();
        } catch (e) {
            console.error("Error saving patient:", e);
            Swal.fire('Terjadi Kesalahan', 'Gagal menyimpan data warga.', 'error');
        } finally {
            hideLoading();
        }
    }, 500);
};
window.editWarga = function(patientId) {
    const patient = PatientDB.getById(patientId);
    if (!patient) return;

    // Populate the form fields
    const nikInput = document.getElementById('tw-nik');
    const namaInput = document.getElementById('tw-nama');
    const tanggalLahirInput = document.getElementById('tw-tanggalLahir');
    const jkInput = document.getElementById('tw-jk');
    const jorongInput = document.getElementById('tw-jorong');
    const umurInput = document.getElementById('tw-umur');
    const umurUnitInput = document.getElementById('tw-umurUnit');
    const umurDisplayInput = document.getElementById('tw-umurDisplay');

    if (nikInput) nikInput.value = patient.nik || '';
    if (namaInput) namaInput.value = patient.nama || '';
    if (tanggalLahirInput) {
        if (patient.tanggalLahir) tanggalLahirInput.value = patient.tanggalLahir.split('T')[0];
        else tanggalLahirInput.value = '';
    }
    if (jkInput) jkInput.value = patient.jenisKelamin || 'male';
    if (jorongInput) jorongInput.value = patient.jorong || '';
    
    if (umurInput && umurUnitInput) {
        if (typeof patient.umurBulan === 'number' && patient.umurBulan < 12) {
            umurInput.value = patient.umurBulan;
            umurUnitInput.value = 'bulan';
            if (umurDisplayInput) umurDisplayInput.value = patient.umurBulan + ' Bulan';
        } else {
            umurInput.value = patient.umur || '';
            umurUnitInput.value = 'tahun';
            if (umurDisplayInput) umurDisplayInput.value = (patient.umur || '') + ' Tahun';
        }
    }

    // Set the data attribute so we know we are editing instead of adding new
    const form = document.getElementById('form-tambah-warga');
    if (form) {
        form.setAttribute('data-edit-id', patient.id);
        form.classList.remove('hidden');
        // Change title text
        const titleEl = form.querySelector('h4');
        if (titleEl) titleEl.innerHTML = '<i class="ph-fill ph-pencil" style="color:var(--primary)"></i> Edit Data Warga';
    }
};

// ===================== CLICK BACKDROP TO CLOSE MODALS =====================
document.addEventListener('click', function(e) {
    const modals = ['history-modal', 'followup-modal', 'category-modal', 'success-modal'];
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});

// ===================== EXPORT EXCEL BARU =====================
window.exportWarga = function() {
    if (typeof XLSX === 'undefined' || typeof PatientDB === 'undefined') return;
    const patients = PatientDB.getAll();
    if (patients.length === 0) {
        showToast('Tidak ada data warga untuk diexport', 'warning');
        return;
    }

    const exportData = patients.map((p, i) => ({
        'No': i + 1,
        'NIK': p.nik || '-',
        'Nama': p.nama || '-',
        'Jorong': p.jorong || '-',
        'Tanggal Lahir': p.tanggalLahir ? new Date(p.tanggalLahir).toLocaleDateString('id-ID') : '-',
        'Umur': (p.umurBulan ? Math.floor(p.umurBulan / 12) + ' Tahun ' + (p.umurBulan % 12) + ' Bulan' : (p.umur || 0) + ' Tahun'),
        'Jenis Kelamin': p.jenisKelamin === 'female' ? 'Perempuan' : 'Laki-laki',
        'Tanggal Ditambahkan': p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Warga');
    XLSX.writeFile(wb, 'Data_Warga_KotoTangah.xlsx');
    showToast('Berhasil mengekspor Data Warga', 'success');
};

window.exportHT = function() {
    if (typeof XLSX === 'undefined' || typeof PatientDB === 'undefined') return;
    let hts = [];
    const filterJorong = document.getElementById('filter-jorong')?.value || '';
    let patients = PatientDB.getAll();
    if (filterJorong && filterJorong !== 'Semua Jorong') {
        patients = patients.filter(p => (p.jorong || '').toLowerCase() === filterJorong.toLowerCase());
    }
    patients.forEach(p => {
        const latest = ScreeningDB.getLatestByPatient(p.id);
        if (latest && latest.hasil && (latest.hasil.statusHT === 'Tidak Terkontrol' || latest.hasil.statusHT === 'Terkontrol' || (latest.riwayatHT && latest.riwayatHT.toLowerCase() === 'ya'))) {
            hts.push({ patient: p, screening: latest });
        }
    });

    if (hts.length === 0) {
        showToast('Tidak ada data prioritas HT untuk diexport', 'warning');
        return;
    }

    // Sort by name
    hts.sort((a, b) => a.patient.nama.localeCompare(b.patient.nama));

    const exportData = hts.map((item, i) => ({
        'No': i + 1,
        'Nama': item.patient.nama || '-',
        'Jorong': item.patient.jorong || '-',
        'Umur (Tahun)': item.patient.umur || 0,
        'Status HT': item.screening.hasil?.statusHT || '-',
        'Tensi Terakhir': item.screening.sistolik + '/' + item.screening.diastolik,
        'Riwayat HT': item.screening.riwayatHT || '-',
        'Minum Obat': item.screening.minumObatHT || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prioritas HT');
    XLSX.writeFile(wb, 'Prioritas_HT_KotoTangah.xlsx');
    showToast('Berhasil mengekspor Prioritas HT', 'success');
};

window.exportRisk = function() {
    if (typeof XLSX === 'undefined' || typeof PatientDB === 'undefined') return;
    let risks = [];
    const filterJorong = document.getElementById('filter-jorong')?.value || '';
    let patients = PatientDB.getAll();
    if (filterJorong && filterJorong !== 'Semua Jorong') {
        patients = patients.filter(p => (p.jorong || '').toLowerCase() === filterJorong.toLowerCase());
    }
    patients.forEach(p => {
        const latest = ScreeningDB.getLatestByPatient(p.id);
        if (latest && latest.hasil && latest.hasil.riskScore >= 5) { // Sedang ke atas
            risks.push({ patient: p, screening: latest });
        }
    });

    if (risks.length === 0) {
        showToast('Tidak ada data risiko tinggi untuk diexport', 'warning');
        return;
    }

    // Sort by risk score desc
    risks.sort((a, b) => b.screening.hasil.riskScore - a.screening.hasil.riskScore);

    const exportData = risks.map((item, i) => {
        let cvdRisk = '-';
        const s = item.screening;
        if (s.hasil?.komplikasi && s.hasil.komplikasi.length > 0) {
            if (typeof s.hasil.komplikasi[0] === 'object' && s.hasil.komplikasi[0].level) {
                cvdRisk = s.hasil.komplikasi.map(k => k.level).join(', ');
            } else if (typeof s.hasil.komplikasi[0] === 'string') {
                cvdRisk = s.hasil.komplikasi.join(', ');
            }
        }
        if (s.hasil?.komplikasiList && s.hasil.komplikasiList.length > 0 && cvdRisk === '-') {
            cvdRisk = s.hasil.komplikasiList.join(', ');
        }

        return {
            'No': i + 1,
            'Nama': item.patient.nama || '-',
            'Jorong': item.patient.jorong || '-',
            'Umur (Tahun)': item.patient.umur || 0,
            'Skor Risiko': item.screening.hasil.riskScore,
            'Tensi Terakhir': item.screening.sistolik + '/' + item.screening.diastolik,
            'Kategori IMT': item.screening.hasil?.imt?.kategori || '-',
            'Risiko Kardiovaskular': cvdRisk
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Risiko Tinggi');
    XLSX.writeFile(wb, 'Prioritas_Risiko_KotoTangah.xlsx');
    showToast('Berhasil mengekspor Prioritas Risiko', 'success');
};

// AUTO-CALCULATE AGE FOR "TAMBAH WARGA" MODAL
document.addEventListener('DOMContentLoaded', () => {
    const twTanggalLahir = document.getElementById('tw-tanggalLahir');
    const twUmur = document.getElementById('tw-umur');
    const twUmurUnit = document.getElementById('tw-umurUnit');
    const twUmurDisplay = document.getElementById('tw-umurDisplay');
    
    if (twTanggalLahir) {
        twTanggalLahir.addEventListener('change', () => {
            const dob = new Date(twTanggalLahir.value);
            if (!isNaN(dob.getTime())) {
                const today = new Date();
                let ageYears = today.getFullYear() - dob.getFullYear();
                let ageMonths = today.getMonth() - dob.getMonth();
                
                if (ageMonths < 0 || (ageMonths === 0 && today.getDate() < dob.getDate())) {
                    ageYears--;
                    ageMonths += 12;
                }
                
                if (ageYears < 1) {
                    if (twUmur) twUmur.value = ageMonths;
                    if (twUmurUnit) twUmurUnit.value = 'bulan';
                    if (twUmurDisplay) twUmurDisplay.value = ageMonths + ' Bulan';
                } else {
                    if (twUmur) twUmur.value = ageYears;
                    if (twUmurUnit) twUmurUnit.value = 'tahun';
                    if (twUmurDisplay) twUmurDisplay.value = ageYears + ' Tahun';
                }
            }
        });
    }
});

// HAPUS SELURUH DATA SISTEM
window.handleResetData = function() {
    if (window.currentUser && window.currentUser.role !== 'superadmin') {
        Swal.fire('Akses Ditolak', 'Hanya Super Admin yang dapat menghapus seluruh data.', 'error');
        return;
    }

    Swal.fire({
        title: 'PERINGATAN KRITIKAL!',
        html: `Anda yakin ingin menghapus <b>SELURUH DATA Warga, Riwayat Skrining, dan Follow-Up</b> secara permanen?<br><br><span style="color:red">Data yang dihapus tidak dapat dikembalikan.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus Semua!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            if (typeof PatientDB !== 'undefined') PatientDB.clear();
            if (typeof ScreeningDB !== 'undefined') ScreeningDB.clear();
            if (typeof FirestoreSync !== 'undefined' && FirestoreSync.db) {
                FirestoreSync.clearCollection('patients');
                FirestoreSync.clearCollection('screenings');
                FirestoreSync.clearCollection('followUps');
            }
            localStorage.clear();
            
            Swal.fire(
                'Terhapus!',
                'Seluruh data sistem berhasil dikosongkan.',
                'success'
            ).then(() => {
                location.reload();
            });
        }
    });
};

// ===================== TREN KASUS HIPERTENSI PER BULAN =====================
function renderTrenKasus(filterJorong = '', filterGender = '') {
    const canvas = document.getElementById('chart-tren-kasus');
    if (!canvas) return;

    if (trenKasusChartInstance) {
        trenKasusChartInstance.destroy();
        trenKasusChartInstance = null;
    }

    let allScreenings = ScreeningDB.getAll();
    
    // Apply filters
    if (filterJorong && filterJorong !== '' && filterJorong !== 'Semua Jorong') {
        allScreenings = allScreenings.filter(s => (s.jorong || '').toLowerCase() === filterJorong.toLowerCase());
    }
    if (filterGender) {
        allScreenings = allScreenings.filter(s => {
            const patient = PatientDB.getById(s.patientId) || {};
            return (patient.jenisKelamin || s.jenisKelamin || '') === filterGender;
        });
    }

    // Group by month
    const monthData = {};
    allScreenings.forEach(s => {
        const monthKey = (s.tanggalSkrining || s.createdAt || '').substring(0, 7);
        if (!monthKey || monthKey.length < 7) return;

        if (!monthData[monthKey]) {
            monthData[monthKey] = { total: 0, baru: 0, lama: 0 };
        }

        const klasTD = s.hasil?.klasifikasiTD || '';
        const isHT = klasTD.includes('Hipertensi');
        
        if (isHT) {
            monthData[monthKey].total++;
            const kategori = s.hasil?.kategoriKasus || '';
            if (kategori === 'Baru') {
                monthData[monthKey].baru++;
            } else if (kategori === 'Lama') {
                monthData[monthKey].lama++;
            } else {
                // Legacy data without kategoriKasus: use riwayatHT
                if (s.riwayatHT === 'ya') {
                    monthData[monthKey].lama++;
                } else {
                    monthData[monthKey].baru++;
                }
            }
        }
    });

    // Sort months
    const sortedMonths = Object.keys(monthData).sort();
    
    if (sortedMonths.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Outfit, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('Belum ada data kasus hipertensi', canvas.width / 2, canvas.height / 2);
        return;
    }

    const labels = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${monthNames[parseInt(mo) - 1]} ${y}`;
    });

    trenKasusChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Kasus HT',
                    data: sortedMonths.map(m => monthData[m].total),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 2.5
                },
                {
                    label: 'Kasus Baru',
                    data: sortedMonths.map(m => monthData[m].baru),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    borderDash: [5, 3]
                },
                {
                    label: 'Kasus Lama',
                    data: sortedMonths.map(m => monthData[m].lama),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Outfit', size: 13 }, padding: 20, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Outfit', size: 13 },
                    bodyFont: { family: 'Outfit', size: 12 },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { family: 'Outfit' } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { font: { family: 'Outfit' } },
                    grid: { display: false }
                }
            }
        }
    });
}

window.showInfoWarga = function(patientId) {
    if (typeof PatientDB === 'undefined' || typeof ScreeningDB === 'undefined') return;

    const patient = PatientDB.getById(patientId);
    if (!patient) return;

    const screenings = ScreeningDB.getByPatientId(patientId).sort((a, b) => new Date(b.tanggalSkrining) - new Date(a.tanggalSkrining));
    const latestScreening = screenings[0] || null;

    let riwayatHtml = '';
    if (screenings.length === 0) {
        riwayatHtml = '<p style="color: var(--text-muted); font-style: italic;">Belum ada riwayat skrining.</p>';
    } else {
        riwayatHtml = '<ul style="padding-left: 20px; margin-top: 8px;">';
        screenings.forEach(s => {
            const tgl = new Date(s.tanggalSkrining).toLocaleDateString('id-ID');
            riwayatHtml += `<li><b>${tgl}</b>: TD ${s.sistolik}/${s.diastolik} mmHg &mdash; <span class="status-badge ${s.hasil?.statusHT === 'Terkontrol' ? 'terkontrol' : (s.hasil?.statusHT === 'Tidak Terkontrol' ? 'tidak-terkontrol' : (s.hasil?.statusHT === 'Bukan Hipertensi' ? 'normal' : ''))}">${s.hasil?.statusHT || '-'}</span></li>`;
        });
        riwayatHtml += '</ul>';
    }

    const komorbidStr = Array.isArray(latestScreening?.komorbiditas) ? latestScreening.komorbiditas.join(', ') : (latestScreening?.komorbiditas || '-');
    const obatStr = latestScreening?.obatAntihipertensi || '-';
    const penyertaStr = latestScreening?.penyakitPenyerta || '-';

    const html = `
        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px;">
                <h4 style="margin-bottom: 12px; color: var(--primary);"><i class="ph-fill ph-user"></i> Identitas Diri</h4>
                <table style="width: 100%; font-size: 0.95rem;">
                    <tr><td style="width: 120px; padding: 4px 0; color: var(--text-secondary);">Nama</td><td>: <b>${patient.nama}</b></td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">NIK</td><td>: ${patient.nik || '-'}</td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">Jenis Kelamin</td><td>: ${patient.jenisKelamin === 'female' ? 'Perempuan' : 'Laki-laki'}</td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">Umur</td><td>: ${patient.umur || 0} Tahun</td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">Alamat</td><td>: ${patient.alamat || '-'}</td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">Jorong</td><td>: ${patient.jorong || '-'}</td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">No. HP</td><td>: ${patient.noHp || '-'}</td></tr>
                </table>
            </div>

            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px;">
                <h4 style="margin-bottom: 12px; color: var(--primary);"><i class="ph-fill ph-heartbeat"></i> Riwayat Medis Terakhir</h4>
                <table style="width: 100%; font-size: 0.95rem;">
                    <tr><td style="width: 150px; padding: 4px 0; color: var(--text-secondary);">Komorbiditas</td><td>: <b>${komorbidStr || '-'}</b></td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">Penyakit Lainnya</td><td>: ${penyertaStr}</td></tr>
                    <tr><td style="padding: 4px 0; color: var(--text-secondary);">Obat Antihipertensi</td><td>: <b style="color: var(--warning);">${obatStr}</b></td></tr>
                </table>
            </div>

            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px;">
                <h4 style="margin-bottom: 12px; color: var(--primary);"><i class="ph-fill ph-clock-counter-clockwise"></i> Riwayat Skrining</h4>
                <div style="font-size: 0.95rem; max-height: 150px; overflow-y: auto;">
                    ${riwayatHtml}
                </div>
            </div>
        </div>
    `;

    document.getElementById('info-warga-body').innerHTML = html;
    document.getElementById('info-warga-modal').classList.remove('hidden');
};

window.showListModal = function(type) {
    if (typeof ScreeningDB === 'undefined' || typeof PatientDB === 'undefined') return;

    const currentJorong = document.getElementById('filter-jorong')?.value || '';
    const currentBulan = document.getElementById('filter-bulan')?.value || '';
    const currentGender = document.getElementById('filter-gender')?.value || '';

    let allScreenings = ScreeningDB.getAll();

    // Apply jorong filter
    if (currentJorong && currentJorong !== '' && currentJorong !== 'Semua Jorong') {
        allScreenings = allScreenings.filter(s => s.jorong === currentJorong);
    }

    // Apply bulan filter
    if (currentBulan) {
        allScreenings = allScreenings.filter(s => {
            let tgl = s.tanggalSkrining || s.tanggal || s.createdAt || '';
            if (typeof tgl === 'string' && tgl.includes('/')) {
                const p = tgl.split('/');
                if (p.length === 3 && p[2].length === 4) {
                    tgl = `${p[2]}-${p[1]}-${p[0]}`;
                }
            }
            return tgl.startsWith(currentBulan);
        });
    }

    // Apply gender filter
    if (currentGender) {
        allScreenings = allScreenings.filter(s => s.jenisKelamin === currentGender);
    }

    // Get latest screening per patient (dedup)
    const latestByPatient = {};
    allScreenings.forEach(s => {
        const pid = s.patientId;
        if (!latestByPatient[pid] || new Date(s.tanggalSkrining || s.createdAt) > new Date(latestByPatient[pid].tanggalSkrining || latestByPatient[pid].createdAt)) {
            latestByPatient[pid] = s;
        }
    });
    let filtered = Object.values(latestByPatient);

    // Filter by type
    let title = 'Daftar Warga';
    let iconClass = 'ph-fill ph-users';

    if (type === 'all') {
        title = 'Semua Warga Yang Diskrining';
        iconClass = 'ph-fill ph-users';
    } else if (type === 'sehat') {
        title = 'Daftar Warga Bukan Hipertensi';
        iconClass = 'ph-fill ph-heart';
        filtered = filtered.filter(s => s.hasil?.statusHT === 'Bukan Hipertensi');
    } else if (type === 'terkontrol') {
        title = 'Daftar Warga HT Terkontrol';
        iconClass = 'ph-fill ph-check-circle';
        filtered = filtered.filter(s => s.hasil?.statusHT === 'Terkontrol');
    } else if (type === 'tidak-terkontrol') {
        title = 'Daftar Warga HT Tidak Terkontrol';
        iconClass = 'ph-fill ph-warning-circle';
        filtered = filtered.filter(s => s.hasil?.statusHT === 'Tidak Terkontrol');
    }

    // Sort by name
    filtered.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    // Store for search filtering
    window._listModalData = filtered;

    document.getElementById('list-modal-title').textContent = title;
    const iconEl = document.getElementById('list-modal-icon');
    if (iconEl) iconEl.className = iconClass;

    // Clear search input
    const searchInput = document.getElementById('list-modal-search');
    if (searchInput) searchInput.value = '';

    // Render
    renderListModalRows(filtered);

    document.getElementById('list-modal').classList.remove('hidden');
};

function renderListModalRows(data) {
    const tbody = document.getElementById('list-modal-body');
    tbody.innerHTML = '';
    document.getElementById('list-modal-count').textContent = `Total: ${data.length} orang`;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 24px;">Tidak ada data ditemukan.</td></tr>';
        return;
    }

    data.forEach((s, i) => {
        const patient = PatientDB.getById(s.patientId) || {};
        const jk = (s.jenisKelamin === 'female' || patient.jenisKelamin === 'female') ? 'P' : 'L';
        const statusHT = s.hasil?.statusHT || '-';
        let badgeCls = '';
        if (statusHT === 'Bukan Hipertensi') badgeCls = 'normal';
        else if (statusHT === 'Terkontrol') badgeCls = 'terkontrol';
        else if (statusHT === 'Tidak Terkontrol') badgeCls = 'tidak-terkontrol';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td><b>${s.nama || patient.nama || '-'}</b></td>
            <td style="font-size:0.85rem">${patient.nik || s.nik || '-'}</td>
            <td>${s.umur || patient.umur || '-'} thn</td>
            <td>${jk}</td>
            <td>${s.jorong || patient.jorong || '-'}</td>
            <td>${s.sistolik || '-'}/${s.diastolik || '-'}</td>
            <td><span class="status-badge ${badgeCls}">${statusHT}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterListModal = function() {
    const query = (document.getElementById('list-modal-search')?.value || '').toLowerCase().trim();
    if (!window._listModalData) return;

    if (!query) {
        renderListModalRows(window._listModalData);
        return;
    }

    const result = window._listModalData.filter(s => {
        const patient = PatientDB.getById(s.patientId) || {};
        const nama = (s.nama || patient.nama || '').toLowerCase();
        const nik = (patient.nik || s.nik || '').toLowerCase();
        const jorong = (s.jorong || patient.jorong || '').toLowerCase();
        return nama.includes(query) || nik.includes(query) || jorong.includes(query);
    });

    renderListModalRows(result);
};
