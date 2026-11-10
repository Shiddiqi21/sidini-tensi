import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

komorbid_pattern = r'(<div class=" form-grid\>\s*<div class=\form-group\>\s*<label>Komorbid.*?</div>\s*</div>)'
pengukuran_pattern = r'(<!-- SECTION B: Pengukuran Fisik -->\s*<div class=\card\.*?<!-- SECTION C: Riwayat & Gaya Hidup -->)'
riwayat_pattern = r'(<!-- SECTION C: Riwayat & Gaya Hidup -->\s*<div class=\card\.*?<!-- SECTION D: Edukasi -->)'

# Wait, the Regex might fail with newlines. Let me do string manipulation.
