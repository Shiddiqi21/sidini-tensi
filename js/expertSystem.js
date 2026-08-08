/**
 * SiDini-Tensi Expert System v2
 * Logika Skrining Hipertensi untuk Tenaga Kesehatan (Nakes)
 * Output: IMT, Status HT, Komplikasi, Rekomendasi Intervensi & Follow-Up
 */

class HypertensionScreening {
    constructor(data) {
        this.data = data;
    }

    // ===================== IMT (ASIA PASIFIK) =====================
    calculateIMT() {
        const h = this.data.tinggiBadan / 100;
        const w = this.data.beratBadan;
        if (h <= 0 || w <= 0) return { nilai: 0, kategori: '-' };

        const imt = w / (h * h);
        let kategori = '';
        if (imt < 18.5) kategori = 'Kurus';
        else if (imt < 23) kategori = 'Normal';
        else if (imt < 25) kategori = 'Pre-Obese';
        else if (imt < 30) kategori = 'Obesitas Tipe 1';
        else kategori = 'Obesitas Tipe 2';

        return { nilai: parseFloat(imt.toFixed(1)), kategori };
    }

    // ===================== KLASIFIKASI TEKANAN DARAH =====================
    // Sumber: JNC 8 (Dewasa/Lansia) + Tabel Klasifikasi HT Anak (≥13 tahun)
    classifyBP() {
        const sys = parseInt(this.data.sistolik);
        const dia = parseInt(this.data.diastolik);
        const age = parseInt(this.data.umur) || 0;
        if (!sys || !dia) return { kode: 'unknown', label: 'Data Tidak Lengkap' };

        // ---- ANAK USIA < 13 TAHUN ----
        // Klasifikasi persentil memerlukan data kurva pertumbuhan CDC/WHO.
        // Sistem menyarankan konsultasi dokter anak.
        if (age < 13) {
            if (sys >= 140 || dia >= 90) return { kode: 'ht2', label: 'Hipertensi Tingkat 2 (Anak)' };
            if (sys >= 130 || dia >= 80) return { kode: 'ht1', label: 'Hipertensi Tingkat 1 (Anak)' };
            if (sys >= 120) return { kode: 'preht', label: 'Pre-hipertensi (Anak)' };
            return { kode: 'normal', label: 'Normal (Anak)' };
        }

        // ---- REMAJA USIA 13-17 TAHUN ----
        // Berdasarkan Tabel Klasifikasi HT Anak ≥13 Tahun
        if (age < 18) {
            if (sys >= 140 || dia >= 90) return { kode: 'ht2', label: 'Hipertensi Tingkat 2' };
            if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return { kode: 'ht1', label: 'Hipertensi Tingkat 1' };
            if (sys >= 120 && dia < 80) return { kode: 'preht', label: 'Pre-hipertensi' };
            return { kode: 'normal', label: 'Normal' };
        }

        // ---- DEWASA (≥ 18 TAHUN) — JNC 8 Age-Adjusted ----
        const hasDiabetes = (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.includes('Diabetes')) || this.data.komorbiditas === 'yes';
        const hasGinjal = (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.includes('Ginjal'));
        const isElderlyRelaxed = (age >= 60 && !hasDiabetes && !hasGinjal);

        // Tahap 2 selalu sama: >= 160/100
        if (sys >= 160 || dia >= 100) return { kode: 'ht2', label: 'Hipertensi Tahap 2' };

        if (isElderlyRelaxed) {
            // Lansia (>=60, tanpa DM/GGK): Batas HT1 = 150/90
            if (sys >= 150 || dia >= 90) return { kode: 'ht1', label: 'Hipertensi Tahap 1' };
            if (sys >= 120 || dia >= 80) return { kode: 'preht', label: 'Pre-hipertensi' };
        } else {
            // Usia 18-59 atau punya DM/GGK: Batas HT1 = 140/90
            if (sys >= 140 || dia >= 90) return { kode: 'ht1', label: 'Hipertensi Tahap 1' };
            if (sys >= 120 || dia >= 80) return { kode: 'preht', label: 'Pre-hipertensi' };
        }
        return { kode: 'normal', label: 'Normal' };
    }

