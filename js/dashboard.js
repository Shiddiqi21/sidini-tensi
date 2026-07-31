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
            if (result.isConfirmed) {
                return true;
            } else {
                throw new Error('Cancel');
            }
        });
    } else {
        return new Promise((resolve, reject) => {
            if (confirm(`${title}\n\n${message.replace(/<[^>]*>?/gm, '')}`)) resolve();
            else reject();
        });
    }
};

window.renderJorongDropdowns = function() {
    if (typeof window.getAllJorongs !== 'function') return;
    const jorongs = window.getAllJorongs();
    
    const filterSelect = document.getElementById('filter-jorong');
    if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Semua Jorong</option>';
        jorongs.forEach(j => {
            const opt = document.createElement('option');
            opt.value = j; opt.textContent = j;
            filterSelect.appendChild(opt);
        });
        if (currentVal && (jorongs.includes(currentVal) || currentVal === '')) filterSelect.value = currentVal;
    }

    const jorongSelects = [document.getElementById('jorong'), document.getElementById('tw-jorong')];
    jorongSelects.forEach(select => {
        if (select) {
            const currentVal = select.value;
            select.innerHTML = '<option value="" disabled selected>Pilih Jorong...</option>';
            jorongs.forEach(j => {
                const opt = document.createElement('option');
                opt.value = j; opt.textContent = j;
                select.appendChild(opt);
            });
            if (currentVal && jorongs.includes(currentVal)) select.value = currentVal;
        }
    });
};

window.promptTambahJorong = function() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Tambah Jorong Baru',
            input: 'text',
            inputPlaceholder: 'Masukkan nama jorong baru...',
            showCancelButton: true,
            confirmButtonText: 'Tambah',
            cancelButtonText: 'Batal',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Nama jorong tidak boleh kosong!'
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                try {
                    const nama = result.value.trim();
                    if (typeof window.addCustomJorong === 'function') {
                        window.addCustomJorong(nama);
                        window.renderJorongDropdowns();
                        const filter = document.getElementById('filter-jorong');
                        if (filter) {
                            filter.value = nama;
                            window.statePage = { 'warga': 1, 'skrining': 1, 'fu-ht': 1, 'fu-risk': 1 };
                            if (typeof renderDashboard === 'function') renderDashboard();
                        }
                        Swal.fire('Berhasil!', `Jorong "${nama}" telah ditambahkan.`, 'success');
                    } else {
                        Swal.fire('Error', 'Fungsi sistem tidak ditemukan. Harap refresh halaman (Ctrl+F5).', 'error');
                    }
                } catch (e) {
                    Swal.fire('Kesalahan Sistem', `Gagal menambahkan jorong: ${e.message}`, 'error');
                    console.error("Error in promptTambahJorong:", e);
                }
            }
        });
    } else {
        const nama = prompt('Masukkan nama jorong baru:');
        if (nama && nama.trim() !== '') {
            if (typeof window.addCustomJorong === 'function') {
                window.addCustomJorong(nama);
                window.renderJorongDropdowns();
                const filter = document.getElementById('filter-jorong');
                if (filter) {
                    filter.value = nama.trim();
                    window.statePage = { 'warga': 1, 'skrining': 1, 'fu-ht': 1, 'fu-risk': 1 };
                    if (typeof renderDashboard === 'function') renderDashboard();
                }
                showToast('Jorong berhasil ditambahkan', 'success');
            }
        }
    }
};

let statusChartInstance = null;
let risikoChartInstance = null;
let demografiChartInstance = null;

