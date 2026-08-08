// admin.js - Manajemen Akses & Role

document.addEventListener('DOMContentLoaded', () => {
    const formAddAdmin = document.getElementById('form-add-admin');
    if (formAddAdmin) {
        formAddAdmin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!window.currentUser || window.currentUser.role !== 'superadmin') {
                alert('Akses Ditolak!');
                return;
            }

            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            const role = document.getElementById('admin-role').value;
            const jorong = document.getElementById('admin-jorong').value;

            if (password.length < 6) {
                alert('Password minimal 6 karakter.');
                return;
            }

            const btn = document.getElementById('btn-save-admin');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Menyimpan...';
            btn.disabled = true;

            try {
                // 1. Create User di Firebase Auth menggunakan secondary app agar tidak me-logout Super Admin
                const secondaryApp = firebase.initializeApp(firebase.app().options, "SecondaryApp");
                await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
                await secondaryApp.auth().signOut();
                secondaryApp.delete(); // cleanup

                // 2. Simpan kredensial ke Firestore `users` collection
                await firestoreDB.collection('users').doc(email).set({
                    email: email,
                    password: password, // Sesuai permintaan (tidak disarankan untuk prod)
                    role: role,
                    jorong: role === 'admin' ? jorong : null,
                    createdAt: new Date().toISOString()
                });

                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Akun admin berhasil dibuat!' });
                }
                formAddAdmin.reset();
                document.getElementById('admin-jorong-group').style.display = 'block';
                renderAdminTable();
            } catch (err) {
                console.error("Gagal membuat admin:", err);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
                } else {
                    alert('Gagal: ' + err.message);
                }
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});

window.renderAdminTable = async function() {
    const tbody = document.getElementById('table-admin-body');
    if (!tbody || !firestoreDB) return;

    if (!window.currentUser || window.currentUser.role !== 'superadmin') {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Akses Ditolak</td></tr>';
        return;
    }

    try {
        const snapshot = await firestoreDB.collection('users').get();
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada admin terdaftar.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');
            
            // Password display toggle
            const passId = `pass-${doc.id.replace(/[^a-zA-Z0-9]/g, '')}`;
            
            tr.innerHTML = `
                <td>${data.email}</td>
                <td><span class="status-badge ${data.role === 'superadmin' ? 'info' : 'warning'}">${data.role.toUpperCase()}</span></td>
                <td>${data.jorong || '-'}</td>
                <td style="display:flex; align-items:center; gap:10px;">
                    <span id="${passId}" style="filter: blur(4px); cursor: pointer; transition: 0.2s;">${data.password || '???'}</span>
                    <button class="btn btn-sm btn-outline" style="padding: 2px 5px;" onclick="document.getElementById('${passId}').style.filter = document.getElementById('${passId}').style.filter === 'none' ? 'blur(4px)' : 'none'"><i class="ph-bold ph-eye"></i></button>
                </td>
                <td style="text-align:center;">
                    <button class="btn btn-sm btn-danger" onclick="deleteAdmin('${data.email}')"><i class="ph-bold ph-trash"></i> Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Gagal load admin:", err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat data. Pastikan koneksi internet stabil.</td></tr>';
    }
};

window.deleteAdmin = async function(email) {
    if (!confirm(`Yakin ingin menghapus akses admin untuk ${email}? (Hanya menghapus akses databasenya, user Auth tidak terhapus sepenuhnya dari cloud Firebase)`)) return;
    
    try {
        await firestoreDB.collection('users').doc(email).delete();
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'Dihapus', text: 'Akses admin telah dicabut.' });
        }
        renderAdminTable();
    } catch (e) {
        console.error("Gagal hapus:", e);
        alert('Gagal menghapus admin.');
    }
};
