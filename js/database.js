/**
 * SiDini-Tensi Database Layer
 * Primary: Firestore (Cloud Database)
 * Fallback: In-Memory Cache + localStorage
 * Menyediakan API CRUD untuk data Pasien & Skrining.
 */

const DB_KEYS = {
    PATIENTS: 'sidini_patients',
    SCREENINGS: 'sidini_screenings'
};

// ===================== JORONG LIST =====================
const JORONG_LIST = [
    'Jorong Koto Tangah',
    'Jorong Padang Laweh',
    'Jorong Balai Gurah',
    'Jorong Galuang'
];

// ===================== HELPER =====================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Bersihkan object dari undefined (Firestore tidak menerima undefined)
function cleanObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// === IN-MEMORY CACHE (Primary data source for reads) ===
const _memoryDB = {
    [DB_KEYS.PATIENTS]: [],
    [DB_KEYS.SCREENINGS]: []
};

// Try to load from localStorage on startup (instant fallback)
(function initMemoryDB() {
    for (const key of Object.values(DB_KEYS)) {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    _memoryDB[key] = parsed;
                }
            }
        } catch (e) {
            console.warn('Could not load from localStorage:', key, e);
        }
    }
})();

function getFromStorage(key) {
    return JSON.parse(JSON.stringify(_memoryDB[key] || []));
}

function saveToStorage(key, data) {
    _memoryDB[key] = data;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('localStorage write failed:', e);
    }
}

// ===================== FIRESTORE SYNC =====================
const FirestoreSync = {
    get db() {
        return (typeof firestoreDB !== 'undefined') ? firestoreDB : null;
    },

    // Load semua data dari Firestore ke memory
    async loadAll() {
        if (!this.db) return false;
        try {
            const pSnap = await this.db.collection('patients').get();
            const patients = [];
            pSnap.forEach(doc => patients.push(doc.data()));

            const sSnap = await this.db.collection('screenings').get();
            const screenings = [];
            sSnap.forEach(doc => screenings.push(doc.data()));

            _memoryDB[DB_KEYS.PATIENTS] = patients;
            _memoryDB[DB_KEYS.SCREENINGS] = screenings;

            // Update localStorage juga
            try {
                localStorage.setItem(DB_KEYS.PATIENTS, JSON.stringify(patients));
                localStorage.setItem(DB_KEYS.SCREENINGS, JSON.stringify(screenings));
            } catch (e) { /* ignore */ }

            console.log(`☁️ Firestore loaded: ${patients.length} patients, ${screenings.length} screenings`);
            return true;
        } catch (e) {
            console.warn('Firestore load failed:', e);
            return false;
        }
    },

    // Simpan 1 patient ke Firestore
    savePatient(patient) {
        if (!this.db) return;
        this.db.collection('patients').doc(patient.id).set(cleanObject(patient)).catch(e => {
            console.warn('Firestore save patient failed:', e);
        });
    },

    // Simpan 1 screening ke Firestore
    saveScreening(screening) {
        if (!this.db) return;
        this.db.collection('screenings').doc(screening.id).set(cleanObject(screening)).catch(e => {
            console.warn('Firestore save screening failed:', e);
        });
    },

    // Update 1 patient di Firestore
    updatePatient(patient) {
        if (!this.db) return;
        this.db.collection('patients').doc(patient.id).set(cleanObject(patient), { merge: true }).catch(e => {
            console.warn('Firestore update patient failed:', e);
        });
    },

    deletePatient(id) {
        if (!this.db) return;
        this.db.collection('patients').doc(id).delete().catch(e => {
            console.warn('Firestore delete patient failed:', e);
        });
    },

    deleteScreening(id) {
        if (!this.db) return;
        this.db.collection('screenings').doc(id).delete().catch(e => {
            console.warn('Firestore delete screening failed:', e);
        });
    },

    // Hapus semua dokumen dalam collection
    async clearCollection(collectionName) {
        if (!this.db) return;
        try {
            const snap = await this.db.collection(collectionName).get();
            const batchSize = 500;
            let batch = this.db.batch();
            let count = 0;
            snap.forEach(doc => {
                batch.delete(doc.ref);
                count++;
                if (count % batchSize === 0) {
                    batch.commit();
                    batch = this.db.batch();
                }
            });
            if (count % batchSize !== 0) {
                await batch.commit();
            }
            console.log(`🗑️ Firestore: Cleared ${count} docs from ${collectionName}`);
        } catch (e) {
            console.warn('Firestore clear failed:', e);
        }
    },

    // Bulk save patients ke Firestore
    async saveBulkPatients(patients) {
        if (!this.db) return;
        try {
            const batchSize = 500;
            for (let i = 0; i < patients.length; i += batchSize) {
                const batch = this.db.batch();
                const chunk = patients.slice(i, i + batchSize);
                chunk.forEach(p => {
                    batch.set(this.db.collection('patients').doc(p.id), cleanObject(p));
                });
                await batch.commit();
            }
        } catch (e) {
            console.warn('Firestore bulk save patients failed:', e);
        }
    },

    // Bulk save screenings ke Firestore
    async saveBulkScreenings(screenings) {
        if (!this.db) return;
        try {
            const batchSize = 500;
            for (let i = 0; i < screenings.length; i += batchSize) {
                const batch = this.db.batch();
                const chunk = screenings.slice(i, i + batchSize);
                chunk.forEach(s => {
                    batch.set(this.db.collection('screenings').doc(s.id), cleanObject(s));
                });
                await batch.commit();
            }
        } catch (e) {
            console.warn('Firestore bulk save screenings failed:', e);
        }
    }
};