    // ===================== STATUS HIPERTENSI =====================
    // 3 Status: "Bukan Hipertensi", "Terkontrol", "Tidak Terkontrol"
    determineHTStatus(bpClass) {
        const hasHistoryHT = this.data.riwayatHT === 'ya';
        const onMedication = this.data.minumObatHT === 'ya';
        const isHTNow = (bpClass.kode === 'ht1' || bpClass.kode === 'ht2');

        // 1. Bukan penderita HT: Tidak punya riwayat DAN tekanan darah saat ini tidak tinggi
        if (!hasHistoryHT && !isHTNow) {
            return 'Bukan Hipertensi';
        }

        // 2. Punya riwayat HT atau baru terdeteksi HT saat ini:
        //    - Terkontrol = rutin minum obat (kepatuhan obat)
        if (hasHistoryHT && onMedication) {
            return 'Terkontrol';
        }

        //    - Tidak Terkontrol = punya riwayat HT tapi TIDAK minum obat,
        //      ATAU baru pertama kali ditemukan tekanan darah tinggi (HT baru)
        return 'Tidak Terkontrol';
    }

    // ===================== SKOR RISIKO =====================
    calculateRiskScore(imt, bpClass) {
        let score = 0;

        // Usia
        if (this.data.umur >= 55) score += 2;
        else if (this.data.umur >= 45) score += 1;

        // IMT
        if (imt.kategori === 'Obesitas Tipe 2') score += 3;
        else if (imt.kategori === 'Obesitas Tipe 1') score += 2;
        else if (imt.kategori === 'Pre-Obese') score += 1;

        // Tekanan Darah
        if (bpClass.kode === 'ht2') score += 4;
        else if (bpClass.kode === 'ht1') score += 2;
        else if (bpClass.kode === 'preht') score += 1;

        // Riwayat keluarga
        if (this.data.riwayatKeluarga === 'yes') score += 2;

        // Komorbiditas (Diabetes/Ginjal/Jantung)
        if (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.length > 0) score += 3;
        else if (this.data.komorbiditas === 'yes') score += 3;

        // Merokok
        if (this.data.merokok === 'active') score += 2;
        else if (this.data.merokok === 'passive') score += 1;

        // Alkohol
        if (this.data.alkohol === 'ya') score += 2;

        // Pola Makan Asin
        if (this.data.polaGaram === 'high') score += 2;
        else if (this.data.polaGaram === 'medium') score += 1;

        // Aktivitas Fisik
        if (this.data.aktivitasFisik === 'rare') score += 2;
        else if (this.data.aktivitasFisik === 'moderate') score += 1;

        // Faktor Stres (1 poin per faktor)
        if (Array.isArray(this.data.stress) && this.data.stress.length > 0) {
            score += this.data.stress.length;
        }

        return score;
    }

