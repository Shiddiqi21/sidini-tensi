import pandas as pd
import json
import math
import uuid

EXCEL_FILE = r"C:\Users\ASUS iD\Downloads\HT - RAWANG BUNIAN.xlsx"
OUTPUT_JS = r"C:\Users\ASUS iD\Downloads\Project KKN\js\import_data.js"

def clean_val(val):
    if pd.isna(val) or val == 'nan':
        return None
    return val

try:
    # Read the data, headers are on row 2 (0-indexed 1)
    df = pd.read_excel(EXCEL_FILE, header=2)
    
    patients = []
    screenings = []
    
    months_mapping = [
        ("JANUARI", "11", "12", "13", "14", "15", "16", "2026-01-15T00:00:00.000Z"),
        ("FEBRUARI", "17", "18", "19", "20", "21", "22", "2026-02-15T00:00:00.000Z"),
        ("MARET", "23", "24", "25", "26", "27", "28", "2026-03-15T00:00:00.000Z"),
        ("APRIL", "29", "30", "31", "32", "33", "34", "2026-04-15T00:00:00.000Z"),
        ("MEI", "35", "36", "37", "38", "39", "40", "2026-05-15T00:00:00.000Z"),
        ("JUNI", "41", "42", "43", "44", "45", "46", "2026-06-15T00:00:00.000Z") # Jun only has 4 cols, we will handle safely
    ]
    
    for index, row in df.iterrows():
        # skip empty rows based on NIK
        nik = clean_val(row.get('NIK '))
        if not nik:
            continue
            
        nik_str = str(int(nik)) if isinstance(nik, (int, float)) else str(nik)
        
        # Parse Patient
        nama = str(clean_val(row.get('NAMA ')) or "")
        jk_raw = str(clean_val(row.get('JENIS KELAMIN')) or "").lower()
        jk = "female" if "perempuan" in jk_raw else "male"
        
        umur_raw = clean_val(row.get('UMUR '))
        umur = int(umur_raw) if umur_raw else 0
        
        jorong = str(clean_val(row.get('JORONG ')) or "RAWANG BUNIAN")
        kategori_kasus = str(clean_val(row.get('KATEGORI KASUS')) or "Lama")
        
        patient = {
            "id": nik_str,
            "nik": nik_str,
            "nama": nama,
            "jenisKelamin": jk,
            "umur": umur,
            "noHp": "",
            "jorong": jorong,
            "createdAt": "2026-01-01T00:00:00.000Z" # Base date
        }
        patients.append(patient)
        
        # Parse Screenings per month
        # We find the col index by name
        for month_name, col_sis, col_dia, col_stat, col_obat_ada, col_obat_minum, col_rujuk, date_str in months_mapping:
            # We must use column names or indices. Since pandas auto-names Unnamed, we'll use indices if pos
            try:
                sis_val = clean_val(row.iloc[int(col_sis)])
                dia_val = clean_val(row.iloc[int(col_dia)])
            except IndexError:
                continue
                
            if sis_val is not None and dia_val is not None:
                try:
                    sistolik = int(sis_val)
                    diastolik = int(dia_val)
                    
                    obat_ada = str(clean_val(row.iloc[int(col_obat_ada)]) or "") if int(col_obat_ada) < len(row) else ""
                    
                    # Generate random ID for screening
                    scr_id = str(uuid.uuid4())
                    
                    screening = {
                        "id": scr_id,
                        "patientId": nik_str,
                        "tanggalSkrining": date_str,
                        "kategoriKasus": kategori_kasus,
                        "sistolik": sistolik,
                        "diastolik": diastolik,
                        "merokok": "tidak",
                        "diabetes": "tidak",
                        "riwayatHT": "ya" if kategori_kasus.lower() == "lama" else "tidak",
                        "riwayatStroke": "tidak",
                        "riwayatJantung": "tidak",
                        "riwayatGinjal": "tidak",
                        "obatAntihipertensi": "Ada" if obat_ada.lower() == "ada" else "",
                        "createdAt": date_str
                    }
                    
                    screenings.append(screening)
                except Exception as e:
                    print(f"Error parsing screening for {nama} on month {month_name}: {e}")
                    pass
                    
    # Generate JS script
    js_code = f"""
// Auto-generated script to import data from Excel
console.log("Mulai mengimpor data...");
const newPatients = {json.dumps(patients, indent=2)};
const newScreenings = {json.dumps(screenings, indent=2)};

let importedPatients = 0;
let importedScreenings = 0;

if (typeof PatientDB !== 'undefined' && typeof ScreeningDB !== 'undefined' && typeof determineHTStatus !== 'undefined') {{
    newPatients.forEach(p => {{
        const exist = PatientDB.getById(p.id);
        if (!exist) {{
            PatientDB.savePatient(p);
            importedPatients++;
        }}
    }});
    
    newScreenings.forEach(s => {{
        // Cek kalau udah ada skrining di tanggal ini
        const existingS = ScreeningDB.getByPatientId(s.patientId).find(xs => xs.tanggalSkrining === s.tanggalSkrining);
        if (!existingS) {{
            // Auto run expert system to determine risk and status
            let umur = newPatients.find(p => p.id === s.patientId)?.umur || 50;
            s.hasil = determineHTStatus(
                s.sistolik, s.diastolik, 
                umur, s.merokok, s.diabetes,
                s.riwayatHT, s.riwayatStroke, s.riwayatJantung, s.riwayatGinjal
            );
            ScreeningDB.saveScreening(s);
            importedScreenings++;
        }}
    }});
    
    // Call Dashboard Render if on dashboard
    if (typeof renderDashboard === 'function') {{
        renderDashboard();
    }}
    
    // Alert the user
    Swal.fire('Sukses', 'Berhasil mengimpor ' + importedPatients + ' pasien baru dan ' + importedScreenings + ' riwayat tensi!', 'success');
}} else {{
    console.error("Sistem Database tidak ditemukan di halaman ini. Pastikan dijalankan di aplikasi SiDini.");
}}
"""

    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_code)
        
    print(f"Successfully generated JS script with {len(patients)} patients and {len(screenings)} screenings.")

except Exception as e:
    import traceback
    traceback.print_exc()