// ===================== PATIENT CRUD =====================
const PatientDB = {
    getAll() {
        return getFromStorage(DB_KEYS.PATIENTS);
    },

    getById(id) {
        return this.getAll().find(p => p.id === id);
    },

    getByNIK(nik) {
        return this.getAll().find(p => p.nik === nik);
    },

    search(query) {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase();
        return this.getAll().filter(p =>
            p.nama.toLowerCase().includes(q) ||
            p.nik.includes(q)
        ).slice(0, 10);
    },

    add(patient) {
        const patients = this.getAll();
        
        // Enforce NIK as primary key if NIK is provided
        if (patient.nik) {
            const existingIdx = patients.findIndex(p => p.nik === patient.nik);
            if (existingIdx !== -1) {
                // Upsert: update existing patient instead of adding duplicate
                patients[existingIdx] = { ...patients[existingIdx], ...patient, id: patient.nik };
                saveToStorage(DB_KEYS.PATIENTS, patients);
                FirestoreSync.updatePatient(patients[existingIdx]);
                return patients[existingIdx];
            }
        }

        patient.id = patient.nik || patient.id || generateId();
        patient.createdAt = patient.createdAt || new Date().toISOString();
        patient.followUps = patient.followUps || [];
        patients.push(patient);
        saveToStorage(DB_KEYS.PATIENTS, patients);
        FirestoreSync.savePatient(patient);
        return patient;
    },

    update(id, updates) {
        const patients = this.getAll();
        const idx = patients.findIndex(p => p.id === id);
        if (idx !== -1) {
            patients[idx] = { ...patients[idx], ...updates };
            saveToStorage(DB_KEYS.PATIENTS, patients);
            FirestoreSync.updatePatient(patients[idx]); // ☁️ Sync to cloud
            return patients[idx];
        }
        return null;
    },

    delete(id) {
        const patients = this.getAll();
        const filtered = patients.filter(p => p.id !== id);
        if (filtered.length < patients.length) {
            saveToStorage(DB_KEYS.PATIENTS, filtered);
            FirestoreSync.deletePatient(id);
            return true;
        }
        return false;
    },

    addFollowUp(patientId, followUpData) {
        const patients = this.getAll();
        const idx = patients.findIndex(p => p.id === patientId);
        if (idx !== -1) {
            if (!patients[idx].followUps) {
                patients[idx].followUps = [];
            }
            followUpData.id = generateId();
            followUpData.createdAt = new Date().toISOString();
            patients[idx].followUps.push(followUpData);
            
            saveToStorage(DB_KEYS.PATIENTS, patients);
            FirestoreSync.updatePatient(patients[idx]);
            return followUpData;
        }
        return null;
    },

    deleteFollowUp(patientId, followUpId) {
        const patients = this.getAll();
        const idx = patients.findIndex(p => p.id === patientId);
        if (idx !== -1 && patients[idx].followUps) {
            patients[idx].followUps = patients[idx].followUps.filter(f => f.id !== followUpId);
            saveToStorage(DB_KEYS.PATIENTS, patients);
            FirestoreSync.updatePatient(patients[idx]);
            return true;
        }
        return false;
    },

    getDemographicsStats(filterJorong = '') {
        let patients = this.getAll();
        if (filterJorong && filterJorong !== 'Semua Jorong') {
            patients = patients.filter(p => p.jorong === filterJorong);
        }

        const stats = {
            total: patients.length,
            kategori: {
                bayi: 0,         // 0-11 bulan
                baduta: 0,       // 12-23 bulan
                balita: 0,       // 24-59 bulan
                apras: 0,        // 60-72 bulan
                anak: 0,         // 6-11 tahun (73-143 bln)
                remajaAwal: 0,   // 12-14 tahun
                remajaAkhir: 0,  // 15-18 tahun
                produktif: 0,    // 19-44 tahun
                praLansia: 0,    // 45-59 tahun
                lansia: 0,       // 60-69 tahun
                lansiaResti: 0   // >= 70 tahun
            }
        };

        patients.forEach(p => {
            // Default ke umur tahun * 12 jika umurBulan tidak ada (kompatibilitas data lama)
            const bulan = typeof p.umurBulan === 'number' ? p.umurBulan : (p.umur || 0) * 12;

            if (bulan >= 0 && bulan <= 11) stats.kategori.bayi++;
            else if (bulan >= 12 && bulan <= 23) stats.kategori.baduta++;
            else if (bulan >= 24 && bulan <= 59) stats.kategori.balita++;
            else if (bulan >= 60 && bulan <= 72) stats.kategori.apras++;
            else if (bulan >= 73 && bulan <= 143) stats.kategori.anak++;
            else if (bulan >= 144 && bulan <= 179) stats.kategori.remajaAwal++;
            else if (bulan >= 180 && bulan <= 227) stats.kategori.remajaAkhir++;
            else if (bulan >= 228 && bulan <= 539) stats.kategori.produktif++;
            else if (bulan >= 540 && bulan <= 719) stats.kategori.praLansia++;
            else if (bulan >= 720 && bulan <= 839) stats.kategori.lansia++;
            else if (bulan >= 840) stats.kategori.lansiaResti++;
        });

        return stats;
    },

    importBulk(patientsArray) {
        const existing = this.getAll();
        let added = 0;
        let updated = 0;

        patientsArray.forEach(p => {
            p.nik = String(p.nik || '').trim();
            p.nama = String(p.nama || '').trim();
            if (!p.nik && !p.nama) return;

            let existingIdx = -1;
            if (p.nik) {
                existingIdx = existing.findIndex(ep => ep.nik === p.nik);
            }

            if (existingIdx !== -1) {
                existing[existingIdx] = { ...existing[existingIdx], ...p, id: p.nik };
                updated++;
            } else {
                p.id = p.nik || p.id || generateId();
                p.createdAt = p.createdAt || new Date().toISOString();
                existing.push(p);
                added++;
            }
        });

        saveToStorage(DB_KEYS.PATIENTS, existing);
        FirestoreSync.saveBulkPatients(existing); // ☁️ Sync to cloud
        return { added, updated, total: existing.length };
    },

    clear() {
        saveToStorage(DB_KEYS.PATIENTS, []);
        FirestoreSync.clearCollection('patients'); // ☁️ Clear cloud
    },

    removeDuplicates() {
        const patients = this.getAll();
        const uniquePatients = {};
        const duplicatesMapping = {}; // oldId -> newId

        patients.forEach(p => {
            const nik = String(p.nik || '').trim();
            if (!nik) return; // Skip if no NIK, can't reliably deduplicate

            if (!uniquePatients[nik]) {
                uniquePatients[nik] = p;
            } else {
                // Duplicate found! Keep the one that has more complete data, or just keep the first one
                const keep = uniquePatients[nik];
                duplicatesMapping[p.id] = keep.id;
                
                // Merge followUps if any
                if (p.followUps && p.followUps.length > 0) {
                    keep.followUps = [...(keep.followUps || []), ...p.followUps];
                }
            }
        });

        // Filter out the duplicates
        const deduplicated = patients.filter(p => !duplicatesMapping[p.id]);
        
        if (deduplicated.length < patients.length) {
            saveToStorage(DB_KEYS.PATIENTS, deduplicated);
            
            // Update screenings to point to the kept patientId
            const screenings = getFromStorage(DB_KEYS.SCREENINGS) || [];
            let screeningsChanged = false;
            screenings.forEach(s => {
                if (duplicatesMapping[s.patientId]) {
                    s.patientId = duplicatesMapping[s.patientId];
                    screeningsChanged = true;
                }
            });

            if (screeningsChanged) {
                saveToStorage(DB_KEYS.SCREENINGS, screenings);
            }
            
            return { removed: patients.length - deduplicated.length, mappings: duplicatesMapping };
        }
        return { removed: 0, mappings: {} };
    }
};