    // ===================== RISIKO KARDIOVASKULAR (WHO 2020) =====================
    assessComplications(bpClass, imt) {
        const komplikasi = [];
        const sys = parseInt(this.data.sistolik) || 120;
        const bmi = imt.nilai || 22;
        const age = parseInt(this.data.umur) || 40;
        const isSmoker = this.data.merokok === 'active';
        const isMale = this.data.jenisKelamin === 'male';

        // Base score mapped roughly to WHO 2020 SEAR Non-Lab Chart
        let base = 1;
        if (age >= 70) base = isMale ? (isSmoker ? 15 : 11) : (isSmoker ? 14 : 10);
        else if (age >= 65) base = isMale ? (isSmoker ? 11 : 8) : (isSmoker ? 11 : 7);
        else if (age >= 60) base = isMale ? (isSmoker ? 8 : 5) : (isSmoker ? 8 : 5);
        else if (age >= 55) base = isMale ? (isSmoker ? 6 : 4) : (isSmoker ? 6 : 3);
        else if (age >= 50) base = isMale ? (isSmoker ? 4 : 2) : (isSmoker ? 5 : 2);
        else if (age >= 45) base = isMale ? (isSmoker ? 3 : 2) : (isSmoker ? 4 : 2);
        else base = isMale ? (isSmoker ? 2 : 1) : (isSmoker ? 3 : 1);

        // Multipliers for SBP and BMI
        let sbpMult = 1.0;
        if (sys >= 180) sbpMult = 2.6;
        else if (sys >= 160) sbpMult = 2.0;
        else if (sys >= 140) sbpMult = 1.5;
        else if (sys >= 120) sbpMult = 1.2;

        let bmiMult = 1.0;
        if (bmi >= 35) bmiMult = 1.6;
        else if (bmi >= 30) bmiMult = 1.4;
        else if (bmi >= 25) bmiMult = 1.2;
        else if (bmi >= 20) bmiMult = 1.1;

        let riskPercent = Math.round(base * sbpMult * bmiMult);

        // Categorize
        let level = '';
        let desc = '';
        let displayPercent = riskPercent >= 30 ? '≥30%' : (riskPercent < 1 ? '<1%' : riskPercent + '%');

        if (riskPercent >= 30) {
            level = displayPercent + ' (Sangat Tinggi)';
            desc = 'Risiko fatal kardiovaskular dalam 10 tahun sangat tinggi (Merah Tua). Segera rujuk dan mulai terapi intensif.';
        } else if (riskPercent >= 20) {
            level = displayPercent + ' (Tinggi)';
            desc = 'Risiko tinggi (Merah). Intervensi gaya hidup ketat dan terapi farmakologis diperlukan.';
        } else if (riskPercent >= 10) {
            level = displayPercent + ' (Sedang)';
            desc = 'Risiko sedang (Jingga). Pemantauan rutin dan modifikasi gaya hidup.';
        } else if (riskPercent >= 5) {
            level = displayPercent + ' (Kuning)';
            desc = 'Risiko rendah-sedang (Kuning). Tingkatkan gaya hidup sehat.';
        } else {
            level = displayPercent + ' (Rendah)';
            desc = 'Risiko rendah (Hijau). Pertahankan gaya hidup sehat.';
        }

        komplikasi.push({ 
            organ: 'Risiko Kardiovaskular (WHO)', 
            level: level, 
            desc: desc 
        });

        return komplikasi;
    }

