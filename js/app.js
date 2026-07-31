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

    // State
    let currentResult = null;
    let currentFormData = null;

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
        
        // Set Jorong dropdown
        if (patient.jorong) {
            jorongField.value = patient.jorong;
        }

        // Set gender radio
        if (patient.jenisKelamin) {
            const genderRadio = form.querySelector(`input[name="jenisKelamin"][value="${patient.jenisKelamin}"]`);
            if (genderRadio) genderRadio.checked = true;
        }

        // Lock fields
        toggleDataDiriLock(true);
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
            else if (imt < 25) { kategori = 'Normal'; badgeClass = 'normal'; }
            else if (imt < 30) { kategori = 'Overweight'; badgeClass = 'overweight'; }
            else { kategori = 'Obesitas'; badgeClass = 'obesitas'; }

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

    // ===== FORM SUBMISSION =====
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (['beratBadan', 'tinggiBadan', 'sistolik', 'diastolik'].includes(key)) {
                data[key] = parseFloat(value) || 0;
            } else if (key === 'komplikasiHT' || key === 'komorbiditas') {
                // Ignore here, will handle array below
            } else {
                data[key] = value;
            }
        }
        
        // Get all selected checkboxes for komplikasiHT
        const komplikasiCheckboxes = form.querySelectorAll('input[name="komplikasiHT"]:checked');
        data.komplikasiHT = Array.from(komplikasiCheckboxes).map(cb => cb.value);

        // Get all selected checkboxes for komorbiditas
        const komorbiditasCheckboxes = form.querySelectorAll('input[name="komorbiditas"]:checked');
        data.komorbiditas = Array.from(komorbiditasCheckboxes).map(cb => cb.value);

        const umurVal = parseFloat(document.getElementById('umur')?.value) || 0;
        const umurUnit = document.getElementById('umurUnit')?.value || 'tahun';
        const isBulan = umurUnit === 'bulan';
        data.umur = isBulan ? Math.floor(umurVal / 12) : umurVal;
        data.umurBulan = isBulan ? umurVal : (umurVal * 12);

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
            else alert('Proses skrining terlebih dahulu sebelum menyimpan.');
            return;
        }

        // RE-CAPTURE FORM DATA in case user modified it after clicking 'Cek Hasil'
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (['beratBadan', 'tinggiBadan', 'sistolik', 'diastolik'].includes(key)) {
                data[key] = parseFloat(value) || 0;
            } else {
                data[key] = value;
            }
        }

        const umurVal = parseFloat(document.getElementById('umur')?.value) || 0;
        const umurUnit = document.getElementById('umurUnit')?.value || 'tahun';
        const isBulan = umurUnit === 'bulan';
        data.umur = isBulan ? Math.floor(umurVal / 12) : umurVal;
        data.umurBulan = isBulan ? umurVal : (umurVal * 12);

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

        if (!patientId) {
            // Create new patient
            const newPatient = PatientDB.add({
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
            });
            patientId = newPatient.id;
        } else {
            // Update existing patient
            PatientDB.update(patientId, {
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
            });
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
            merokok: data.merokok,
            alkohol: data.alkohol,
            polaGaram: data.polaGaram,
            aktivitasFisik: data.aktivitasFisik,
            riwayatKeluarga: data.riwayatKeluarga,
            komorbiditas: data.komorbiditas,
            komplikasiHT: data.komplikasiHT || [],
            penyakitPenyerta: data.penyakitPenyerta || '',
            stress: data.stress || 'tidak',
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
                rekomendasi: currentResult.rekomendasi
            }
        };

        if (window.showLoading) window.showLoading('Menyimpan data skrining...');

        setTimeout(() => {
            ScreeningDB.add(screeningRecord);

            // Calculate total screenings for this patient
            const totalSkrining = ScreeningDB.getAll().filter(s => s.patientId === patientId).length;

            if (window.hideLoading) window.hideLoading();

            // Disable save button
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="ph-fill ph-check"></i> Tersimpan';

            // Show Custom HTML Modal
            document.getElementById('success-modal-name').textContent = data.nama;
            document.getElementById('success-modal-count').textContent = `ke-${totalSkrining}`;
            const modal = document.getElementById('success-modal');
            if (modal) modal.classList.remove('hidden');
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
        }, 10);
    });
});