// ===================== SCREENING CRUD =====================
const ScreeningDB = {
    getAll() {
        return getFromStorage(DB_KEYS.SCREENINGS);
    },

    getByPatientId(patientId) {
        return this.getAll().filter(s => s.patientId === patientId);
    },

    getByJorong(jorong) {
        return this.getAll().filter(s => s.jorong === jorong);
    },

    add(screening) {
        const screenings = this.getAll();
        screening.id = screening.id || generateId();
        screening.tanggalSkrining = screening.tanggalSkrining || new Date().toISOString();
        screenings.push(screening);
        saveToStorage(DB_KEYS.SCREENINGS, screenings);
        FirestoreSync.saveScreening(screening); // ☁️ Sync to cloud
        return screening;
    },

    getLatestByPatient(patientId) {
        const screenings = this.getByPatientId(patientId);
        if (screenings.length === 0) return null;
        return screenings.sort((a, b) => new Date(b.tanggalSkrining) - new Date(a.tanggalSkrining))[0];
    },

    deleteById(screeningId) {
        const screenings = this.getAll();
        const filtered = screenings.filter(s => s.id !== screeningId);
        if (filtered.length < screenings.length) {
            saveToStorage(DB_KEYS.SCREENINGS, filtered);
            FirestoreSync.deleteScreening(screeningId);
            return true;
        }
        return false;
    },

    deleteByPatientId(patientId) {
        const screenings = this.getAll();
        const toDelete = screenings.filter(s => s.patientId === patientId);
        const filtered = screenings.filter(s => s.patientId !== patientId);
        if (filtered.length < screenings.length) {
            saveToStorage(DB_KEYS.SCREENINGS, filtered);
            toDelete.forEach(s => FirestoreSync.deleteScreening(s.id));
            return true;
        }
        return false;
    },

    clear() {
        saveToStorage(DB_KEYS.SCREENINGS, []);
        FirestoreSync.clearCollection('screenings'); // ☁️ Clear cloud
    },

    // Statistik untuk Dashboard
    getStats() {
        const screenings = this.getAll();
        const patients = PatientDB.getAll();
        const totalPatients = patients.length;

        const latestPerPatient = {};
        screenings.forEach(s => {
            if (!latestPerPatient[s.patientId] ||
                new Date(s.tanggalSkrining) > new Date(latestPerPatient[s.patientId].tanggalSkrining)) {
                latestPerPatient[s.patientId] = s;
            }
        });

        const latestList = Object.values(latestPerPatient);

        let sehat = 0, htTerkontrol = 0, htTidakTerkontrol = 0;
        let totalRiskScore = 0;

        const faktorRisikoCount = {
            merokok: 0,
            alkohol: 0,
            obesitas: 0,
            kurangAktivitas: 0,
            makanAsin: 0,
            riwayatKeluarga: 0
        };

        const perJorong = {};
        JORONG_LIST.forEach(j => {
            perJorong[j] = { total: 0, sehat: 0, htTerkontrol: 0, htTidakTerkontrol: 0, totalRiskScore: 0, faktorRisiko: { ...faktorRisikoCount } };
        });

        latestList.forEach(s => {
            const jorong = s.jorong || 'Tidak Diketahui';
            if (!perJorong[jorong]) {
                perJorong[jorong] = { total: 0, sehat: 0, htTerkontrol: 0, htTidakTerkontrol: 0, totalRiskScore: 0, faktorRisiko: { ...faktorRisikoCount } };
            }
            perJorong[jorong].total++;

            if (s.hasil) {
                if (s.hasil.statusHT === 'Normal') {
                    sehat++;
                    perJorong[jorong].sehat++;
                } else if (s.hasil.statusHT === 'Terkontrol') {
                    htTerkontrol++;
                    perJorong[jorong].htTerkontrol++;
                } else {
                    htTidakTerkontrol++;
                    perJorong[jorong].htTidakTerkontrol++;
                }
                
                const rScore = s.hasil.riskScore || 0;
                totalRiskScore += rScore;
                perJorong[jorong].totalRiskScore += rScore;
            }

            if (s.merokok === 'active') { faktorRisikoCount.merokok++; if(perJorong[jorong]) perJorong[jorong].faktorRisiko.merokok++; }
            if (s.alkohol === 'ya') { faktorRisikoCount.alkohol++; if(perJorong[jorong]) perJorong[jorong].faktorRisiko.alkohol++; }
            if (s.hasil && s.hasil.imt && s.hasil.imt.kategori && s.hasil.imt.kategori.includes('Obesitas')) { faktorRisikoCount.obesitas++; if(perJorong[jorong]) perJorong[jorong].faktorRisiko.obesitas++; }
            if (s.aktivitasFisik === 'rare') { faktorRisikoCount.kurangAktivitas++; if(perJorong[jorong]) perJorong[jorong].faktorRisiko.kurangAktivitas++; }
            if (s.polaGaram === 'high') { faktorRisikoCount.makanAsin++; if(perJorong[jorong]) perJorong[jorong].faktorRisiko.makanAsin++; }
            if (s.riwayatKeluarga === 'yes') { faktorRisikoCount.riwayatKeluarga++; if(perJorong[jorong]) perJorong[jorong].faktorRisiko.riwayatKeluarga++; }
        });

        return {
            totalPatients,
            totalScreenings: screenings.length,
            totalScreened: latestList.length,
            sehat,
            htTerkontrol,
            htTidakTerkontrol,
            totalRiskScore,
            faktorRisiko: faktorRisikoCount,
            perJorong
        };
    }
};