    // ===================== REKOMENDASI =====================
    generateRecommendations(statusHT, bpClass, imt, komplikasi, riskScore) {
        const intervensi = [];
        const followUp = [];

        // --- Intervensi berdasarkan kondisi ---
        if (imt.kategori.includes('Obesitas') || imt.kategori === 'Pre-Obese') {
            const tinggiM = this.data.tinggiBadan / 100;
            const bbIdeal = parseFloat((23 * tinggiM * tinggiM).toFixed(1)); // Target IMT 23 (batas atas normal Asia Pasifik)
            const bbSekarang = this.data.beratBadan;
            const selisih = parseFloat((bbSekarang - bbIdeal).toFixed(1));
            if (selisih > 0) {
                intervensi.push(`Penurunan berat badan: BB saat ini ${bbSekarang} kg, BB ideal ≤ ${bbIdeal} kg. Target turunkan ${selisih} kg secara bertahap (0.5-1 kg/minggu) dalam 6 bulan pertama.`);
            } else {
                intervensi.push('Jaga berat badan: Pertahankan berat badan pada rentang IMT normal (18.5-23 kg/m²).');
            }
            intervensi.push('Jaga berat badan: Batasi porsi makan berlebih dan tingkatkan aktivitas fisik (Cegah Obesitas).');
        }

        if (this.data.polaGaram === 'high') {
            intervensi.push('Diet rendah garam (DASH Diet): Batasi asupan garam < 5g per hari (maks 1 sdt). Perbanyak sayuran dan buah segar.');
        }

        if (this.data.aktivitasFisik === 'rare') {
            intervensi.push('Aktivitas fisik: Olahraga aerobik secara regular (≥30 menit olahraga moderat dinamis 5-7 kali/minggu).');
        }

        if (this.data.merokok === 'active') {
            intervensi.push('Berhenti merokok: Sangat mendesak. Rujuk ke program berhenti merokok jika tersedia.');
        }

        if (this.data.alkohol === 'ya') {
            intervensi.push('Berhenti konsumsi alkohol: Alkohol meningkatkan tekanan darah secara signifikan.');
        }

        if (Array.isArray(this.data.stress) && this.data.stress.length > 0) {
            intervensi.push(`Manajemen Stres (${this.data.stress.join(', ')}): Anjurkan metode relaksasi, koping stres positif, atau rujuk ke layanan konseling jika diperlukan.`);
        }

        // Target BP JNC 8 & Kemkes
        const hasDiabetes = (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.includes('Diabetes')) || this.data.komorbiditas === 'yes';
        const hasKomorbid = (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.length > 0) || this.data.komorbiditas === 'yes';
        const age = parseInt(this.data.umur) || 0;
        const hasGinjal = (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.includes('Ginjal'));
        let targetTD = '< 140/90 mmHg';
        if (age >= 60 && !hasDiabetes && !hasGinjal) targetTD = '< 150/90 mmHg';
        if (hasDiabetes) targetTD = '< 140/90 mmHg (atau < 130/80 jika dapat ditoleransi)';

        if (bpClass.kode === 'ht2') {
            intervensi.push(`Terapi Farmakologis: Obat antihipertensi disarankan. Target TD: ${targetTD}. Rujuk ke dokter.`);
        } else if (bpClass.kode === 'ht1') {
            intervensi.push(`Evaluasi Gaya Hidup / Obat: Jika modifikasi gaya hidup tidak berhasil, pertimbangkan obat. Target TD: ${targetTD}.`);
        } else if (bpClass.kode === 'preht') {
            intervensi.push('Modifikasi Gaya Hidup: Perubahan gaya hidup sangat direkomendasikan untuk mencegah hipertensi.');
        }

        if (statusHT === 'Tidak Terkontrol' && this.data.minumObatHT === 'ya') {
            intervensi.push('Evaluasi obat: Tekanan darah belum terkontrol meski sudah minum obat. Rujuk ke dokter untuk penyesuaian dosis/jenis obat.');
        }

        if (hasKomorbid) {
            intervensi.push('Penanganan Komorbid: Kontrol penyakit penyerta (seperti gula darah, ginjal, atau jantung) secara berkala.');
        }

        if (intervensi.length === 0) {
            intervensi.push('Pertahankan gaya hidup sehat saat ini. Tidak ada intervensi mendesak yang diperlukan.');
        }

        // --- Jadwal Follow-Up ---
        const sys = parseInt(this.data.sistolik) || 0;
        const dia = parseInt(this.data.diastolik) || 0;
        if (sys >= 180 || dia >= 120) {
            followUp.push('SEGERA: Krisis Hipertensi! Rujuk ke IGD / faskes tingkat lanjut.');
            followUp.push('Follow-up dalam 24-48 jam setelah rujukan.');
        } else if (statusHT === 'Tidak Terkontrol') {
            followUp.push('Kontrol ulang: 2 minggu setelah intervensi/perubahan obat.');
            followUp.push('Evaluasi bulanan hingga tekanan darah terkontrol.');
        } else if (statusHT === 'Terkontrol') {
            followUp.push('Kontrol rutin: Setiap 3 bulan untuk memantau stabilitas.');
            followUp.push('Cek laboratorium (gula darah, fungsi ginjal) setiap 6 bulan.');
        } else {
            // Bukan Hipertensi
            followUp.push('Skrining ulang: 1 tahun ke depan (jika tidak ada keluhan).');
            followUp.push('Edukasi preventif tetap diberikan.');
        }

        return { intervensi, followUp };
    }

    // ===================== MAIN EVALUATE =====================
    evaluate() {
        const imt = this.calculateIMT();
        const bpClass = this.classifyBP();
        const statusHT = this.determineHTStatus(bpClass);
        const riskScore = this.calculateRiskScore(imt, bpClass);
        const komplikasi = this.assessComplications(bpClass, imt);
        const rekomendasi = this.generateRecommendations(statusHT, bpClass, imt, komplikasi, riskScore);

        return {
            imt,
            klasifikasiTD: bpClass.label,
            statusHT,
            riskScore,
            komplikasi,
            rekomendasi,
            // Mapped komplikasi organ names for DB storage
            komplikasiList: komplikasi.map(k => k.organ)
        };
    }
}
