with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(lines, search_str, start_idx=0):
    for i in range(start_idx, len(lines)):
        if search_str in lines[i]:
            return i
    return -1

# 1. End of Hidden Inputs in Section A
idx_hidden_end = find_line(lines, '                </div>') # at line 363 (but wait, there are multiple)

# Better to find by unique strings
idx_komorbid_start = find_line(lines, '                    <div class=" form-group\>') # inside form-grid of komorbid
# Actually let's search specifically:
idx_komorbid_grid_start = find_line(lines, ' <div class=\form-grid\>', find_line(lines, '<!-- Hidden inputs for form submission -->'))
idx_komorbid_end = find_line(lines, ' <!-- SECTION B: Pengukuran Fisik -->')

komorbid_lines = lines[idx_komorbid_grid_start:idx_komorbid_end]

idx_pengukuran_start = find_line(lines, ' <!-- SECTION B: Pengukuran Fisik -->')
idx_pengukuran_end = find_line(lines, ' <!-- SECTION C: Riwayat & Gaya Hidup -->')
pengukuran_lines = lines[idx_pengukuran_start:idx_pengukuran_end]

idx_riwayat_start = find_line(lines, ' <!-- SECTION C: Riwayat & Gaya Hidup -->')
idx_riwayat_end = find_line(lines, ' <!-- SECTION D: Edukasi -->')
riwayat_lines = lines[idx_riwayat_start:idx_riwayat_end]

# Modify headings
for i in range(len(pengukuran_lines)):
 if 'B. Pengukuran Fisik & Tekanan Darah' in pengukuran_lines[i]:
 pengukuran_lines[i] = pengukuran_lines[i].replace('B. Pengukuran Fisik', 'C. Pengukuran Fisik')
 if '<!-- SECTION B:' in pengukuran_lines[i]:
 pengukuran_lines[i] = pengukuran_lines[i].replace('SECTION B', 'SECTION C')

for i in range(len(riwayat_lines)):
 if 'C. Riwayat Medis & Gaya Hidup' in riwayat_lines[i]:
 riwayat_lines[i] = riwayat_lines[i].replace('C. Riwayat Medis', 'B. Riwayat Medis')
 if '<!-- SECTION C:' in riwayat_lines[i]:
 riwayat_lines[i] = riwayat_lines[i].replace('SECTION C', 'SECTION B')

# Now we need to insert komorbid_lines into riwayat_lines.
# riwayat_lines has a <div class=\form-grid\> at the beginning. We should put komorbid inside it.
idx_riwayat_grid = find_line(riwayat_lines, '<div class=\form-grid\>')

# komorbid_lines starts with <div class=\form-grid\> and ends with </div>\n </div>\n
# So we extract the inner content of komorbid_lines
inner_komorbid = komorbid_lines[1:-2] 

# Insert inner_komorbid into riwayat_lines just after <div class=\form-grid\>
new_riwayat = riwayat_lines[:idx_riwayat_grid+1] + inner_komorbid + riwayat_lines[idx_riwayat_grid+1:]

# Combine everything
new_lines = lines[:idx_komorbid_grid_start-1] + [' </div>\n\n'] + new_riwayat + pengukuran_lines + lines[idx_riwayat_end:]

with open('index.html', 'w', encoding='utf-8') as f:
 f.writelines(new_lines)
print(\Done\)
