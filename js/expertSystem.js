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

    // ===================== KLASIFIKASI TEKANAN DARAH (JNC 8) =====================
    classifyBP() {
        const sys = parseInt(this.data.sistolik);
        const dia = parseInt(this.data.diastolik);
        if (!sys || !dia) return { kode: 'unknown', label: 'Data Tidak Lengkap' };

        if (sys >= 160 || dia >= 100) return { kode: 'ht2', label: 'Hipertensi Tahap 2' };
        if (sys >= 140 || dia >= 90) return { kode: 'ht1', label: 'Hipertensi Tahap 1' };
        if (sys >= 120 || dia >= 80) return { kode: 'preht', label: 'Pre-hipertensi' };
        return { kode: 'normal', label: 'Normal' };
    }

    // ===================== STATUS HIPERTENSI =====================
    determineHTStatus(bpClass) {
        const hasHistoryHT = this.data.riwayatHT === 'ya';
        const onMedication = this.data.minumObatHT === 'ya';

        // Jika tekanan darah normal & punya riwayat HT & minum obat -> Terkontrol
        if (hasHistoryHT && onMedication && (bpClass.kode === 'normal' || bpClass.kode === 'preht')) {
            return 'Terkontrol';
        }

        // Jika tekanan darah masih tinggi meskipun sudah minum obat -> Tidak Terkontrol
        if (hasHistoryHT && onMedication && (bpClass.kode === 'ht1' || bpClass.kode === 'ht2')) {
            return 'Tidak Terkontrol';
        }

        // Jika tekanan darah tinggi & tidak ada riwayat / tidak minum obat -> Tidak Terkontrol
        if (bpClass.kode === 'ht1' || bpClass.kode === 'ht2') {
            return 'Tidak Terkontrol';
        }

        // Jika punya riwayat HT tapi tidak minum obat & tekanan darah normal -> Terkontrol (oleh gaya hidup)
        if (hasHistoryHT && !onMedication && (bpClass.kode === 'normal' || bpClass.kode === 'preht')) {
            return 'Terkontrol';
        }

        return 'Normal';
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
        if (imt.kategori.includes('Obesitas')) {
            intervensi.push('Penurunan berat badan: Target penurunan 5-10% BB dalam 6 bulan pertama (Target BMI ideal 20-25 kg/m²).');
        } else if (imt.kategori === 'Pre-Obese') {
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

        // Target BP JNC 8 & Kemkes
        const hasDiabetes = (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.includes('Diabetes')) || this.data.komorbiditas === 'yes';
        const hasKomorbid = (Array.isArray(this.data.komorbiditas) && this.data.komorbiditas.length > 0) || this.data.komorbiditas === 'yes';
        const age = parseInt(this.data.umur) || 0;
        let targetTD = '< 140/90 mmHg';
        if (age >= 60 && !hasDiabetes) targetTD = '< 150/90 mmHg';
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