// Pagination & Search State
const PAGE_SIZE = 10;
window.statePage = {
    'warga': 1,
    'skrining': 1,
    'fu-ht': 1,
    'fu-risk': 1
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.renderJorongDropdowns === 'function') window.renderJorongDropdowns();

    // Helper to safely add event listener (element might not exist)
    function safeOn(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    }

    // === Set up ALL event listeners FIRST (before any rendering) ===
    safeOn('filter-jorong', 'change', () => {
        window.statePage = { 'warga': 1, 'skrining': 1, 'fu-ht': 1, 'fu-risk': 1 };
        renderDashboard();
    });

    safeOn('table-search', 'input', (e) => {
        window.statePage['skrining'] = 1;
        const jorong = document.getElementById('filter-jorong');
        renderTable(jorong ? jorong.value : '', e.target.value);
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

    const globalStats = ScreeningDB.getStats();
    const currentJorong = document.getElementById('filter-jorong').value;
    const currentSearch = document.getElementById('table-search').value;

    let statsToUse = globalStats;
    if (currentJorong && currentJorong !== '' && globalStats.perJorong && globalStats.perJorong[currentJorong]) {
        statsToUse = globalStats.perJorong[currentJorong];
    }

    // Helper to calculate percentage safely
    const calcPercent = (val, total) => {
        if (total === 0) return ' (0%)';
        return ` (${(val / total * 100).toFixed(0)}%)`;
    };

    const total = statsToUse.totalScreened !== undefined ? statsToUse.totalScreened : (statsToUse.total || 0);
    
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
    
    renderTable(currentJorong, currentSearch);
    
    // NEW render warga table
    renderWargaTable(currentJorong);

    // NEW render follow-up tables
    if (typeof renderFollowUpTables === 'function') {
        renderFollowUpTables();
    }

    // NEW render Demografi
    if (typeof PatientDB !== 'undefined' && typeof PatientDB.getDemographicsStats === 'function') {
        const filterStr = currentJorong === 'Semua Jorong' ? '' : currentJorong;
        const demoStats = PatientDB.getDemographicsStats(filterStr);
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
            labels: ['Sehat / Normal', 'HT Terkontrol', 'HT Tidak Terkontrol'],
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

function renderTable(filterJorong = '', searchQuery = '') {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    if (typeof ScreeningDB === 'undefined' || typeof PatientDB === 'undefined') return;

    // We only want to show patients who have at least one screening
    const allScreenings = ScreeningDB.getAll();
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
    if (filterJorong && filterJorong !== 'Semua Jorong') screenings = screenings.filter(s => s.jorong === filterJorong);
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

        const totalSkrining = allScreenings.filter(sc => sc.patientId === s.patientId).length;

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
}

function showHistoryModal(patientId) {
    const modal = document.getElementById('history-modal');
    const tbody = document.getElementById('modal-history-body');
    const nameSpan = document.getElementById('modal-patient-name');
    
    const patient = PatientDB.getById(patientId);
    if(patient) nameSpan.textContent = patient.nama;

    let history = ScreeningDB.getAll().filter(s => s.patientId === patientId);
    
    // Sort oldest first to calculate index
    history.sort((a, b) => new Date(a.tanggalSkrining) - new Date(b.tanggalSkrining));
    history.forEach((s, idx) => { s._ke = idx + 1; });
    
    // Sort newest first for display
    history.sort((a, b) => new Date(b.tanggalSkrining) - new Date(a.tanggalSkrining));

    tbody.innerHTML = '';
    
    history.forEach(s => {
        const tr = document.createElement('tr');
        const dateStr = s.tanggalSkrining ? new Date(s.tanggalSkrining).toLocaleDateString('id-ID') : '-';
        
        // IMT Badge
        const imtVal = s.hasil?.imt?.nilai || '-';
        const imtKat = (s.hasil?.imt?.kategori || '').toLowerCase();
        let imtClass = 'status-badge';
        if (imtKat.includes('normal')) imtClass += ' normal';
        else if (imtKat.includes('obesitas')) imtClass += ' danger';
        else if (imtKat.includes('pre-obese') || imtKat.includes('overweight')) imtClass += ' warning';
        else imtClass += ' info';

        // Tensi
        const sistolik = s.sistolik || '-';
        const diastolik = s.diastolik || '-';

        // Status HT
        const statusHT = s.hasil?.statusHT || 'Normal';
        let statusHTClass = 'status-badge';
        if (statusHT === 'Normal' || statusHT === 'Sehat') statusHTClass += ' normal';
        else if (statusHT === 'Terkontrol') statusHTClass += ' terkontrol';
        else statusHTClass += ' tidak-terkontrol';

        // Skor Risiko
        const riskScore = s.hasil?.riskScore || 0;
        let riskClass = 'status-badge ';
        let riskLabel = '';
        if (riskScore >= 9) { riskClass += 'danger'; riskLabel = `Tinggi (${riskScore})`; }
        else if (riskScore >= 5) { riskClass += 'warning'; riskLabel = `Sedang (${riskScore})`; }
        else { riskClass += 'normal'; riskLabel = `Rendah (${riskScore})`; }

        // Risiko CVD (WHO)
        let cvdRisk = '-';
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

        // Gaya Hidup & Risiko
        let gayaHidup = [];
        if (s.beratBadan) gayaHidup.push(`BB: ${s.beratBadan}kg, TB: ${s.tinggiBadan}cm`);
        if (s.merokok) gayaHidup.push(`Merokok: ${s.merokok === 'active' ? 'Aktif' : (s.merokok === 'passive' ? 'Pasif' : 'Tidak')}`);
        if (s.alkohol) gayaHidup.push(`Alkohol: ${s.alkohol === 'ya' ? 'Ya' : 'Tidak'}`);
        if (s.polaGaram) gayaHidup.push(`Garam: ${s.polaGaram === 'high' ? 'Tinggi' : (s.polaGaram === 'medium' ? 'Sedang' : 'Rendah')}`);
        if (s.aktivitasFisik) gayaHidup.push(`Fisik: ${s.aktivitasFisik === 'active' ? 'Aktif' : (s.aktivitasFisik === 'moderate' ? 'Sedang' : 'Kurang')}`);
        if (s.riwayatKeluarga) gayaHidup.push(`Keturunan HT: ${s.riwayatKeluarga === 'yes' ? 'Ya' : 'Tidak'}`);
        if (s.stress === 'ya') gayaHidup.push('Stres: Ya');
        
        const gayaHidupStr = gayaHidup.length > 0 ? gayaHidup.map(str => `<div><small>• ${str}</small></div>`).join('') : '-';

        // Kondisi Medis & Riwayat
        let kondisiMedis = [];
        if (s.riwayatHT) kondisiMedis.push(`Riwayat HT: ${s.riwayatHT === 'ya' ? 'Ya' : 'Tidak'}`);
        if (s.minumObatHT) kondisiMedis.push(`Obat HT: ${s.minumObatHT === 'ya' ? 'Ya' : 'Tidak'}`);
        
        // Komorbiditas might be array or string (from old dummy data 'yes'/'no')
        if (Array.isArray(s.komorbiditas) && s.komorbiditas.length > 0) {
            kondisiMedis.push(`Komorbid: ${s.komorbiditas.join(', ')}`);
        } else if (s.komorbiditas === 'yes') {
            kondisiMedis.push('Komorbid: Ada');
        }
        
        if (s.penyakitPenyerta) kondisiMedis.push(`Penyerta: ${s.penyakitPenyerta}`);
        if (s.komplikasiHT && s.komplikasiHT.length > 0) kondisiMedis.push(`Komplikasi: ${s.komplikasiHT.join(', ')}`);

        const kondisiStr = kondisiMedis.length > 0 ? kondisiMedis.map(str => `<div><small>• ${str}</small></div>`).join('') : '-';

        tr.innerHTML = `
            <td style="font-weight:bold;">${s._ke}</td>
            <td>${dateStr}</td>
            <td><span class="${imtClass}">${imtVal}</span></td>
            <td>${sistolik}/${diastolik}</td>
            <td><span class="${statusHTClass}">${statusHT}</span></td>
            <td><span class="${riskClass}">${riskLabel}</span></td>
            <td>${cvdRisk}</td>
            <td style="font-size: 0.85em; line-height: 1.3;">${gayaHidupStr}</td>
            <td style="font-size: 0.85em; line-height: 1.3;">${kondisiStr}</td>
            <td style="text-align:center;">
                <button class="btn btn-danger btn-sm" onclick="deleteScreeningRecord('${s.id}', '${patientId}')" title="Hapus riwayat ini">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    modal.classList.remove('hidden');
}

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
                        failedScreenings.push(nama || nik);
                        return;
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
                        return (s === 'YA' || s === 'TRUE' || s.includes('☑') || s === 'V') ? 'ya' : 'tidak';
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
                        merokok: checkStrMerokok(row['Merokok']),
                        alkohol: checkStr(row['Konsumsi alkohol']),
                        polaGaram: checkStr(row['Konsumsi garam yang terlalu banyak']) === 'ya' ? 'high' : 'low',
                        aktivitasFisik: checkStr(row['Kurang aktivitas fisik dan olahraga']) === 'ya' ? 'rare' : 'active',
                        riwayatKeluarga: checkStr(row['Faktor genetik (Orang tua riwayat HT)']) === 'ya' ? 'yes' : 'no',
                        stress: checkStr(row['Stress']),
                        riwayatHT: checkStr(row['Hipertensi (Kondisi)']), 
                        minumObatHT: checkStr(row['Hipertensi Terkontrol (Ada minum obat)']),
                        komorbiditas: [],
                        penyakitPenyerta: String(row['Penyakit penyerta (asma, kolesterol, tumor, OA, dsb)'] || '').replace('-', '').trim(),
                        komplikasiHT: (row['Komplikasi Hipertensi (Stroke, Ginjal, Mata, Jantung)'] || '').split(',').map(s=>s.trim()).filter(s=>s && s !== '-')
                    };

                    if (typeof HypertensionScreening !== 'undefined') {
                        screeningData.hasil = HypertensionScreening.evaluate(screeningData, patient.umur || 40);
                    }
                    ScreeningDB.add(screeningData);
                    addedScreenings++;
                    
                    if (typeof window.addCustomJorong === 'function' && patient.jorong) {
                        window.addCustomJorong(patient.jorong);
                    }
                });

                let alertMsg = `<b>Data Skrining</b><br>Berhasil ditambahkan: ${addedScreenings} data.<br><br>`;
                if (failedScreenings.length > 0) {
                    alertMsg += `<b style="color: #d97706;">Peringatan: ${failedScreenings.length} baris dilewati</b> karena warga belum terdaftar:<br><small>${failedScreenings.join(', ')}</small>`;
                }
                if (typeof window.renderJorongDropdowns === 'function') window.renderJorongDropdowns();
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
                        jorong: String(row['Jorong'] || row['jorong'] || '')
                    };
                });

                if (typeof PatientDB !== 'undefined') {
                    const result = PatientDB.importBulk(patients);
                    if (typeof window.addCustomJorong === 'function') {
                        patients.forEach(p => {
                            if (p.jorong) window.addCustomJorong(p.jorong);
                        });
                        if (typeof window.renderJorongDropdowns === 'function') window.renderJorongDropdowns();
                    }
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

        const isHT = s.hasil?.statusHT === 'Terkontrol' || s.hasil?.statusHT === 'Tidak Terkontrol' || (s.riwayatHT === 'ya');
        const isHTTerkontrol = s.hasil?.statusHT === 'Terkontrol';
        const isHTTidakTerkontrol = s.hasil?.statusHT === 'Tidak Terkontrol';
        const isOverweight = s.hasil?.imt?.kategori === 'Obesitas' || s.hasil?.imt?.kategori === 'Overweight' || s.hasil?.imt?.kategori === 'Pre-Obese';
        const isDegeneratif = s.umur > 60;

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
            'Klasifikasi TD': s.hasil?.klasifikasiTD || '-',
            'Status HT (Sistem)': s.hasil?.statusHT || '-',
            'Hipertensi (Kondisi)': isHT ? '☑' : '☐',
            'Hipertensi Terkontrol (Ada minum obat)': isHTTerkontrol ? '☑' : '☐',
            'Hipertensi Tidak Terkontrol': isHTTidakTerkontrol ? '☑' : '☐',
            'Komplikasi Hipertensi (Stroke, Ginjal, Mata, Jantung)': (Array.isArray(s.komplikasiHT) && s.komplikasiHT.length > 0) ? s.komplikasiHT.join(', ') : '-',
            'Penyakit penyerta (asma, kolesterol, tumor, OA, dsb)': s.penyakitPenyerta || '-',
            
            // Faktor Risiko Detail
            'Faktor genetik (Orang tua riwayat HT)': s.riwayatKeluarga === 'yes' ? '☑' : '☐',
            'Kelebihan berat badan dan obesitas': isOverweight ? '☑' : '☐',
            'Merokok': s.merokok === 'active' ? '☑ (Aktif)' : (s.merokok === 'passive' ? '☑ (Pasif)' : '☐'),
            'Konsumsi garam yang terlalu banyak': s.polaGaram === 'high' ? '☑' : '☐',
            'Konsumsi alkohol': s.alkohol === 'ya' ? '☑' : '☐',
            'Kurang aktivitas fisik dan olahraga': s.aktivitasFisik === 'rare' ? '☑' : '☐',
            'Stress': s.stress === 'ya' ? '☑' : '☐',
            'Degeneratif (pertambahan usia) > 60 tahun': isDegeneratif ? '☑' : '☐',
            
            // Output Sistem Tambahan
            'Risiko CVD (WHO)': (s.hasil?.komplikasiList || s.hasil?.komplikasi || []).join(', ') || '-',
            'Skor Risiko': s.hasil?.riskScore || 0
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
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
    const exampleJorong1 = filterJorong && filterJorong !== 'Semua Jorong' ? filterJorong : 'Koto Tangah';
    const exampleJorong2 = filterJorong && filterJorong !== 'Semua Jorong' ? filterJorong : 'Padang Laweh';

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
    const exampleJorong1 = filterJorong && filterJorong !== 'Semua Jorong' ? filterJorong : 'Koto Tangah';

    // Sheet 1: Data Skrining
    const wsData = XLSX.utils.aoa_to_sheet([
        ['No', 'NIK', 'Nama', 'Jorong', 'Tanggal Skrining', 'Sistolik', 'Diastolik', 'BB (kg)', 'TB (cm)', 'Merokok', 'Konsumsi alkohol', 'Konsumsi garam yang terlalu banyak', 'Kurang aktivitas fisik dan olahraga', 'Stress', 'Faktor genetik (Orang tua riwayat HT)', 'Hipertensi (Kondisi)', 'Hipertensi Terkontrol (Ada minum obat)', 'Penyakit penyerta (asma, kolesterol, tumor, OA, dsb)', 'Komplikasi Hipertensi (Stroke, Ginjal, Mata, Jantung)'],
        [1, '1305201001800001', 'Ahmad Contoh', exampleJorong1, '2026-07-31', 140, 90, 65, 160, 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', '-', '-'],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ]);
    
    // Sheet 2: Petunjuk
    const wsPetunjuk = XLSX.utils.aoa_to_sheet([
        ['PETUNJUK PENGISIAN TEMPLATE DATA SKRINING'],
        [''],
        ['Kolom NIK: Isi dengan 16 digit NIK KTP warga (Harus sudah terdaftar di Data Warga!)'],
        ['Kolom Nama: Isi nama lengkap warga'],
        ['Kolom Tanggal Skrining: Format YYYY-MM-DD'],
        ['Kolom Sistolik & Diastolik: Angka tensi darah'],
        ['Kolom BB & TB: Berat Badan (kg) & Tinggi Badan (cm)'],
        ['Kolom Pertanyaan (Merokok, dsb): Isi YA atau TIDAK'],
        ['PENTING: Warga harus sudah ada di tab "Kelola Data Warga" agar riwayat ini bisa dimasukkan!']
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, 'Template Skrining');
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
    XLSX.writeFile(wb, 'Template_Import_Skrining.xlsx');
};

// (Removed old handleSimpanWarga, replaced with the new window.handleSimpanWarga)

function renderWargaTable() {
    const filterJorong = document.getElementById('filter-jorong')?.value || '';
    const tbody = document.getElementById('warga-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (typeof PatientDB === 'undefined' || typeof ScreeningDB === 'undefined') return;
    
    let patients = PatientDB.getAll();
    
    if (filterJorong && filterJorong !== 'Semua Jorong') {
        patients = patients.filter(p => p.jorong === filterJorong);
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

        tr.innerHTML = `
            <td>${globalIndex}</td>
            <td>${p.nik || '-'}</td>
            <td><b>${p.nama}</b></td>
            <td>${umurText}</td>
            <td>${jkLabel}</td>
            <td>${p.jorong || '-'}</td>
            <td>${statusBadge}</td>
            <td style="text-align: center;">
                <button class="btn btn-primary btn-sm" onclick="editWarga('${p.id}')"><i class="ph-bold ph-pencil"></i> Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteWarga('${p.id}', '${p.nama}')" style="margin-left: 4px;"><i class="ph-bold ph-trash"></i> Hapus</button>
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

window.renderFollowUpTables = function() {
    if (typeof PatientDB === 'undefined' || typeof ScreeningDB === 'undefined') return;

    const currentJorong = document.getElementById('filter-jorong')?.value || '';
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
        const p = patients.find(pat => pat.id === s.patientId);
        if (!p) return;

        if (currentJorong && currentJorong !== 'Semua Jorong' && p.jorong !== currentJorong) return;

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
    document.getElementById('fu-tanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('fu-catatan').value = '';

    const historyContainer = document.getElementById('fu-history-list');
    historyContainer.innerHTML = '';

    const followUps = patient.followUps || [];
    const sortedFUs = followUps.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (sortedFUs.length === 0) {
        historyContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; text-align:center;">Belum ada riwayat follow-up.</p>';
    } else {
        sortedFUs.forEach(fu => {
            const dateStr = new Date(fu.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
            historyContainer.innerHTML += `
                <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border-left: 4px solid var(--primary); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px;"><i class="ph-bold ph-calendar-blank"></i> ${dateStr}</div>
                        <div style="color: var(--text); font-size: 0.95rem; line-height: 1.5;">${fu.catatan}</div>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="deleteFollowUpRecord('${patient.id}', '${fu.id}')" title="Hapus catatan ini" style="padding: 6px 8px;">
                        <i class="ph-bold ph-trash"></i>
                    </button>
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

window.saveFollowUp = function() {
    const patientId = document.getElementById('fu-patient-id').value;
    const tanggal = document.getElementById('fu-tanggal').value;
    const catatan = document.getElementById('fu-catatan').value;

    if (!patientId || !tanggal || !catatan) {
        showToast('Mohon lengkapi data follow-up.', 'warning');
        return;
    }

    showLoading('Menyimpan follow-up...');
    setTimeout(() => {
        PatientDB.addFollowUp(patientId, {
            tanggal: tanggal,
            catatan: catatan
        });
        hideLoading();
        showToast('Catatan follow-up berhasil disimpan!', 'success');
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
    else if(tableId === 'skrining') renderTable(document.getElementById('filter-jorong').value, document.getElementById('table-search').value);
    else renderFollowUpTables();
};

window.prevPage = function(tableId) {
    if (window.statePage[tableId] > 1) {
        window.statePage[tableId]--;
        if(tableId === 'warga') renderWargaTable();
        else if(tableId === 'skrining') renderTable(document.getElementById('filter-jorong').value, document.getElementById('table-search').value);
        else renderFollowUpTables();
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
                PatientDB.delete(patientId);
                ScreeningDB.deleteByPatientId(patientId);
                showToast(`Data warga "${nama}" berhasil dihapus.`, 'danger');
                if (typeof renderDashboard === 'function') renderDashboard();
            } catch (e) {
                console.error("Error deleting warga:", e);
                showToast("Terjadi kesalahan saat menghapus warga.", "danger");
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

    const form = document.getElementById('form-tambah-warga');
    const editId = form ? form.getAttribute('data-edit-id') : null;

    showLoading(editId ? 'Memperbarui data...' : 'Menyimpan data...');

    setTimeout(() => {
        if (editId) {
            PatientDB.update(editId, data);
            hideLoading();
            showToast(`Data warga <b>${nama}</b> berhasil diperbarui!`, 'success');
        } else {
            PatientDB.add(data);
            hideLoading();
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

        renderDashboard();
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
        patients = patients.filter(p => p.jorong === filterJorong);
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
        patients = patients.filter(p => p.jorong === filterJorong);
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
