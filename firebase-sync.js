// firebase-sync.js

// Helper to save all data to Firestore
window.syncToCloud = async function(syncKey) {
    if (!window.db || !syncKey) return;
    
    // Get all local data
    const dreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];
    const habits = JSON.parse(localStorage.getItem('lifeClockHabits')) || [];
    const habitLogs = JSON.parse(localStorage.getItem('lifeClockHabitLogs')) || {};
    const books = JSON.parse(localStorage.getItem('lifeClockBooks')) || [];

    try {
        const batch = window.db.batch();
        
        // 1. Data subcollection for text-based data
        const dataRef = window.db.collection('users').doc(syncKey).collection('data');
        batch.set(dataRef.doc('habits'), { data: habits });
        batch.set(dataRef.doc('habitLogs'), { data: habitLogs });
        batch.set(dataRef.doc('books'), { data: books });

        // 2. Dreams subcollection for potentially large items (images)
        const dreamsRef = window.db.collection('users').doc(syncKey).collection('dreams');
        
        // Fetch existing cloud dreams to handle deletions
        const cloudDreamsSnap = await dreamsRef.get();
        const cloudDreamIds = new Set(cloudDreamsSnap.docs.map(doc => doc.id));
        const localDreamIds = new Set(dreams.map(d => d.id));
        
        cloudDreamIds.forEach(id => {
            if (!localDreamIds.has(id)) {
                batch.delete(dreamsRef.doc(id));
            }
        });
        
        let localDreamsModified = false;
        dreams.forEach(dream => {
            const size = JSON.stringify(dream).length;
            if (size > 900000) {
                console.warn(`Dream ${dream.id} is too large (${size} bytes). Stripping image data to allow sync.`);
                dream.imageData = '';
                localDreamsModified = true;
                batch.set(dreamsRef.doc(dream.id), dream);
            } else {
                batch.set(dreamsRef.doc(dream.id), dream);
            }
        });
        
        if (localDreamsModified) {
            localStorage.setItem('lifeClockDreams', JSON.stringify(dreams));
        }

        // 3. Metadata
        // Overwrite the main document to clear out the old >1MB arrays, preventing size errors
        batch.set(window.db.collection('users').doc(syncKey), {
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            version: 2
        });

        await batch.commit();
        console.log("Successfully synced to cloud (v2 structure).");
    } catch (error) {
        console.error("Error syncing to cloud: ", error);
    }
};

// Start listening to cloud changes
window.startCloudSync = function(syncKey) {
    if (!window.db || !syncKey) return;

    // Remove existing listeners if any
    if (window.unsubCloudMeta) window.unsubCloudMeta();
    if (window.unsubCloudHabits) window.unsubCloudHabits();
    if (window.unsubCloudLogs) window.unsubCloudLogs();
    if (window.unsubCloudBooks) window.unsubCloudBooks();
    if (window.unsubCloudDreams) window.unsubCloudDreams();

    let reloadTimeout = null;
    const triggerReload = (hasPendingWrites) => {
        if (hasPendingWrites) return;
        if (reloadTimeout) clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(() => {
            if (typeof window.reloadAllData === 'function') {
                window.reloadAllData();
            }
        }, 300);
    };

    const dataRef = window.db.collection('users').doc(syncKey).collection('data');
    const dreamsRef = window.db.collection('users').doc(syncKey).collection('dreams');

    window.unsubCloudHabits = dataRef.doc('habits').onSnapshot(snap => {
        if (snap.exists) {
            localStorage.setItem('lifeClockHabits', JSON.stringify(snap.data().data));
            triggerReload(snap.metadata.hasPendingWrites);
        }
    });

    window.unsubCloudLogs = dataRef.doc('habitLogs').onSnapshot(snap => {
        if (snap.exists) {
            localStorage.setItem('lifeClockHabitLogs', JSON.stringify(snap.data().data));
            triggerReload(snap.metadata.hasPendingWrites);
        }
    });

    window.unsubCloudBooks = dataRef.doc('books').onSnapshot(snap => {
        if (snap.exists) {
            localStorage.setItem('lifeClockBooks', JSON.stringify(snap.data().data));
            triggerReload(snap.metadata.hasPendingWrites);
        }
    });

    window.unsubCloudDreams = dreamsRef.onSnapshot(snap => {
        if (!snap.empty) {
            const dreams = [];
            snap.forEach(doc => {
                dreams.push(doc.data());
            });
            localStorage.setItem('lifeClockDreams', JSON.stringify(dreams));
            triggerReload(snap.metadata.hasPendingWrites);
        }
    });

    window.unsubCloudMeta = window.db.collection('users').doc(syncKey).onSnapshot(snap => {
        if (!snap.exists) {
            // First time syncing with this key, push local data to cloud
            window.syncToCloud(syncKey);
        } else {
            const data = snap.data();
            if (data.version !== 2) {
                // Migrate from v1 to v2: pull v1 data to local if local is empty, then push as v2
                const localDreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];
                const localHabits = JSON.parse(localStorage.getItem('lifeClockHabits')) || [];
                
                if (data.dreams && localDreams.length === 0) {
                    localStorage.setItem('lifeClockDreams', JSON.stringify(data.dreams));
                }
                if (data.habits && localHabits.length === 0) {
                    localStorage.setItem('lifeClockHabits', JSON.stringify(data.habits));
                }
                if (data.habitLogs) {
                    const localLogs = JSON.parse(localStorage.getItem('lifeClockHabitLogs')) || {};
                    if (Object.keys(localLogs).length === 0) {
                        localStorage.setItem('lifeClockHabitLogs', JSON.stringify(data.habitLogs));
                    }
                }
                if (data.books) {
                    const localBooks = JSON.parse(localStorage.getItem('lifeClockBooks')) || [];
                    if (localBooks.length === 0) {
                        localStorage.setItem('lifeClockBooks', JSON.stringify(data.books));
                    }
                }
                
                window.syncToCloud(syncKey);
            }
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
