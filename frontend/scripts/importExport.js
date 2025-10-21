async function exportUserData() {
    try {
        console.log(
            localStorage.getItem('auth_jwt_token') ||
                sessionStorage.getItem('auth_jwt_token'),
        );
        const response = await fetch('/api/importExport/export', {
            method: 'GET',
            headers: {
                authorization: `Bearer ${localStorage.getItem('auth_jwt_token') || sessionStorage.getItem('auth_jwt_token')}`,
            },
        });
        console.log(response);
        const textCheck = await response.clone().text();
        console.log('First 200 chars of response:', textCheck.slice(0, 200));
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Optional: filename based on user id & date
        const filename = `userdata_${new Date().toISOString()}.sqlite`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        console.log('User data exported successfully!');
    } catch (err) {
        console.error(err);
        alert('Failed to export user data');
    }
}

async function importUserData(file) {
    try {
        if (!file) {
            alert('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/importExport/import', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${localStorage.getItem('auth_jwt_token') || sessionStorage.getItem('auth_jwt_token')}`,
            },
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Import failed');

        console.log(result.message);
        alert('User data imported successfully!');
    } catch (err) {
        console.error(err);
        alert('Failed to import user data');
    }
}

window.exportUserData = exportUserData;
window.importUserData = importUserData;