// ===================== DUMMY DATA =====================
function loadDummyData() {
    if (PatientDB.getAll().length > 0) return; // Jangan timpa jika sudah ada

    const dummyPatients = [
        { nik: '1305201001800001', nama: 'Ahmad Rasyid', umur: 62, jenisKelamin: 'male', jorong: 'Jorong Koto Tangah' },
        { nik: '1305201002750002', nama: 'Siti Nurhaliza', umur: 51, jenisKelamin: 'female', jorong: 'Jorong Koto Tangah' },
        { nik: '1305201003900003', nama: 'Budi Santoso', umur: 36, jenisKelamin: 'male', jorong: 'Jorong Padang Laweh' },
        { nik: '1305201004680004', nama: 'Hj. Mariam', umur: 58, jenisKelamin: 'female', jorong: 'Jorong Padang Laweh' },
        { nik: '1305201005850005', nama: 'Dedi Kurniawan', umur: 41, jenisKelamin: 'male', jorong: 'Jorong Balai Gurah' },
        { nik: '1305201006720006', nama: 'Nurlela', umur: 54, jenisKelamin: 'female', jorong: 'Jorong Balai Gurah' },
        { nik: '1305201007880007', nama: 'Irwan Syahputra', umur: 38, jenisKelamin: 'male', jorong: 'Jorong Galuang' },
        { nik: '1305201008650008', nama: 'Rosni', umur: 61, jenisKelamin: 'female', jorong: 'Jorong Galuang' },
        { nik: '1305201009780009', nama: 'Hendri Nofriandi', umur: 48, jenisKelamin: 'male', jorong: 'Jorong Koto Tangah' },
        { nik: '1305201010920010', nama: 'Yeni Fitria', umur: 34, jenisKelamin: 'female', jorong: 'Jorong Padang Laweh' },
        { nik: '1305201011700011', nama: 'H. Zainal Abidin', umur: 56, jenisKelamin: 'male', jorong: 'Jorong Balai Gurah' },
        { nik: '1305201012830012', nama: 'Dewi Sartika', umur: 43, jenisKelamin: 'female', jorong: 'Jorong Galuang' },
        { nik: '1305201013670013', nama: 'Usman Hakim', umur: 59, jenisKelamin: 'male', jorong: 'Jorong Koto Tangah' },
        { nik: '1305201014950014', nama: 'Linda Permata Sari', umur: 31, jenisKelamin: 'female', jorong: 'Jorong Padang Laweh' },
        { nik: '1305201015710015', nama: 'Darwis', umur: 55, jenisKelamin: 'male', jorong: 'Jorong Galuang' }
    ];

    dummyPatients.forEach(p => PatientDB.add(p));

    const dummyScreeningInputs = [
        { patientIdx: 0, sistolik: 155, diastolik: 95, beratBadan: 78, tinggiBadan: 168, merokok: 'active', alkohol: 'tidak', polaGaram: 'high', aktivitasFisik: 'rare', riwayatKeluarga: 'yes', komorbiditas: 'no', riwayatHT: 'ya', minumObatHT: 'tidak' },
        { patientIdx: 1, sistolik: 132, diastolik: 84, beratBadan: 65, tinggiBadan: 155, merokok: 'no', alkohol: 'tidak', polaGaram: 'medium', aktivitasFisik: 'moderate', riwayatKeluarga: 'yes', komorbiditas: 'yes', riwayatHT: 'ya', minumObatHT: 'ya' },
        { patientIdx: 2, sistolik: 118, diastolik: 76, beratBadan: 70, tinggiBadan: 172, merokok: 'no', alkohol: 'tidak', polaGaram: 'low', aktivitasFisik: 'active', riwayatKeluarga: 'no', komorbiditas: 'no', riwayatHT: 'tidak', minumObatHT: 'tidak' },
        { patientIdx: 3, sistolik: 148, diastolik: 92, beratBadan: 82, tinggiBadan: 152, merokok: 'no', alkohol: 'tidak', polaGaram: 'high', aktivitasFisik: 'rare', riwayatKeluarga: 'yes', komorbiditas: 'yes', riwayatHT: 'ya', minumObatHT: 'ya' },
        { patientIdx: 4, sistolik: 135, diastolik: 88, beratBadan: 90, tinggiBadan: 170, merokok: 'active', alkohol: 'ya', polaGaram: 'high', aktivitasFisik: 'rare', riwayatKeluarga: 'no', komorbiditas: 'no', riwayatHT: 'tidak', minumObatHT: 'tidak' },
        { patientIdx: 5, sistolik: 122, diastolik: 78, beratBadan: 58, tinggiBadan: 158, merokok: 'no', alkohol: 'tidak', polaGaram: 'medium', aktivitasFisik: 'moderate', riwayatKeluarga: 'yes', komorbiditas: 'no', riwayatHT: 'ya', minumObatHT: 'ya' },
        { patientIdx: 6, sistolik: 115, diastolik: 72, beratBadan: 75, tinggiBadan: 175, merokok: 'active', alkohol: 'tidak', polaGaram: 'medium', aktivitasFisik: 'active', riwayatKeluarga: 'no', komorbiditas: 'no', riwayatHT: 'tidak', minumObatHT: 'tidak' },
        { patientIdx: 7, sistolik: 160, diastolik: 100, beratBadan: 72, tinggiBadan: 150, merokok: 'no', alkohol: 'tidak', polaGaram: 'high', aktivitasFisik: 'rare', riwayatKeluarga: 'yes', komorbiditas: 'yes', riwayatHT: 'ya', minumObatHT: 'tidak' }
    ];

    dummyScreeningInputs.forEach(input => {
        const p = dummyPatients[input.patientIdx];
        const formData = {
            ...input,
            umur: p.umur,
            jenisKelamin: p.jenisKelamin
        };

        let hasil;
        if (typeof HypertensionScreening !== 'undefined') {
            const screening = new HypertensionScreening(formData);
            hasil = screening.evaluate();
        } else {
            hasil = { statusHT: 'Normal', imt: { nilai: 0, kategori: '-' }, klasifikasiTD: '-', komplikasi: [], komplikasiList: [], riskScore: 0 };
        }

        ScreeningDB.add({
            patientId: p.id,
            jorong: p.jorong,
            nama: p.nama,
            umur: p.umur,
            jenisKelamin: p.jenisKelamin,
            beratBadan: input.beratBadan,
            tinggiBadan: input.tinggiBadan,
            sistolik: input.sistolik,
            diastolik: input.diastolik,
            merokok: input.merokok,
            alkohol: input.alkohol,
            polaGaram: input.polaGaram,
            aktivitasFisik: input.aktivitasFisik,
            riwayatKeluarga: input.riwayatKeluarga,
            komorbiditas: input.komorbiditas,
            riwayatHT: input.riwayatHT,
            minumObatHT: input.minumObatHT,
            edukasi: { hipertensi: true, dashDiet: false, aktivitas: false, alkohol: false },
            hasil: hasil
        });
    });

    console.log('📋 Dummy data loaded successfully.');
}

