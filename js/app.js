/**
 * SiDini-Tensi: Screening Page Logic (app.js)
 * Menangani UI form skrining, pencarian pasien, kalkulasi IMT live, dan hasil.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===== DOM Elements =====
    const form = document.getElementById('screening-form');
    const searchInput = document.getElementById('patient-search');
    const searchDropdown = document.getElementById('search-dropdown');
    const resultPanel = document.getElementById('result-panel');

    // Form fields
    const patientIdField = document.getElementById('patient-id');
    const nikField = document.getElementById('nik');
    const namaField = document.getElementById('nama');
    const umurField = document.getElementById('umur');
    const umurUnitField = document.getElementById('umurUnit');
    const umurDisplayField = document.getElementById('umurDisplay');
    const tanggalLahirField = document.getElementById('tanggalLahir');
    const jorongField = document.getElementById('jorong');
    const bbField = document.getElementById('beratBadan');
    const tbField = document.getElementById('tinggiBadan');
    const imtValueDisplay = document.getElementById('imt-value');
    const imtBadgeDisplay = document.getElementById('imt-badge');

    // Buttons
    const btnSave = document.getElementById('btn-save');
    const btnPrint = document.getElementById('btn-print');
    const btnWargaBaru = document.getElementById('btn-warga-baru');

    // State
    let currentResult = null;
    let currentFormData = null;
    let isAddingNewWarga = false;

    // ===== AUTOCOMPLETE SEARCH =====
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchDropdown.classList.remove('open');
            searchDropdown.innerHTML = '';
            return;
        }

        const results = PatientDB.search(query);
        if (results.length === 0) {
            searchDropdown.innerHTML = '<div class="search-dropdown-empty">Warga tidak ditemukan. Silakan isi manual.</div>';
            searchDropdown.classList.add('open');
            return;
        }

        searchDropdown.innerHTML = results.map(p => `
            <div class="search-dropdown-item" data-id="${p.id}">
                <div class="item-name">${p.nama}</div>
                <div class="item-meta">NIK: ${p.nik} · ${p.jorong || '-'} · ${p.umur || '-'} tahun</div>
            </div>
        `).join('');
        searchDropdown.classList.add('open');

        // Bind click events
        searchDropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const patientId = item.dataset.id;
                const patient = PatientDB.getById(patientId);
                if (patient) {
                    fillPatientData(patient);
                    searchDropdown.classList.remove('open');
                    searchInput.value = patient.nama;
                }
            });
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.remove('open');
        }
    });

    if (btnWargaBaru) {
        btnWargaBaru.addEventListener('click', () => {
            console.log('Tambah Warga Baru clicked');
            // Set flag BEFORE reset to prevent reset handler from hiding form
            isAddingNewWarga = true;
            // Reset form
            form.reset();
            // Unlock data diri fields
            toggleDataDiriLock(false);
            // Clear patient state
            if (patientIdField) patientIdField.value = '';
            if (searchInput) searchInput.value = '';
            if (searchDropdown) searchDropdown.classList.remove('open');
            // Hide result panel
            if (resultPanel) {
                resultPanel.style.display = 'none';
                resultPanel.classList.add('hidden');
            }
            // Show form
            form.classList.remove('hidden');
            form.style.display = '';
            // Reset IMT display
            if (imtValueDisplay) imtValueDisplay.textContent = '—';
            if (imtBadgeDisplay) {
                imtBadgeDisplay.textContent = 'Isi BB & TB';
                imtBadgeDisplay.className = 'imt-badge';
            }
            // Scroll form into view
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    } else {
        console.error('btn-warga-baru element NOT FOUND');
    }

    function fillPatientData(patient) {
        patientIdField.value = patient.id || '';
        nikField.value = patient.nik || '';
        namaField.value = patient.nama || '';
        if (patient.tanggalLahir) {
            tanggalLahirField.value = patient.tanggalLahir.split('T')[0];
        } else {
            tanggalLahirField.value = '';
        }
        
        if (umurUnitField) {
            if (typeof patient.umurBulan === 'number' && patient.umurBulan < 12) {
                umurField.value = patient.umurBulan;
                umurUnitField.value = 'bulan';
                if (umurDisplayField) umurDisplayField.value = patient.umurBulan + ' Bulan';
            } else {
                umurField.value = patient.umur || '';
                umurUnitField.value = 'tahun';
                if (umurDisplayField) umurDisplayField.value = (patient.umur || '') + ' Tahun';
            }
        } else {
            umurField.value = patient.umur || '';
            if (umurDisplayField) umurDisplayField.value = (patient.umur || '') + ' Tahun';
        }
        
        // Set Jorong dropdown with flexible matching (ignore case and 'jorong ' prefix)
        if (patient.jorong && jorongField) {
            let found = false;
            const pJorong = String(patient.jorong).toLowerCase().replace('jorong ', '').trim();
            for (let i = 0; i < jorongField.options.length; i++) {
                const optVal = jorongField.options[i].value.toLowerCase().replace('jorong ', '').trim();
                if (optVal && pJorong.includes(optVal) || optVal.includes(pJorong)) {
                    jorongField.value = jorongField.options[i].value;
                    found = true;
                    break;
                }
            }
            if (!found) {
                // If not found in list, we could either add it or leave it. 
                // We'll just set it directly; if the browser allows, it sets it.
                jorongField.value = patient.jorong; 
            }
        }

        // Set gender radio
        if (patient.jenisKelamin) {
            const genderRadio = form.querySelector(`input[name="jenisKelamin"][value="${patient.jenisKelamin}"]`);
            if (genderRadio) genderRadio.checked = true;
        }

        // Lock fields
        toggleDataDiriLock(true);
        form.classList.remove('hidden');
    }

    function toggleDataDiriLock(isLocked) {
        const fieldsToLock = [nikField, namaField, tanggalLahirField, jorongField];
        fieldsToLock.forEach(field => {
            if (!field) return;
            if (isLocked) {
                if (field.tagName === 'INPUT' && (field.type === 'text' || field.type === 'date')) {
                    field.readOnly = true;
                }
                field.style.pointerEvents = 'none';
                field.style.backgroundColor = 'var(--bg-tertiary)';
            } else {
                if (field.tagName === 'INPUT' && (field.type === 'text' || field.type === 'date')) {
                    field.readOnly = false;
                }
                field.style.pointerEvents = 'auto';
                field.style.backgroundColor = '';
            }
        });

        // For radios (Jenis Kelamin)
        const genderRadios = form.querySelectorAll('input[name="jenisKelamin"]');
        genderRadios.forEach(radio => {
            const label = radio.closest('.radio-card-label');
            if (label) {
                label.style.pointerEvents = isLocked ? 'none' : 'auto';
                label.style.opacity = isLocked ? '0.7' : '1';
            }
        });
    }

    // ===== AUTO CALCULATE UMUR =====
    if (tanggalLahirField) {
        tanggalLahirField.addEventListener('change', () => {
            const dob = new Date(tanggalLahirField.value);
            if (!isNaN(dob.getTime())) {
                const today = new Date();
                let ageYears = today.getFullYear() - dob.getFullYear();
                let ageMonths = today.getMonth() - dob.getMonth();
                
                if (ageMonths < 0 || (ageMonths === 0 && today.getDate() < dob.getDate())) {
                    ageYears--;
                    ageMonths += 12;
                }
                
                if (ageYears < 1) {
                    // Under 1 year, show months
                    umurField.value = ageMonths;
                    if (umurUnitField) umurUnitField.value = 'bulan';
                    if (umurDisplayField) umurDisplayField.value = ageMonths + ' Bulan';
                } else {
                    umurField.value = ageYears;
                    if (umurUnitField) umurUnitField.value = 'tahun';
                    if (umurDisplayField) umurDisplayField.value = ageYears + ' Tahun';
                }
            }
        });
    }

    // ===== LIVE IMT CALCULATION =====
    function updateIMT() {
        const bb = parseFloat(bbField.value);
        const tb = parseFloat(tbField.value);
        if (bb > 0 && tb > 0) {
            const h = tb / 100;
            const imt = bb / (h * h);
            const imtRounded = imt.toFixed(1);
            let kategori = '';
            let badgeClass = '';

            if (imt < 18.5) { kategori = 'Kurus'; badgeClass = 'kurus'; }
            else if (imt < 23) { kategori = 'Normal'; badgeClass = 'normal'; }
            else if (imt < 25) { kategori = 'Pre-Obese'; badgeClass = 'overweight'; }
            else if (imt < 30) { kategori = 'Obesitas Tipe 1'; badgeClass = 'obesitas'; }
            else { kategori = 'Obesitas Tipe 2'; badgeClass = 'obesitas'; }

            imtValueDisplay.textContent = imtRounded;
            imtBadgeDisplay.textContent = kategori;
            imtBadgeDisplay.className = `imt-badge ${badgeClass}`;
        } else {
            imtValueDisplay.textContent = '—';
            imtBadgeDisplay.textContent = 'Isi BB & TB';
            imtBadgeDisplay.className = 'imt-badge';
        }
    }

    bbField.addEventListener('input', updateIMT);
    tbField.addEventListener('input', updateIMT);

    // ===== 3x BP MEASUREMENT LOGIC =====
    const extraBpSection = document.getElementById('extra-bp-section');
    const sistolik1 = document.getElementById('sistolik');
    const diastolik1 = document.getElementById('diastolik');
    const sistolik2 = document.getElementById('sistolik2');
    const diastolik2 = document.getElementById('diastolik2');
    const sistolik3 = document.getElementById('sistolik3');
    const diastolik3 = document.getElementById('diastolik3');
    const avgBpDisplay = document.getElementById('avg-bp-display');
    const avgBpValue = document.getElementById('avg-bp-value');

    function checkShowExtraBP() {
        const sys = parseFloat(sistolik1.value) || 0;
        const dia = parseFloat(diastolik1.value) || 0;
        const riwayatHTField = form.querySelector('input[name="riwayatHT"]:checked');
        const hasRiwayatHT = riwayatHTField && riwayatHTField.value === 'ya';
        
        // Jika TIDAK punya riwayat HT dan tensi pengukuran 1 tinggi (Sistolik >= 140)
        if (!hasRiwayatHT && sys >= 140 && dia > 0) {
            extraBpSection.classList.remove('hidden');
        } else {
            extraBpSection.classList.add('hidden');
            // Clear extra fields
            if (sistolik2) sistolik2.value = '';
            if (diastolik2) diastolik2.value = '';
            if (sistolik3) sistolik3.value = '';
            if (diastolik3) diastolik3.value = '';
            avgBpDisplay.classList.add('hidden');
        }
    }

    function updateAvgBP() {
        const s1 = parseFloat(sistolik1.value) || 0;
        const d1 = parseFloat(diastolik1.value) || 0;
        const s2 = parseFloat(sistolik2.value) || 0;
        const d2 = parseFloat(diastolik2.value) || 0;
        const s3 = parseFloat(sistolik3.value) || 0;
        const d3 = parseFloat(diastolik3.value) || 0;

        const sysValues = [s1, s2, s3].filter(v => v > 0);
        const diaValues = [d1, d2, d3].filter(v => v > 0);

        if (sysValues.length >= 2 && diaValues.length >= 2) {
            const avgSys = Math.round(sysValues.reduce((a, b) => a + b, 0) / sysValues.length);
            const avgDia = Math.round(diaValues.reduce((a, b) => a + b, 0) / diaValues.length);
            avgBpValue.textContent = `${avgSys}/${avgDia}`;
            avgBpDisplay.classList.remove('hidden');
        } else {
            avgBpDisplay.classList.add('hidden');
        }
    }

    // Event listeners for auto-show & average
    sistolik1.addEventListener('input', () => { checkShowExtraBP(); updateAvgBP(); });
    diastolik1.addEventListener('input', () => { checkShowExtraBP(); updateAvgBP(); });
    if (sistolik2) sistolik2.addEventListener('input', updateAvgBP);
    if (diastolik2) diastolik2.addEventListener('input', updateAvgBP);
    if (sistolik3) sistolik3.addEventListener('input', updateAvgBP);
    if (diastolik3) diastolik3.addEventListener('input', updateAvgBP);
    // Riwayat HT radios
    form.querySelectorAll('input[name="riwayatHT"]').forEach(r => {
        r.addEventListener('change', checkShowExtraBP);
    });

    // ===== FORM SUBMISSION =====
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // ===== VALIDASI MANUAL SEMUA FIELD WAJIB =====
        const nikVal = document.getElementById('nik')?.value?.trim();
        const namaVal = document.getElementById('nama')?.value?.trim();
        const tglLahirVal = document.getElementById('tanggalLahir')?.value?.trim();
        const jorongVal = document.getElementById('jorong')?.value?.trim();
        const bbVal = parseFloat(document.getElementById('beratBadan')?.value) || 0;
        const tbVal = parseFloat(document.getElementById('tinggiBadan')?.value) || 0;
        const sysVal = parseFloat(document.getElementById('sistolik')?.value) || 0;
        const diaVal = parseFloat(document.getElementById('diastolik')?.value) || 0;
        const genderChecked = form.querySelectorAll('input[name="jenisKelamin"]:checked').length > 0;

        const missing = [];
        if (!nikVal) missing.push('NIK');
        if (!namaVal) missing.push('Nama Lengkap');
        if (!tglLahirVal) missing.push('Tanggal Lahir');
        if (!genderChecked) missing.push('Jenis Kelamin');
        if (!jorongVal) missing.push('Jorong');
        if (!bbVal) missing.push('Berat Badan');
        if (!tbVal) missing.push('Tinggi Badan');
        if (!sysVal) missing.push('Tekanan Darah Sistolik');
        if (!diaVal) missing.push('Tekanan Darah Diastolik');

        if (missing.length > 0) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Data Belum Lengkap',
                    html: `Mohon lengkapi kolom berikut:<br><b>${missing.join(', ')}</b>`
                });
            } else {
                alert('Mohon lengkapi: ' + missing.join(', '));
            }
            return;
        }

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (['beratBadan', 'tinggiBadan', 'sistolik', 'diastolik'].includes(key)) {
                data[key] = parseFloat(value) || 0;
            } else if (['komplikasiHT', 'komorbiditas', 'stress'].includes(key)) {
                // Ignore here, will handle array below
            } else {
                data[key] = value;
            }
        }
        
        data.komplikasiHT = Array.from(form.querySelectorAll('input[name="komplikasiHT"]:checked')).map(cb => cb.value);
        data.komorbiditas = Array.from(form.querySelectorAll('input[name="komorbiditas"]:checked')).map(cb => cb.value);
        data.stress = Array.from(form.querySelectorAll('input[name="stress"]:checked')).map(cb => cb.value);

        const umurVal = parseFloat(document.getElementById('umur')?.value) || 0;
        const umurUnit = document.getElementById('umurUnit')?.value || 'tahun';
        const isBulan = umurUnit === 'bulan';
        data.umur = isBulan ? Math.floor(umurVal / 12) : umurVal;
        data.umurBulan = isBulan ? umurVal : (umurVal * 12);

        // ===== RATA-RATA TENSI (3x Pengukuran) =====
        const s1 = data.sistolik;
        const d1 = data.diastolik;
        const s2 = parseFloat(sistolik2?.value) || 0;
        const d2 = parseFloat(diastolik2?.value) || 0;
        const s3 = parseFloat(sistolik3?.value) || 0;
        const d3 = parseFloat(diastolik3?.value) || 0;

        const sysAll = [s1, s2, s3].filter(v => v > 0);
        const diaAll = [d1, d2, d3].filter(v => v > 0);

        // Simpan pengukuran individual
        data.tensiPengukuran = [
            { sistolik: s1, diastolik: d1 },
            ...(s2 > 0 ? [{ sistolik: s2, diastolik: d2 }] : []),
            ...(s3 > 0 ? [{ sistolik: s3, diastolik: d3 }] : [])
        ];

        // Jika ada >1 pengukuran, gunakan rata-rata untuk analisis
        if (sysAll.length > 1) {
            data.sistolik = Math.round(sysAll.reduce((a, b) => a + b, 0) / sysAll.length);
            data.diastolik = Math.round(diaAll.reduce((a, b) => a + b, 0) / diaAll.length);
        }

        // Edukasi checkboxes
        data.edukasi = {
            hipertensi: form.querySelector('input[name="edu_hipertensi"]').checked,
            dashDiet: form.querySelector('input[name="edu_dashDiet"]').checked,
            aktivitas: form.querySelector('input[name="edu_aktivitas"]').checked,
            alkohol: form.querySelector('input[name="edu_alkohol"]').checked
        };

        currentFormData = data;

        // Run Expert System
        const screening = new HypertensionScreening(data);
        currentResult = screening.evaluate();

        // ===== KATEGORI KASUS HT (Input Manual oleh Nakes) =====
        currentResult.kategoriKasus = data.kategoriKasus || '-';

        renderResult(currentResult);

        // Re-enable save button for new screening
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Simpan ke Database';

        // Show result panel
        resultPanel.classList.add('visible');
        setTimeout(() => {
            resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    });

    // ===== RENDER RESULT =====
    function renderResult(result) {
        // Date
        document.getElementById('result-date').textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // IMT Stat
        const resImt = document.getElementById('res-imt');
        document.getElementById('res-imt-val').textContent = `${result.imt.nilai} (${result.imt.kategori})`;
        resImt.className = 'result-stat ' + getImtStatClass(result.imt.kategori);

        // TD Stat
        const resTd = document.getElementById('res-td');
        document.getElementById('res-td-val').textContent = result.klasifikasiTD;
        resTd.className = 'result-stat ' + getTDStatClass(result.klasifikasiTD);

        // Status HT
        const resStatus = document.getElementById('res-status');
        document.getElementById('res-status-val').textContent = result.statusHT;
        resStatus.className = 'result-stat ' + getHTStatusClass(result.statusHT);

        // Risk Score
        const resRisk = document.getElementById('res-risk');
        let riskLabelText = '';
        if (result.riskScore >= 9) riskLabelText = `Tinggi (${result.riskScore})`;
        else if (result.riskScore >= 5) riskLabelText = `Sedang (${result.riskScore})`;
        else riskLabelText = `Rendah (${result.riskScore})`;
        
        document.getElementById('res-risk-val').textContent = riskLabelText;
        resRisk.className = 'result-stat ' + (result.riskScore >= 9 ? 'danger' : result.riskScore >= 5 ? 'warning' : 'normal');

        // Kategori Kasus
        const resKategori = document.getElementById('res-kategori');
        const resKategoriVal = document.getElementById('res-kategori-val');
        if (result.kategoriKasus && result.kategoriKasus !== '-') {
            resKategori.style.display = '';
            resKategoriVal.textContent = `Kasus ${result.kategoriKasus}`;
            resKategori.className = 'result-stat ' + (result.kategoriKasus === 'Baru' ? 'warning' : 'info');
        } else {
            resKategori.style.display = 'none';
        }

        // Komplikasi
        const kompSection = document.getElementById('komplikasi-section');
        const kompList = document.getElementById('komplikasi-list');
        if (result.komplikasi.length > 0) {
            kompSection.classList.remove('hidden');
            kompList.innerHTML = result.komplikasi.map(k => `
                <div class="komplikasi-item">
                    <div>
                        <span class="organ">${k.organ}</span>
                        <span class="level-badge">${k.level}</span>
                        <div class="desc">${k.desc}</div>
                    </div>
                </div>
            `).join('');
        } else {
            kompSection.classList.add('hidden');
        }

        // Intervensi
        document.getElementById('intervensi-list').innerHTML = result.rekomendasi.intervensi.map(r =>
            `<div class="rekomendasi-item">${r}</div>`
        ).join('');

        // Follow-Up
        document.getElementById('followup-list').innerHTML = result.rekomendasi.followUp.map(r =>
            `<div class="followup-item">${r}</div>`
        ).join('');
    }

    function getImtStatClass(kategori) {
        if (kategori.includes('Obesitas')) return 'danger';
        if (kategori === 'Pre-Obese') return 'warning';
        if (kategori === 'Kurus') return 'info';
        return 'normal';
    }

    function getTDStatClass(label) {
        if (label.includes('Tahap 2') || label.includes('Krisis')) return 'danger';
        if (label.includes('Tahap 1')) return 'warning';
        if (label.includes('Meningkat')) return 'info';
        return 'normal';
    }

    function getHTStatusClass(status) {
        if (status === 'Tidak Terkontrol') return 'danger';
        if (status === 'Terkontrol') return 'info';
        return 'normal';
    }

    // ===== SAVE TO DATABASE =====
    btnSave.addEventListener('click', () => {
        if (!currentResult) {
            if (window.showToast) window.showToast('Proses skrining terlebih dahulu sebelum menyimpan.', 'warning');
            else if (typeof Swal !== 'undefined') Swal.fire('Peringatan', 'Proses skrining terlebih dahulu sebelum menyimpan.', 'warning');
            else alert('Proses skrining terlebih dahulu sebelum menyimpan.');
            return;
        }

        // RE-CAPTURE FORM DATA in case user modified it after clicking 'Cek Hasil'
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (['beratBadan', 'tinggiBadan', 'sistolik', 'diastolik'].includes(key)) {
                data[key] = parseFloat(value) || 0;
            } else if (['komplikasiHT', 'komorbiditas', 'stress'].includes(key)) {
                // Ignore here, will collect as array below
            } else {
                data[key] = value;
            }
        }
        
        data.komplikasiHT = Array.from(form.querySelectorAll('input[name="komplikasiHT"]:checked')).map(cb => cb.value);
        data.komorbiditas = Array.from(form.querySelectorAll('input[name="komorbiditas"]:checked')).map(cb => cb.value);
        data.stress = Array.from(form.querySelectorAll('input[name="stress"]:checked')).map(cb => cb.value);

        const umurVal = parseFloat(document.getElementById('umur')?.value) || 0;
        const umurUnit = document.getElementById('umurUnit')?.value || 'tahun';
        const isBulan = umurUnit === 'bulan';
        data.umur = isBulan ? Math.floor(umurVal / 12) : umurVal;
        data.umurBulan = isBulan ? umurVal : (umurVal * 12);

        // Re-capture 3x BP average
        const rs2 = parseFloat(document.getElementById('sistolik2')?.value) || 0;
        const rd2 = parseFloat(document.getElementById('diastolik2')?.value) || 0;
        const rs3 = parseFloat(document.getElementById('sistolik3')?.value) || 0;
        const rd3 = parseFloat(document.getElementById('diastolik3')?.value) || 0;
        data.tensiPengukuran = [
            { sistolik: data.sistolik, diastolik: data.diastolik },
            ...(rs2 > 0 ? [{ sistolik: rs2, diastolik: rd2 }] : []),
            ...(rs3 > 0 ? [{ sistolik: rs3, diastolik: rd3 }] : [])
        ];
        const rSysAll = [data.sistolik, rs2, rs3].filter(v => v > 0);
        const rDiaAll = [data.diastolik, rd2, rd3].filter(v => v > 0);
        if (rSysAll.length > 1) {
            data.sistolik = Math.round(rSysAll.reduce((a, b) => a + b, 0) / rSysAll.length);
            data.diastolik = Math.round(rDiaAll.reduce((a, b) => a + b, 0) / rDiaAll.length);
        }

        data.edukasi = {
            hipertensi: form.querySelector('input[name="edu_hipertensi"]').checked,
            dashDiet: form.querySelector('input[name="edu_dashDiet"]').checked,
            aktivitas: form.querySelector('input[name="edu_aktivitas"]').checked,
            alkohol: form.querySelector('input[name="edu_alkohol"]').checked
        };


        // Ensure patient exists in DB
        let patientId = data.patientId;
        
            // Cek jika user tidak menggunakan dropdown tapi mengetik manual
            if (!patientId) {
                const cleanNik = data.nik ? String(data.nik).replace(/\s/g, '') : '';
                
                // Coba cari berdasarkan NIK dulu
                if (cleanNik) {
                    const existingByNik = PatientDB.getAll().find(p => String(p.nik).replace(/\s/g, '') === cleanNik);
                    if (existingByNik) patientId = existingByNik.id;
                }
                // Hapus pencarian berdasarkan Nama agar NIK menjadi primary key
            }

        if (window.showLoading) window.showLoading('Menyimpan data skrining...');

        let savedPatientRecord = null;
        try {
            if (!patientId) {
                // Create new patient
                savedPatientRecord = PatientDB.add({
                    nik: data.nik,
                    nama: data.nama,
                    tanggalLahir: data.tanggalLahir,
                    umur: data.umur,
                    umurBulan: data.umurBulan,
                    jenisKelamin: data.jenisKelamin,
                    jorong: data.jorong,
                    beratBadan: data.beratBadan,
                    tinggiBadan: data.tinggiBadan,
                    lastScreeningDate: new Date().toISOString()
                }, true); // skipFirestore
                patientId = savedPatientRecord.id;
            } else {
                // Update existing patient
                savedPatientRecord = PatientDB.update(patientId, {
                    nik: data.nik,
                    nama: data.nama,
                    tanggalLahir: data.tanggalLahir,
                    umur: data.umur,
                    umurBulan: data.umurBulan,
                    jenisKelamin: data.jenisKelamin,
                    jorong: data.jorong,
                    beratBadan: data.beratBadan,
                    tinggiBadan: data.tinggiBadan,
                    lastScreeningDate: new Date().toISOString()
                }, true); // skipFirestore
            }
        } catch (e) {
            console.error("Patient save error:", e);
            if (window.hideLoading) window.hideLoading();
            alert("Gagal menyimpan data warga lokal: " + e.message);
            return;
        }

        // Save screening
        const screeningRecord = {
            patientId: patientId,
            nama: data.nama,
            tanggalLahir: data.tanggalLahir,
            jorong: data.jorong,
            umur: data.umur,
            beratBadan: data.beratBadan,
            tinggiBadan: data.tinggiBadan,
            sistolik: data.sistolik,
            diastolik: data.diastolik,
            tensiPengukuran: data.tensiPengukuran || [],
            jenisKelamin: data.jenisKelamin,
            merokok: data.merokok,
            alkohol: data.alkohol,
            polaGaram: data.polaGaram,
            aktivitasFisik: data.aktivitasFisik,
            riwayatKeluarga: data.riwayatKeluarga,
            komorbiditas: data.komorbiditas || [],
            komplikasiHT: data.komplikasiHT || [],
            penyakitPenyerta: data.penyakitPenyerta || '',
            obatAntihipertensi: data.obatAntihipertensi || '',
            stress: data.stress || [],
            riwayatHT: data.riwayatHT,
            minumObatHT: data.minumObatHT,
            edukasi: data.edukasi,
            hasil: {
                imt: currentResult.imt,
                klasifikasiTD: currentResult.klasifikasiTD,
                statusHT: currentResult.statusHT,
                riskScore: currentResult.riskScore,
                komplikasi: currentResult.komplikasi,
                komplikasiList: currentResult.komplikasiList,
                rekomendasi: currentResult.rekomendasi,
                kategoriKasus: currentResult.kategoriKasus || '-'
            }
        };

        setTimeout(() => {
            let totalSkrining = 0;
            try {
                const savedScreeningRecord = ScreeningDB.add(screeningRecord, true); // skipFirestore
                FirestoreSync.saveWargaWithScreening(savedPatientRecord, savedScreeningRecord);

                // Calculate total screenings for this patient
                const pid = String(patientId);
                totalSkrining = ScreeningDB.getAll().filter(s => String(s.patientId) === pid).length;

                if (window.hideLoading) window.hideLoading();

                // Disable save button
                btnSave.disabled = true;
                btnSave.innerHTML = '<i class="ph-fill ph-check"></i> Tersimpan';
            } catch (e) {
                console.error("Save error:", e);
                if (window.hideLoading) window.hideLoading();
                alert("Gagal menyimpan data ke server: " + e.message);
                return;
            }

            // Show Custom HTML Modal or SweetAlert
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Berhasil!',
                    html: `Data skrining untuk <b>${data.nama}</b> telah tersimpan ke database.<br><br><span style="font-size: 0.9em; color: #666;">Ini adalah riwayat skrining ke-${totalSkrining} untuk warga ini.</span>`,
                    icon: 'success',
                    confirmButtonText: 'Selesai',
                    confirmButtonColor: '#2563eb'
                }).then(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            } else {
                document.getElementById('success-modal-name').textContent = data.nama;
                document.getElementById('success-modal-count').textContent = `ke-${totalSkrining}`;
                const modal = document.getElementById('success-modal');
                if (modal) modal.classList.remove('hidden');
            }
        }, 500);
    });

    // ===== PRINT =====
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // ===== FORM RESET =====
    form.addEventListener('reset', () => {
        setTimeout(() => {
            patientIdField.value = '';
            searchInput.value = '';
            if (umurDisplayField) umurDisplayField.value = '';
            imtValueDisplay.textContent = '—';
            imtBadgeDisplay.textContent = 'Isi BB & TB';
            imtBadgeDisplay.className = 'imt-badge';
            resultPanel.classList.remove('visible');
            currentResult = null;
            currentFormData = null;
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Simpan ke Database';
            document.getElementById('save-alert')?.classList.add('hidden');
            
            // Unlock fields
            toggleDataDiriLock(false);
            
            // Hide form again (but NOT if adding new warga)
            if (isAddingNewWarga) {
                isAddingNewWarga = false;
            } else {
                form.classList.add('hidden');
            }
        }, 10);
    });
});

// ===== FIREBASE AUTHENTICATION LOGIC =====

// Monitor Auth State
if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged(async (user) => {
        
        if (user) {
            // Fetch role dari Firestore
            if (typeof firestoreDB !== 'undefined' && firestoreDB) {
                try {
                    const doc = await firestoreDB.collection('users').doc(user.email).get();
                    if (doc.exists) {
                        const data = doc.data();
                        window.currentUser = { ...user, role: data.role, jorong: data.jorong, dbPassword: data.password };
                    } else {
                        // Legacy fallback (superadmin default jika tidak ada di DB)
                        window.currentUser = { ...user, role: 'superadmin' };
                    }
                } catch(e) {
                    console.error("Error fetching user role", e);
                    window.currentUser = { ...user, role: 'superadmin' };
                }
            } else {
                window.currentUser = { ...user, role: 'superadmin' };
            }
        } else {
            window.currentUser = null;
        }

        // Cek auth pertama kali untuk router
        if (!window.isAuthReady) {
            window.isAuthReady = true;
            if (typeof handleRouting === 'function') handleRouting();
        }
        
        // Re-render dropdown jika user berubah
        if (typeof window.renderJorongDropdowns === 'function') window.renderJorongDropdowns();

        const btnLogout = document.getElementById('btn-logout');
        const navAdmin = document.getElementById('nav-admin');
        
        if (user) {
            // User is logged in
            console.log('✅ User logged in:', user.email);
            if (btnLogout) btnLogout.classList.remove('hidden');
            if (navAdmin && window.currentUser && window.currentUser.role === 'superadmin') {
                navAdmin.classList.remove('hidden');
            } else if (navAdmin) {
                navAdmin.classList.add('hidden');
            }
            
            // Sembunyikan modal login jika terbuka
            const loginModal = document.getElementById('login-modal');
            if (loginModal) loginModal.classList.add('hidden');
            
        } else {
            // User is logged out
            console.log('🔒 User logged out');
            if (btnLogout) btnLogout.classList.add('hidden');
            if (navAdmin) navAdmin.classList.add('hidden');
            
            // Kick to home jika di halaman protected
            const hash = window.location.hash || '#home';
            if (hash === '#skrining' || hash === '#dashboard' || hash === '#admin') {
                window.location.hash = '#home';
                const loginModal = document.getElementById('login-modal');
                if (loginModal) loginModal.classList.remove('hidden');
            }
        }
    });
} else {
    // Firebase SDK tidak dimuat (Offline murni tanpa auth awal)
    // Anggap sudah login agar sistem tetap jalan saat demonstrasi lokal murni tanpa server
    window.isAuthReady = true;
    window.currentUser = { email: 'offline@local' };
    console.warn('⚠️ Menjalankan mock-auth (offline) karena SDK tidak terdeteksi.');
}

// Handle Login Form Submit
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = loginForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            try {
                btn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 3px;"></div>';
                btn.disabled = true;
                
                await auth.signInWithEmailAndPassword(email, password);
                
                // Alert sukses
                if(typeof Swal !== 'undefined'){
                    Swal.fire({ icon: 'success', title: 'Login Berhasil', timer: 1500, showConfirmButton: false });
                }
                
                document.getElementById('login-modal').classList.add('hidden');
                loginForm.reset();
                
            } catch (error) {
                console.error("Login Error:", error);
                if(typeof Swal !== 'undefined'){
                    Swal.fire({ icon: 'error', title: 'Login Gagal', text: 'Email atau password salah.' });
                } else {
                    alert('Login gagal: Email atau password salah.');
                }
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});

// Handle Logout
window.handleLogout = async function() {
    if(typeof Swal !== 'undefined'){
        const result = await Swal.fire({
            title: 'Konfirmasi Keluar',
            text: "Anda yakin ingin keluar dari sistem?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Keluar',
            cancelButtonText: 'Batal'
        });
        if (!result.isConfirmed) return;
    } else {
        if(!confirm("Anda yakin ingin keluar?")) return;
    }
    
    try {
        await auth.signOut();
        if(typeof Swal !== 'undefined'){
            Swal.fire({ icon: 'success', title: 'Berhasil Keluar', timer: 1500, showConfirmButton: false });
        }
    } catch (err) {
        console.error("Logout Error:", err);
    }
};
