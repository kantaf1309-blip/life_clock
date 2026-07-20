// firebase-sync.js

// Helper to save all data to Firestore
window.syncToCloud = function(syncKey) {
    if (!window.db || !syncKey) return;
    
    // Get all local data
    const dreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];
    const habits = JSON.parse(localStorage.getItem('lifeClockHabits')) || [];
    const habitLogs = JSON.parse(localStorage.getItem('lifeClockHabitLogs')) || {};
    const books = JSON.parse(localStorage.getItem('lifeClockBooks')) || [];

    window.db.collection('users').doc(syncKey).set({
        dreams: dreams,
        habits: habits,
        habitLogs: habitLogs,
        books: books,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(() => {
        console.log("Successfully synced to cloud.");
    })
    .catch((error) => {
        console.error("Error syncing to cloud: ", error);
    });
};

// Start listening to cloud changes
window.startCloudSync = function(syncKey) {
    if (!window.db || !syncKey) return;

    // Remove existing listener if any
    if (window.unsubCloud) {
        window.unsubCloud();
    }

    // Flag to ignore the first snapshot if it's just local cache
    let isInitialLoad = true;

    window.unsubCloud = window.db.collection('users').doc(syncKey).onSnapshot((docSnapshot) => {
        if (docSnapshot.exists) {
            const data = docSnapshot.data();
            
            // Only update local if cloud has data
            if (data.dreams) localStorage.setItem('lifeClockDreams', JSON.stringify(data.dreams));
            if (data.habits) localStorage.setItem('lifeClockHabits', JSON.stringify(data.habits));
            if (data.habitLogs) localStorage.setItem('lifeClockHabitLogs', JSON.stringify(data.habitLogs));
            if (data.books) localStorage.setItem('lifeClockBooks', JSON.stringify(data.books));
            
            // Trigger UI reload by calling the global reload function from script.js
            // But don't do it if we are just receiving the same local data we just pushed
            if (!docSnapshot.metadata.hasPendingWrites) {
                if (typeof window.reloadAllData === 'function') {
                    window.reloadAllData();
                }
            }
        } else {
            // First time syncing with this key, push local data to cloud
            window.syncToCloud(syncKey);
        }
    }, (error) => {
        console.error("Error listening to cloud: ", error);
        alert("同期中にエラーが発生しました。合言葉が正しいか、通信環境をご確認ください。");
    });
};

// Monkey-patch the local save functions to also push to cloud
window.triggerCloudSync = function() {
    const syncKey = localStorage.getItem('lifeClockSyncKey');
    if (syncKey) {
        window.syncToCloud(syncKey);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const syncOverlay = document.getElementById('sync-overlay');
    const settingsBtn = document.getElementById('settings-btn');
    const syncForm = document.getElementById('sync-form');
    const syncKeyInput = document.getElementById('sync-key-input');

    // Hide overlay initially
    if (syncOverlay) syncOverlay.style.display = 'none';

    // Load existing key
    const currentSyncKey = localStorage.getItem('lifeClockSyncKey');
    if (currentSyncKey) {
        if (syncKeyInput) syncKeyInput.value = currentSyncKey;
        // Start sync immediately
        window.startCloudSync(currentSyncKey);
    }

    // Open settings modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (syncOverlay) syncOverlay.style.display = 'flex';
        });
    }

    // Handle form submit
    if (syncForm) {
        syncForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newKey = syncKeyInput.value.trim();
            if (newKey) {
                localStorage.setItem('lifeClockSyncKey', newKey);
                window.startCloudSync(newKey);
                if (syncOverlay) syncOverlay.style.display = 'none';
                alert('同期設定が完了しました！');
            }
        });
    }

    // Close on background click
    if (syncOverlay) {
        syncOverlay.addEventListener('click', (e) => {
            if (e.target === syncOverlay) {
                syncOverlay.style.display = 'none';
            }
        });
    }
});