// ===================== FIRESTORE INITIAL SYNC =====================
async function syncFromFirestore() {
    const loaded = await FirestoreSync.loadAll();

    if (loaded && _memoryDB[DB_KEYS.PATIENTS].length === 0) {
        // Firestore kosong — load dummy data, lalu push ke Firestore
        console.log('☁️ Firestore empty, loading dummy data...');
        loadDummyData();
    }

    // Beritahu seluruh UI untuk re-render
    document.dispatchEvent(new Event('firestore-ready'));
}

// Auto-load: localStorage/memory first (instant), then Firestore (async)
loadDummyData();

// ===================== ONE-TIME CLEANUP SCRIPT =====================
// Menghapus data lama yang menggunakan ID random (bukan NIK)
(function cleanupOldData() {
    setTimeout(() => {
        const patients = PatientDB.getAll();
        let cleaned = false;
        patients.forEach(p => {
            // Jika ID tidak sama dengan NIK, atau ID berawalan "ms" (format random lama)
            if (p.id !== p.nik || String(p.id).startsWith('ms')) { 
                PatientDB.delete(p.id);
                ScreeningDB.deleteByPatientId(p.id);
                cleaned = true;
                console.log('🗑️ Deleted old format record:', p.id);
            }
        });
        if (cleaned) {
            console.log('✅ Old records cleaned up automatically.');
            if (typeof renderDashboard === 'function') renderDashboard();
        }
    }, 4000); // Wait for Firestore initial sync to finish
})();

document.addEventListener('DOMContentLoaded', () => {
    syncFromFirestore();
});
