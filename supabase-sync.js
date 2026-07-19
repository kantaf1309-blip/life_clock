const SUPABASE_URL = "https://kmmewpssjvhsbccgtrau.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbWV3cHNzanZoc2JjY2d0cmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzYzNzIsImV4cCI6MjA5ODgxMjM3Mn0.gh0xL5n5T5bMBpCZadH1xKKQWkhm3-XP6th6PIzm1Ig";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let realtimeChannel = null;
let isSyncing = false; // 無限ループ防止フラグ

// UI Elements
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        authOverlay.style.display = 'none';
        await syncFromCloud(true); // 初回ログイン時はローカルとマージ
        setupRealtime();
    } else {
        authOverlay.style.display = 'flex';
    }
}

function showError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.style.display = 'none';
    const email = authEmail.value;
    const password = authPassword.value;
    
    if (!email || !password) return showError('メールアドレスとパスワードを入力してください');
    
    btnLogin.disabled = true;
    btnLogin.textContent = 'ログイン中...';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    btnLogin.disabled = false;
    btnLogin.textContent = 'ログイン';

    if (error) {
        showError('ログイン失敗: ' + error.message);
    } else {
        currentUser = data.user;
        authOverlay.style.display = 'none';
        await syncFromCloud(true);
        setupRealtime();
    }
});

btnSignup.addEventListener('click', async (e) => {
    e.preventDefault();

    authError.style.display = 'none';
    const email = authEmail.value;
    const password = authPassword.value;
    
    if (!email || !password) return showError('メールアドレスとパスワードを入力してください');
    if (password.length < 6) return showError('パスワードは6文字以上にしてください');
    
    btnSignup.disabled = true;
    btnSignup.textContent = '登録中...';

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    
    btnSignup.disabled = false;
    btnSignup.textContent = '新規登録';

    if (error) {
        showError('登録失敗: ' + error.message);
    } else {
        if (!data.session && data.user) {
             showError('確認メールを送信しました。メールのリンクをクリックして確認を完了してください。');
             return;
        }
        currentUser = data.user;
        authOverlay.style.display = 'none';
        await syncFromCloud(true);
        setupRealtime();
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
    }
    authOverlay.style.display = 'flex';
});

// クラウドと同期する関数（アップロード）
window.syncToCloud = async function() {
    if (!currentUser || isSyncing) return;
    
    isSyncing = true;
    try {
        const dreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];
        const habits = JSON.parse(localStorage.getItem('lifeClockHabits_v2')) || [];
        const habitLogs = JSON.parse(localStorage.getItem('lifeClockHabitLogs_v2')) || {};
        const books = JSON.parse(localStorage.getItem('lifeClockBooks')) || [];
        
        const { error } = await supabaseClient
            .from('life_clock_app_state')
            .upsert({
                user_id: currentUser.id,
                dreams,
                habits,
                habit_logs: habitLogs,
                books,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            
        if (error) console.error('Cloud Sync Error:', error);
    } catch (e) {
        console.error('Failed to sync to cloud:', e);
    } finally {
        isSyncing = false;
    }
};

// クラウドからデータを取得する関数
async function syncFromCloud(isInitial = false) {
    if (!currentUser || isSyncing) return;
    
    isSyncing = true;
    try {
        const { data, error } = await supabaseClient
            .from('life_clock_app_state')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
            
        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Fetch Cloud Data Error:', error);
            isSyncing = false;
            return;
        }

        if (data) {
            let localDreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];
            let localHabits = JSON.parse(localStorage.getItem('lifeClockHabits_v2')) || [];
            let localHabitLogs = JSON.parse(localStorage.getItem('lifeClockHabitLogs_v2')) || {};
            let localBooks = JSON.parse(localStorage.getItem('lifeClockBooks')) || [];
            
            // サーバーデータ
            let serverDreams = data.dreams || [];
            let serverHabits = data.habits || [];
            let serverHabitLogs = data.habit_logs || {};
            let serverBooks = data.books || [];

            if (isInitial && (localDreams.length > 0 || localHabits.length > 0 || localBooks.length > 0) && serverDreams.length === 0 && serverHabits.length === 0 && serverBooks.length === 0) {
                // 初回ログイン時かつサーバーにデータがなく、ローカルにデータがある場合はアップロード
                isSyncing = false;
                await window.syncToCloud();
                return;
            }

            // サーバーデータでローカルを上書き（簡易的な実装: リアルタイム同期を前提とするためサーバー正とする）
            localStorage.setItem('lifeClockDreams', JSON.stringify(serverDreams));
            localStorage.setItem('lifeClockHabits_v2', JSON.stringify(serverHabits));
            localStorage.setItem('lifeClockHabitLogs_v2', JSON.stringify(serverHabitLogs));
            localStorage.setItem('lifeClockBooks', JSON.stringify(serverBooks));
            
            // 画面を再描画（script.jsの関数を呼び出し）
            if (typeof window.refreshAllData === 'function') {
                window.refreshAllData();
            } else {
                window.location.reload(); // フォールバック
            }
        } else if (isInitial) {
             // サーバーにデータがない場合は、ローカルデータをアップロード
             isSyncing = false;
             await window.syncToCloud();
             return;
        }
    } catch (e) {
        console.error('Failed to sync from cloud:', e);
    } finally {
        isSyncing = false;
    }
}

function setupRealtime() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
    }
    
    realtimeChannel = supabaseClient.channel('life-clock-sync')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'life_clock_app_state',
                filter: `user_id=eq.${currentUser.id}`
            },
            async (payload) => {
                console.log('Realtime update received:', payload);
                if (!isSyncing) {
                    await syncFromCloud();
                }
            }
        )
        .subscribe();
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});
