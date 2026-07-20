document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // Life Clock Core Logic
    // ============================================================
    const BIRTH_DATE_STR = '1999-02-20T00:00:00+09:00';
    const birthDate = new Date(BIRTH_DATE_STR);
    const lifeSpanYears = 85;
    const deathDate = new Date(birthDate);
    deathDate.setFullYear(deathDate.getFullYear() + lifeSpanYears);

    // DOM elements
    const remYearsEl = document.getElementById('rem-years');
    const remDaysEl = document.getElementById('rem-days');
    const remHoursEl = document.getElementById('rem-hours');
    const remMinutesEl = document.getElementById('rem-minutes');
    const remSecondsEl = document.getElementById('rem-seconds');
    const currentAgeEl = document.getElementById('current-age');
    const currentAgeDecimalEl = document.getElementById('current-age-decimal');
    const lifeProgressBar = document.getElementById('life-progress-bar');
    const lifeProgressPercent = document.getElementById('life-progress-percent');
    const ringFill = document.getElementById('ring-fill');

    // SVG ring circumference (2 * π * r where r=92)
    const ringCircumference = 2 * Math.PI * 92;
    if (ringFill) {
        ringFill.style.strokeDasharray = ringCircumference;
    }

    function updateLifeClock() {
        const now = new Date();
        const livedMs = now - birthDate;
        const remainingMs = Math.max(0, deathDate - now);
        const totalLifeMs = deathDate - birthDate;

        // Remaining time breakdown
        const totalSec = Math.floor(remainingMs / 1000);
        const years = Math.floor(totalSec / (365.25 * 24 * 3600));
        let rem = totalSec % Math.floor(365.25 * 24 * 3600);
        const days = Math.floor(rem / (24 * 3600));
        rem = rem % (24 * 3600);
        const hours = Math.floor(rem / 3600);
        rem = rem % 3600;
        const minutes = Math.floor(rem / 60);
        const seconds = rem % 60;

        if (remYearsEl) remYearsEl.textContent = years;
        if (remDaysEl) remDaysEl.textContent = String(days).padStart(3, '0');
        if (remHoursEl) remHoursEl.textContent = String(hours).padStart(2, '0');
        if (remMinutesEl) remMinutesEl.textContent = String(minutes).padStart(2, '0');
        if (remSecondsEl) remSecondsEl.textContent = String(seconds).padStart(2, '0');

        // Age (integer + decimal)
        const age = livedMs / (365.25 * 24 * 3600 * 1000);
        if (currentAgeEl) currentAgeEl.textContent = Math.floor(age);
        if (currentAgeDecimalEl) currentAgeDecimalEl.textContent = '.' + age.toFixed(8).split('.')[1];

        // Progress
        const progressPercent = Math.min(100, Math.max(0, (livedMs / totalLifeMs) * 100));
        if (lifeProgressBar) lifeProgressBar.style.width = `${progressPercent}%`;
        if (lifeProgressPercent) lifeProgressPercent.textContent = `${progressPercent.toFixed(1)}%`;

        // SVG Ring
        if (ringFill) {
            const offset = ringCircumference * (1 - progressPercent / 100);
            ringFill.style.strokeDashoffset = offset;
        }

        requestAnimationFrame(updateLifeClock);
    }
    
    // Start clock
    requestAnimationFrame(updateLifeClock);


    // ============================================================
    // Apple Design Fluid Modals (Motion based)
    // ============================================================
    const activeModals = new Set();
    // Wait for Motion to be globally available
    const getAnimate = () => window.Motion ? window.Motion.animate : null;

    window.openAppleModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.style.display = 'flex';
        
        const animate = getAnimate();
        if (animate) {
            animate(modal, { opacity: [0, 1] }, { duration: 0.3, easing: 'ease-out' });
            
            const content = modal.querySelector('.modal-content');
            if(content) {
                animate(content, { y: ["100%", "0%"] }, { 
                    type: "spring", bounce: 0, duration: 0.4 
                });
            }
        }
        activeModals.add(modalId);
    };

    window.closeAppleModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const content = modal.querySelector('.modal-content');
        const animate = getAnimate();
        if (animate) {
            const animOverlay = animate(modal, { opacity: 0 }, { duration: 0.3, easing: 'ease-in' });
            if(content) {
                animate(content, { y: "100%" }, { type: "spring", bounce: 0, duration: 0.3 });
            }
            animOverlay.finished.then(() => {
                modal.style.display = 'none';
                modal.style.opacity = 1;
                if(content) content.style.transform = 'translateY(0)';
            });
        } else {
            modal.style.display = 'none';
        }
        activeModals.delete(modalId);
    };

    // Global modal drag setup for Apple Design
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if(e.target === modal) closeAppleModal(modal.id);
        });

        const content = modal.querySelector('.modal-content');
        if(!content) return;
        const handle = content.querySelector('.modal-drag-handle');
        
        let isDragging = false;
        let startY = 0;
        let currentY = 0;
        let lastY = 0;
        let velocity = 0;
        let lastTime = 0;

        if(handle) {
            handle.addEventListener('pointerdown', (e) => {
                isDragging = true;
                startY = e.clientY - currentY;
                lastY = e.clientY;
                lastTime = performance.now();
                handle.setPointerCapture(e.pointerId);
                content.style.transition = 'none';
            });

            handle.addEventListener('pointermove', (e) => {
                if(!isDragging) return;
                const now = performance.now();
                const deltaT = now - lastTime;
                
                if(deltaT > 0) {
                    velocity = (e.clientY - lastY) / (deltaT / 1000); 
                }
                
                lastY = e.clientY;
                lastTime = now;
                
                let y = e.clientY - startY;
                if (y < 0) y = y * 0.1; // Rubber-banding
                
                currentY = y;
                content.style.transform = `translateY(${currentY}px)`;
            });

            handle.addEventListener('pointerup', (e) => {
                if(!isDragging) return;
                isDragging = false;
                handle.releasePointerCapture(e.pointerId);
                
                const animate = getAnimate();
                if (!animate) {
                    if (currentY > 100) closeAppleModal(modal.id);
                    else content.style.transform = `translateY(0)`;
                    currentY = 0;
                    return;
                }

                const decelerationRate = 0.998;
                const projectedY = currentY + (velocity / 1000) * decelerationRate / (1 - decelerationRate);
                
                if(projectedY > 200 || velocity > 800 || currentY > 150) {
                    closeAppleModal(modal.id);
                } else {
                    animate(content, { y: 0 }, {
                        type: "spring", bounce: 0, velocity: velocity, duration: 0.4
                    });
                }
                currentY = 0;
            });
        }
    });

    // One-time data injection for user
    if (!localStorage.getItem('kanta_personal_data_v1')) {
        const myDreams = [
            { id: 'd_k1', text: '妻の無事の出産と母子の健康を全力でサポートする', completed: false, category: 'health', targetDate: '2026-10-01', memo: '第一子誕生に向けて万全の準備を', imageData: '' },
            { id: 'd_k2', text: '汐留通勤と育児の両立のため、週2でジムに通い基礎体力をつける', completed: false, category: 'health', targetDate: '', memo: '心身のゆとりは体力から', imageData: '' },
            { id: 'd_k3', text: '子育てと教育に関する最新の知見（非認知能力など）をアップデートし続ける', completed: false, category: 'knowledge', targetDate: '', memo: '', imageData: '' },
            { id: 'd_k4', text: 'AI/DXの最新技術をキャッチアップし、人材業界のアップデートに活かす', completed: false, category: 'knowledge', targetDate: '', memo: '', imageData: '' },
            { id: 'd_k5', text: 'どんなに多忙でも、家族と猫の前では常に笑顔と心の余裕を持つ', completed: false, category: 'mind', targetDate: '', memo: 'イライラしない', imageData: '' },
            { id: 'd_k6', text: '「高すぎる期待値はリセットする」という経営者的な客観視を忘れない', completed: false, category: 'mind', targetDate: '', memo: '理想と現実のバランスを取る', imageData: '' },
            { id: 'd_k7', text: '汐留の新天地でロケットスタートを切り、圧倒的な成果を出す', completed: false, category: 'work', targetDate: '2027-04-01', memo: '', imageData: '' },
            { id: 'd_k8', text: 'クライスのCOO（AI）と共に、次世代の採用・組織コンサルティングの仕組みを創り上げる', completed: false, category: 'work', targetDate: '', memo: '', imageData: '' },
            { id: 'd_k9', text: '新川崎（または日吉）の新居で、妻と猫と子供が笑顔で暮らせる快適な空間を作る', completed: false, category: 'private', targetDate: '2026-08-01', memo: 'QOL最優先', imageData: '' },
            { id: 'd_k10', text: '週末は家族で公園やカフェでのんびり過ごす', completed: false, category: 'private', targetDate: '', memo: '夢見ヶ崎動物公園や二子玉川へ', imageData: '' },
            { id: 'd_k11', text: '子供の小学校入学までに、教育環境を見据えた定住先（家）の購入資金を準備する', completed: false, category: 'money', targetDate: '2032-04-01', memo: '6年間の期限付き', imageData: '' },
            { id: 'd_k12', text: '世帯年収とQOLの最大バランスを保ち、家族に不自由させない資産基盤を築く', completed: false, category: 'money', targetDate: '', memo: '', imageData: '' }
        ];
        let existingDreams = JSON.parse(localStorage.getItem('lifeClockDreams'));
        if (!existingDreams) existingDreams = [];
        existingDreams.push(...myDreams);
        localStorage.setItem('lifeClockDreams', JSON.stringify(existingDreams));

        const myPlans = [
            { id: 'p_k1', type: 'age', age: 28, text: '汐留の新天地（サンマリーノ汐留）へ転職＆ロケットスタート' },
            { id: 'p_k2', type: 'age', age: 28, text: '第一子誕生！妻の出産を全力サポート＆新川崎・日吉での新生活' },
            { id: 'p_k3', type: 'age', age: 34, text: '子供の小学校入学。教育環境（のびのびor受験）に合わせた「定住先」の購入・移住' },
            { id: 'p_k4', type: 'age', age: 40, text: '事業責任者・役員としてビジネスを牽引し、AI組織を確立する' }
        ];
        let existingPlans = JSON.parse(localStorage.getItem('lifeClockPlans'));
        if (!existingPlans) existingPlans = [];
        existingPlans.push(...myPlans);
        localStorage.setItem('lifeClockPlans', JSON.stringify(existingPlans));

        const myDwmy = {
            daily: [
                { id: 'dw_d1_k', text: '妻の体調を気遣い、家事（特に猫の世話）を先回りしてやる' },
                { id: 'dw_d2_k', text: '睡眠時間を確保し、夫婦の体力を温存する' }
            ],
            weekly: [
                { id: 'dw_w1_k', text: '週末に家族で散歩やカフェに出かける（QOL向上）' },
                { id: 'dw_w2_k', text: 'AIの最新動向をインプットし、業務の仕組み化を考える' }
            ],
            monthly: [
                { id: 'dw_m1_k', text: '夫婦で家計と教育資金の計画（マネープラン）をすり合わせる' }
            ],
            yearly: [
                { id: 'dw_y1_k', text: '家族旅行へ行く' }
            ]
        };
        let existingDwmy = JSON.parse(localStorage.getItem('lifeClockDWMY'));
        if (!existingDwmy) existingDwmy = { daily: [], weekly: [], monthly: [], yearly: [] };
        if (existingDwmy.daily) existingDwmy.daily.push(...myDwmy.daily);
        if (existingDwmy.weekly) existingDwmy.weekly.push(...myDwmy.weekly);
        if (existingDwmy.monthly) existingDwmy.monthly.push(...myDwmy.monthly);
        if (existingDwmy.yearly) existingDwmy.yearly.push(...myDwmy.yearly);
        localStorage.setItem('lifeClockDWMY', JSON.stringify(existingDwmy));

        localStorage.setItem('kanta_personal_data_v1', 'true');
    }
    // ============================================================
    // Global Data / Events
    // ============================================================

    // ============================================================
    // Config
    // ============================================================
    const BIRTH_DATE = '1999-02-20';
    const birthYear = new Date(BIRTH_DATE).getFullYear();

    // Category definitions (Kanban Board)
    const CATEGORIES = {
        career:        { label: '仕事・キャリア',     icon: 'business_center',        color: 'var(--cat-career)' },
        wealth:        { label: '財産・資産',         icon: 'account_balance_wallet', color: 'var(--cat-wealth)' },
        health:        { label: '健康・身体',         icon: 'fitness_center',         color: 'var(--cat-health)' },
        growth:        { label: '学び・知性',         icon: 'school',                 color: 'var(--cat-growth)' },
        family:        { label: '家族・人間関係',     icon: 'diversity_3',            color: 'var(--cat-family)' },
        hobbies:       { label: '趣味・遊び',         icon: 'palette',                color: 'var(--cat-hobbies)' },
        mind:          { label: '心・精神性',         icon: 'self_improvement',       color: 'var(--cat-mind)' },
        uncategorized: { label: '未分類',             icon: 'folder',                 color: 'var(--cat-uncategorized)' }
    };

    // Column order for kanban (uncategorized last)
    const COLUMN_ORDER = ['career', 'wealth', 'health', 'growth', 'family', 'hobbies', 'mind', 'uncategorized'];

    // Global Data
    const HABIT_KEY = 'lifeClockHabits';
    const HABIT_LOG_KEY = 'lifeClockHabitLogs';

    // Migration from old DWMY to new Habits
    const OLD_DWMY_KEY = 'lifeClockDWMY';
    const OLD_DWMY_CHECK_KEY = 'lifeClockDWMYChecks';

    if (localStorage.getItem(OLD_DWMY_KEY) && !localStorage.getItem(HABIT_KEY)) {
        console.log('Migrating old DWMY data to new Habits format...');
        const oldTodos = JSON.parse(localStorage.getItem(OLD_DWMY_KEY));
        const oldChecks = JSON.parse(localStorage.getItem(OLD_DWMY_CHECK_KEY)) || {};
        
        let newHabits = [];
        let newLogs = {};

        // Convert Todos
        if (oldTodos && typeof oldTodos === 'object') {
            Object.keys(oldTodos).forEach(freq => {
                if (Array.isArray(oldTodos[freq])) {
                    oldTodos[freq].forEach(todo => {
                        let newFreq = { type: 'daily' };
                        if (freq === 'weekly') newFreq = { type: 'times_per_week', times: 1 };
                        else if (freq === 'monthly') newFreq = { type: 'monthly' };
                        else if (freq === 'yearly') newFreq = { type: 'yearly' };

                        newHabits.push({
                            id: todo.id,
                            text: todo.text,
                            dreamId: todo.relatedDreamId || '',
                            frequency: newFreq,
                            timeOfDay: 'any',
                            createdAt: new Date().toISOString()
                        });
                    });
                }
            });
        }

        // Convert Checks (Logs)
        // Old keys were "YYYY-MM-DD", "w-YYYY-MM-DD", "YYYY-MM", "YYYY"
        // We will just map them to their base date string if possible, or just keep the string.
        // For accurate heatmap, it's best if they are YYYY-MM-DD.
        Object.keys(oldChecks).forEach(oldDateKey => {
            let newDateKey = oldDateKey;
            if (oldDateKey.startsWith('w-')) newDateKey = oldDateKey.substring(2);
            else if (oldDateKey.length === 7) newDateKey = oldDateKey + '-01'; // YYYY-MM -> YYYY-MM-01
            else if (oldDateKey.length === 4) newDateKey = oldDateKey + '-01-01'; // YYYY -> YYYY-01-01

            if (!newLogs[newDateKey]) newLogs[newDateKey] = {};
            
            Object.keys(oldChecks[oldDateKey]).forEach(habitId => {
                if (oldChecks[oldDateKey][habitId]) {
                    newLogs[newDateKey][habitId] = true;
                }
            });
        });

        localStorage.setItem(HABIT_KEY, JSON.stringify(newHabits));
        localStorage.setItem(HABIT_LOG_KEY, JSON.stringify(newLogs));
        
        // Optionally remove old keys after successful migration
        // localStorage.removeItem(OLD_DWMY_KEY);
        // localStorage.removeItem(OLD_DWMY_CHECK_KEY);
    }

    let habits = JSON.parse(localStorage.getItem(HABIT_KEY)) || [];
    let habitLogs = JSON.parse(localStorage.getItem(HABIT_LOG_KEY)) || {};

    function saveHabits() {
        localStorage.setItem(HABIT_KEY, JSON.stringify(habits));
        localStorage.setItem(HABIT_LOG_KEY, JSON.stringify(habitLogs));
        if (typeof window.triggerCloudSync === 'function') window.triggerCloudSync();
    }

    function getDreamProgress(dreamId) {
        let completedCount = 0;
        const relatedHabits = habits.filter(h => h.dreamId === dreamId);
        
        relatedHabits.forEach(habit => {
            Object.values(habitLogs).forEach(dayLogs => {
                if (dayLogs && dayLogs[habit.id]) {
                    completedCount++;
                }
            });
        });
        
        return completedCount;
    }



    // ============================================================
    // Utility & Icons
    // ============================================================
    function escapeHTML(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }
    const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    const ICON_DELETE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    // ============================================================
    // Tab Navigation (Swipe / Scroll based)
    // ============================================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const swipeContainer = document.getElementById('swipe-container');

    // Click to scroll
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if (targetContent && swipeContainer) {
                targetContent.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
            }
        });
    });

    // Intersection Observer to update active tab button
    if (swipeContainer) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    const activeId = entry.target.id;
                    tabBtns.forEach(b => {
                        if (b.getAttribute('data-target') === activeId) {
                            b.classList.add('active');
                            // Update Top Nav Title
                            const titleEl = document.getElementById('nav-title');
                            if (titleEl) {
                                if (activeId === 'time-view') titleEl.textContent = 'TIME CLOCK';
                                else if (activeId === 'dreams-view') titleEl.textContent = 'TARGET';
                                else if (activeId === 'dwmy-view') titleEl.textContent = 'ROUTINE';
                                else if (activeId === 'books-view') titleEl.textContent = 'BOOKS';
                            }
                        } else {
                            b.classList.remove('active');
                        }
                    });
                }
            });
        }, {
            root: swipeContainer,
            threshold: 0.5
        });

        tabContents.forEach(content => observer.observe(content));
    }

    // Top Add Button Logic
    document.getElementById('top-add-btn')?.addEventListener('click', () => {
        const activeTabBtn = document.querySelector('.tab-btn.active');
        if (!activeTabBtn) return;
        
        const targetId = activeTabBtn.getAttribute('data-target');
        if (targetId === 'dreams-view') {
            document.getElementById('add-dream-btn')?.click();
        } else if (targetId === 'dwmy-view') {
            document.getElementById('add-habit-btn')?.click();
        } else if (targetId === 'books-view') {
            document.getElementById('add-book-btn')?.click();
        }
    });
    // ============================================================
    // Dreams / Kanban Management
    // ============================================================
    const kanbanBoard = document.getElementById('kanban-board');
    let dreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];

    function saveDreams() { 
        localStorage.setItem('lifeClockDreams', JSON.stringify(dreams)); 
        if (typeof window.triggerCloudSync === 'function') window.triggerCloudSync();
    }

    function renderKanban() {
        if(!kanbanBoard) return;
        kanbanBoard.innerHTML = '';
        COLUMN_ORDER.forEach(catKey => {
            const cat = CATEGORIES[catKey];
            const col = document.createElement('div');
            col.className = 'kanban-column';
            col.setAttribute('data-category', catKey);
            col.innerHTML = `
                <div class="kanban-column-header">
                    <span class="material-icons" style="color: ${cat.color}; font-size: 1.1rem;">${cat.icon}</span>
                    <span class="kanban-column-title" style="color: ${cat.color};">${cat.label}</span>
                    <span class="col-count">0</span>
                </div>
                <div class="kanban-list active-list"></div>
            `;
            kanbanBoard.appendChild(col);
            
            // Allow drop on column
            col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
            col.addEventListener('dragleave', e => col.classList.remove('drag-over'));
            col.addEventListener('drop', e => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const dreamId = e.dataTransfer.getData('text/plain');
                if (dreamId) {
                    const dreamIndex = dreams.findIndex(d => d.id === dreamId);
                    if (dreamIndex > -1) {
                        dreams[dreamIndex].category = catKey; dreams[dreamIndex].dependsOn = "";
                        saveDreams(); renderDreams();
                    }
                }
            });
        });
        
        document.querySelectorAll('.add-dream-in-col-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cat = e.target.getAttribute('data-category');
                openDreamModal(null, cat);
            });
        });
        
        renderDreams();
    }

    
    function renderDreams() {
        if(!kanbanBoard) return;
        document.querySelectorAll('.kanban-list').forEach(list => list.innerHTML = '');

        const depSelect = document.getElementById('modal-dream-depends');
        if(depSelect) {
            depSelect.innerHTML = '<option value="">-- なし --</option>';
            dreams.forEach(d => {
                if(!d.completed) {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = d.text;
                    depSelect.appendChild(opt);
                }
            });
        }

        dreams.forEach(d => {
            d.isLocked = false;
            if (d.dependsOn) {
                const parent = dreams.find(p => p.id === d.dependsOn);
                if (parent && !parent.completed) {
                    d.isLocked = true;
                }
            }
        });

        // Sort by completion status first (completed at the back), then by date
        const sortGoals = (arr) => {
            return arr.sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                
                const dateA = a.targetDate || "9999-12";
                const dateB = b.targetDate || "9999-12";
                return dateA.localeCompare(dateB);
            });
        };

        // Hierarchical sorting
        const sortedDreams = [];
        const topLevel = sortGoals(dreams.filter(d => !d.dependsOn));
        const children = dreams.filter(d => d.dependsOn);
        
        // Push top level, then its children right after it
        topLevel.forEach(parent => {
            sortedDreams.push(parent);
            const myChildren = sortGoals(children.filter(c => c.dependsOn === parent.id));
            sortedDreams.push(...myChildren);
        });
        
        // Push any orphaned children at the end
        const orphans = children.filter(c => {
            return !topLevel.find(p => p.id === c.dependsOn) && !sortedDreams.find(sd => sd.id === c.id);
        });
        sortedDreams.push(...sortGoals(orphans));

        sortedDreams.forEach(dream => {
            const col = document.querySelector(`.kanban-column[data-category="${dream.category || 'uncategorized'}"]`);
            if (!col) return;
            const targetList = col.querySelector('.active-list');
            if (targetList) {
                const card = document.createElement('div');
                card.className = 'dream-card';
                if(dream.completed) card.classList.add('completed');
                if(dream.isLocked) card.classList.add('locked');
                if(dream.dependsOn) card.classList.add('is-child');
                
                card.setAttribute('draggable', 'true'); // Allow dragging even if locked to change parent
                card.setAttribute('data-id', dream.id);
                
                card.addEventListener('dragstart', e => { 
                    e.dataTransfer.setData('text/plain', dream.id); 
                    e.dataTransfer.setData('action', 'move-dream');
                    card.classList.add('dragging'); 
                    e.stopPropagation();
                });
                card.addEventListener('dragend', e => card.classList.remove('dragging'));

                // Dropping ONTO a card makes it a child of this card
                card.addEventListener('dragover', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    card.classList.add('drop-target-parent');
                });
                card.addEventListener('dragleave', e => {
                    card.classList.remove('drop-target-parent');
                });
                card.addEventListener('drop', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    card.classList.remove('drop-target-parent');
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId && draggedId !== dream.id) {
                        const draggedDream = dreams.find(d => d.id === draggedId);
                        if (draggedDream) {
                            // Cannot make a card its own parent or cause loops easily (we'll just set it for now)
                            draggedDream.dependsOn = dream.id;
                            // Also align category
                            draggedDream.category = dream.category;
                            saveDreams();
                            renderDreams();
                        }
                    }
                });

                let imageHtml = dream.imageData ? `<img src="${dream.imageData}" alt="dream image" class="dream-image">` : '';

                card.innerHTML = `
                    ${imageHtml}
                    <div class="dream-card-content" style="display: flex; gap: 0.5rem; align-items: flex-start; flex: 1;">
                        <label class="checkbox-container">
                            <input type="checkbox" class="dream-check" data-id="${dream.id}" ${dream.completed ? 'checked' : ''} ${dream.isLocked ? 'disabled' : ''}>
                            <span class="checkmark"></span>
                        </label>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span class="dream-text ${dream.completed ? 'completed-text' : ''}">${escapeHTML(dream.text)}</span>
                            ${dream.targetDate ? `<div class="dream-target-date" style="font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;"><span class="material-icons" style="font-size: 0.85rem;">flag</span>${escapeHTML(dream.targetDate)}</div>` : ''}
                        </div>
                    </div>
                    <div class="dream-actions">
                        <button class="icon-btn edit-dream-btn" data-id="${dream.id}">${ICON_EDIT}</button>
                        <button class="icon-btn delete-dream-btn" data-id="${dream.id}">${ICON_DELETE}</button>
                    </div>
                `;
                targetList.appendChild(card);
            }
        });

        document.querySelectorAll('.dream-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const dream = dreams.find(d => d.id === id);
                if(dream) { 
                    dream.completed = e.target.checked; 
                    if (dream.completed) {
                        if(typeof habits !== 'undefined') {
                            habits = habits.filter(h => h.dreamId !== dream.id);
                            saveHabits();
                            renderHabits();
                        }
                    }
                    saveDreams(); 
                    renderDreams(); 
                }
            });
        });
        document.querySelectorAll('.edit-dream-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { openDreamModal(e.currentTarget.getAttribute('data-id')); });
        });
        document.querySelectorAll('.delete-dream-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm('この目標を削除しますか？紐づく習慣も削除されます。')) {
                    const id = e.currentTarget.getAttribute('data-id');
                    dreams = dreams.filter(d => d.id !== id);
                    if(typeof habits !== 'undefined') {
                        habits = habits.filter(h => h.dreamId !== id);
                        saveHabits();
                    }
                    saveDreams(); 
                    renderDreams(); 
                    if(typeof renderHabits === 'function') renderHabits();
                }
            });
        });
        
    }

    // Toggle locked dreams visibility
    const toggleLockedBtn = document.getElementById('toggle-locked-dreams');
    if (toggleLockedBtn) {
        toggleLockedBtn.addEventListener('change', (e) => {
            const board = document.getElementById('kanban-board');
            if (e.target.checked) {
                board.classList.add('hide-locked');
            } else {
                board.classList.remove('hide-locked');
            }
        });
    }

    // Modal
    const dreamModal = document.getElementById('dream-modal');
    let currentEditDreamId = null;
    
    function openDreamModal(dreamId, defaultCategory) {
        currentEditDreamId = dreamId || null;
        const modalTitle = document.getElementById('modal-title');
        const textInput = document.getElementById('modal-dream-text');
        const catInput = document.getElementById('modal-dream-cat');
        const dependsInput = document.getElementById('modal-dream-depends');
        const dateInput = document.getElementById('dream-date');
        const memoInput = document.getElementById('dream-memo');
        const imgInput = document.getElementById('modal-dream-image');
        const imgPreview = document.getElementById('modal-image-preview');

        // temporarily disable current dream from dependency options
        Array.from(dependsInput.options).forEach(opt => {
            opt.style.display = (opt.value === dreamId) ? 'none' : 'block';
        });

        if(dreamId) {
            const dream = dreams.find(d => d.id === dreamId);
            modalTitle.textContent = '目標を編集';
            textInput.value = dream.text || '';
            catInput.value = dream.category || 'uncategorized';
            dependsInput.value = dream.dependsOn || '';
            dateInput.value = dream.targetDate || '';
            if(memoInput) memoInput.value = dream.memo || '';
            imgPreview.src = dream.imageData || '';
            imgPreview.style.display = dream.imageData ? 'block' : 'none';
        } else {
            modalTitle.textContent = '新しい目標';
            textInput.value = '';
            catInput.value = defaultCategory || 'uncategorized';
            dependsInput.value = '';
            dateInput.value = '';
            if(memoInput) memoInput.value = '';
            imgPreview.src = '';
            imgPreview.style.display = 'none';
        }
        imgInput.value = '';
        dreamModal.style.display = 'flex';
    }

    function closeDreamModal() { closeAppleModal('dream-modal'); }

    document.getElementById('add-dream-btn')?.addEventListener('click', () => openDreamModal());
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeDreamModal);
    document.getElementById('modal-save-btn')?.addEventListener('click', () => {
        const text = document.getElementById('modal-dream-text').value.trim();
        if(!text) { alert('目標を入力してください'); return; }
        
        const imgPreview = document.getElementById('modal-image-preview');
        const dependsOn = document.getElementById('modal-dream-depends').value;
        
        if (currentEditDreamId) {
            const dream = dreams.find(d => d.id === currentEditDreamId);
            if(dream) {
                dream.text = text;
                dream.category = document.getElementById('modal-dream-cat').value;
                dream.dependsOn = dependsOn;
                dream.targetDate = document.getElementById('dream-date').value;
                const memoInput = document.getElementById('dream-memo');
                if(memoInput) dream.memo = memoInput.value;
                dream.imageData = imgPreview.src.startsWith('data:') ? imgPreview.src : '';
            }
        } else {
            dreams.push({
                id: 'd_' + Date.now(),
                text: text,
                category: document.getElementById('modal-dream-cat').value,
                dependsOn: dependsOn,
                targetDate: document.getElementById('dream-date').value,
                memo: document.getElementById('dream-memo') ? document.getElementById('dream-memo').value : '',
                imageData: imgPreview.src.startsWith('data:') ? imgPreview.src : '',
                completed: false
            });
        }
        saveDreams();
        renderKanban();
        closeDreamModal();
    });

    document.getElementById('modal-dream-image')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (e2) => {
                const imgPreview = document.getElementById('modal-image-preview');
                imgPreview.src = e2.target.result;
                imgPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // ============================================================
    // Habits Management (Daily Checklist)
    // ============================================================
    const habitModal = document.getElementById('habit-modal');
    let currentEditHabitId = null;
    
    function getStreak(habitId) {
        let streak = 0;
        let d = new Date();
        // Check backwards from today
        while (true) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (habitLogs[dateStr] && habitLogs[dateStr][habitId]) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else if (streak === 0) {
                // if today is not checked, check yesterday just in case they haven't done it yet today
                const d2 = new Date();
                d2.setDate(d2.getDate() - 1);
                const yDateStr = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}-${String(d2.getDate()).padStart(2,'0')}`;
                if (habitLogs[yDateStr] && habitLogs[yDateStr][habitId]) {
                    streak++;
                    d = d2;
                    d.setDate(d.getDate() - 1);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return streak;
    }

    function renderHabits() {
        const listContainer = document.getElementById('habit-list-container');
        const ring = document.getElementById('habit-today-ring');
        const percentText = document.getElementById('habit-today-percent');
        
        if(!listContainer) return;
        listContainer.innerHTML = '';
        
        if(habits.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">習慣が登録されていません。<br>右上の「＋」から追加しましょう。</div>';
            if(ring) ring.style.strokeDashoffset = 283;
            if(percentText) percentText.textContent = '0%';
            return;
        }

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        
        let completedToday = 0;
        let totalActiveHabits = 0;

        habits.forEach(habit => {
            const dream = dreams.find(d => d.id === habit.dreamId);
            if (!dream || dream.completed || dream.isLocked) return;
            totalActiveHabits++;
            
            const isDoneToday = habitLogs[todayStr] && habitLogs[todayStr][habit.id];
            if (isDoneToday) completedToday++;
            
            const streak = getStreak(habit.id);

            // Generate 5 days (4 days ago to today)
            const days = [];
            for (let i = 4; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                days.push({ dateStr: dStr, label: d.getDate(), isToday: i === 0 });
            }

            let daysHtml = '<div class="habit-days-group">';
            days.forEach(day => {
                const isDone = habitLogs[day.dateStr] && habitLogs[day.dateStr][habit.id];
                daysHtml += `
                    <button class="habit-day-btn ${isDone ? 'checked' : ''} ${day.isToday ? 'today' : ''}" 
                            data-date="${day.dateStr}">
                        ${day.label}
                    </button>
                `;
            });
            daysHtml += '</div>';

            const item = document.createElement('div');
            item.className = 'habit-item-ios';
            item.innerHTML = `
                <div class="habit-info-ios">
                    <div class="habit-title-ios">${escapeHTML(habit.text)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                        <span class="material-icons" style="font-size: 0.8rem;">flag</span>
                        ${escapeHTML(dream.text)}
                    </div>
                    ${streak > 0 ? `<div class="habit-streak">🔥 ${streak}日連続</div>` : ''}
                </div>
                ${daysHtml}
            `;
            
            const dayBtns = item.querySelectorAll('.habit-day-btn');
            dayBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening edit modal
                    const dateStr = btn.getAttribute('data-date');
                    if (!habitLogs[dateStr]) habitLogs[dateStr] = {};
                    
                    if (habitLogs[dateStr][habit.id]) {
                        delete habitLogs[dateStr][habit.id];
                        btn.classList.remove('checked');
                    } else {
                        habitLogs[dateStr][habit.id] = true;
                        btn.classList.add('checked');
                        item.style.transform = 'scale(0.97)';
                        setTimeout(() => item.style.transform = 'scale(1)', 150);
                    }
                    saveHabits();
                    renderHabits();
                });
            });
            
            // Add long press / double click to edit
            item.addEventListener('dblclick', () => {
                currentEditHabitId = habit.id;
                document.getElementById('modal-habit-text').value = habit.text;
                document.getElementById('modal-habit-dream').value = habit.dreamId;
                if (typeof renderHabitHeatmap === 'function') {
                    renderHabitHeatmap(habit.id);
                }
                openAppleModal('habit-modal');
            });

            listContainer.appendChild(item);
        });
        
        updateRing();
        
        function updateRing() {
            let done = 0;
            habits.forEach(h => {
                const d = dreams.find(d => d.id === h.dreamId);
                if (!d || d.completed || d.isLocked) return;
                if (habitLogs[todayStr] && habitLogs[todayStr][h.id]) done++;
            });
            
            const pct = totalActiveHabits === 0 ? 0 : Math.round((done / totalActiveHabits) * 100);
            if(percentText) percentText.textContent = `${pct}%`;
            
            if(ring) {
                // dasharray is 283. dashoffset = 283 is 0%, 0 is 100%
                const offset = 283 - (283 * (pct / 100));
                ring.style.strokeDashoffset = offset;
            }
        }
    }

    // renderHeatmap was completely replaced by renderHabits iOS styling

    document.getElementById('add-habit-btn')?.addEventListener('click', () => {
        currentEditHabitId = null;
        document.getElementById('modal-habit-text').value = '';
        document.getElementById('modal-habit-dream').value = '';
        if (typeof renderHabitHeatmap === 'function') {
            renderHabitHeatmap(null);
        }
        openAppleModal('habit-modal');
    });

    function renderHabitHeatmap(habitId) {
        const container = document.getElementById('habit-heatmap-container');
        const grid = document.getElementById('habit-heatmap-grid');
        const stats = document.getElementById('habit-heatmap-stats');
        if (!container || !grid || !stats) return;

        if (!habitId) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        grid.innerHTML = '';

        const today = new Date();
        let totalDone = 0;
        
        let col = null;
        
        // 364 days (52 weeks exactly)
        for (let i = 363; i >= 0; i--) {
            if ((363 - i) % 7 === 0) {
                col = document.createElement('div');
                col.style.display = 'flex';
                col.style.flexDirection = 'column';
                col.style.gap = '3px';
                grid.appendChild(col);
            }
            
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            
            const isDone = habitLogs[dStr] && habitLogs[dStr][habitId];
            if (isDone) totalDone++;
            
            const cell = document.createElement('div');
            cell.style.width = '12px';
            cell.style.height = '12px';
            cell.style.borderRadius = '2px';
            // Use very light color or transparent with border for empty, and primary for filled
            cell.style.backgroundColor = isDone ? 'var(--sys-blue)' : 'transparent';
            cell.style.border = isDone ? '1px solid var(--sys-blue)' : '1px solid rgba(128, 128, 128, 0.2)';
            cell.title = `${dStr} ${isDone ? '✅' : ''}`;
            
            col.appendChild(cell);
        }
        
        stats.textContent = `合計: ${totalDone}日達成`;
        
        // Scroll to the right end (latest)
        setTimeout(() => {
            const wrapper = document.getElementById('habit-heatmap-wrapper');
            if (wrapper) wrapper.scrollLeft = wrapper.scrollWidth;
        }, 100);
    }
    document.getElementById('habit-modal-cancel')?.addEventListener('click', () => closeAppleModal('habit-modal'));
    document.getElementById('habit-modal-save')?.addEventListener('click', () => {
        const text = document.getElementById('modal-habit-text').value.trim();
        const dreamId = document.getElementById('modal-habit-dream').value;
        if(!text) { alert('習慣を入力してください'); return; }
        if(!dreamId) { alert('関連する目標を選択してください'); return; }

        if (currentEditHabitId) {
            const habit = habits.find(h => h.id === currentEditHabitId);
            if (habit) {
                habit.text = text;
                habit.dreamId = dreamId;
            }
        } else {
            habits.push({
                id: 'h_' + Date.now(),
                text: text,
                dreamId: dreamId,
                createdAt: new Date().toISOString()
            });
        }
        saveHabits();
        renderHabits();
        closeAppleModal('habit-modal');
    });

    // ============================================================
    // Books Management
    // ============================================================
    let books = JSON.parse(localStorage.getItem('lifeClockBooks')) || [];
    function saveBooks() { 
        try {
            localStorage.setItem('lifeClockBooks', JSON.stringify(books)); 
            if (typeof window.triggerCloudSync === 'function') window.triggerCloudSync();
        } catch (e) {
            console.error('Save failed', e);
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                // Purge massive base64 images from both books and dreams to free up space
                let purged = false;
                books.forEach(b => {
                    if (b.imageData && b.imageData.startsWith('data:image') && b.imageData.length > 1000) {
                        b.imageData = '';
                        purged = true;
                    }
                });
                
                let existingDreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];
                existingDreams.forEach(d => {
                    if (d.imageData && d.imageData.startsWith('data:image') && d.imageData.length > 1000) {
                        d.imageData = '';
                        purged = true;
                    }
                });
                
                if (purged) {
                    try {
                        localStorage.setItem('lifeClockDreams', JSON.stringify(existingDreams));
                        if (typeof renderKanban === 'function') {
                            dreams = existingDreams;
                            renderKanban();
                        }
                        
                        localStorage.setItem('lifeClockBooks', JSON.stringify(books));
                        if (window.syncToCloud) window.syncToCloud();
                        alert('【自動修復完了】データ容量がいっぱいだったため、保存できなかった不具合を修正しました。（過去の重い表紙・目標画像を削除して容量を確保しました）。もう一度お試しください。');
                    } catch (e2) {
                        console.error('Still failed after purge', e2);
                        alert('ブラウザのデータ容量が完全に一杯です。不要な目標などを削除してください。');
                    }
                } else {
                    alert('ブラウザのデータ容量がいっぱいです。不要な目標や本を削除してください。');
                }
            }
        }
    }
    
    let currentBookTab = 'reading';
    let currentBookGenre = 'all';

    // Initialize Book Tabs
    document.querySelectorAll('.book-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.book-tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentBookTab = e.target.getAttribute('data-status');
            renderBooks();
        });
    });

    // Initialize Genre Filter
    const genreFilterEl = document.getElementById('book-genre-filter');
    if (genreFilterEl) {
        genreFilterEl.addEventListener('change', (e) => {
            currentBookGenre = e.target.value;
            renderBooks();
        });
    }

    // Global Drag and Drop for Books
    window.dragBook = function(e, id) {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    };

    window.dragBookEnd = function(e) {
        e.target.style.opacity = '1';
    };

    window.allowDropBook = function(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    window.leaveDropBook = function(e) {
        e.currentTarget.classList.remove('drag-over');
    };

    window.dropBook = function(e, targetMonth) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const bookId = e.dataTransfer.getData('text/plain');
        if (!bookId) return;

        const book = books.find(b => b.id === bookId);
        if (!book) return;

        if (targetMonth === 'unset') {
            book.doneDate = '';
        } else {
            // E.g., targetMonth is '2026-07'
            // If the book is already in this month, don't change the exact day
            const currentMonth = book.doneDate ? book.doneDate.substring(0, 7) : '';
            if (currentMonth !== targetMonth) {
                // If moving to a new month, set it to the 1st of that month
                book.doneDate = `${targetMonth}-01`;
            }
        }
        
        saveBooks();
        renderBooks();
    };

    function renderBooks() {
        let needsSave = false;
        books.forEach(b => {
            if (b.status === 'done' && b.doneDate === undefined) {
                b.doneDate = b.targetDate || new Date().toISOString().split('T')[0];
                needsSave = true;
            }
        });
        if (needsSave) saveBooks();

        const grid = document.getElementById('bookshelf-grid');
        if(!grid) return;
        
        const filteredBooks = books.filter(b => {
            const matchStatus = b.status === currentBookTab;
            const bGenre = b.genre || '未設定';
            const matchGenre = currentBookGenre === 'all' || bGenre === currentBookGenre;
            return matchStatus && matchGenre;
        });

        // Function to create a book card DOM element
        const createBookCard = (book, isDraggable) => {
            const card = document.createElement('div');
            card.className = 'book-flip-card';
            if (isDraggable) {
                card.draggable = true;
                card.setAttribute('ondragstart', `dragBook(event, '${book.id}')`);
                card.setAttribute('ondragend', 'dragBookEnd(event)');
            }
            card.innerHTML = `
                <div class="book-flip-card-inner">
                    <div class="book-flip-card-front">
                        <div class="book-front-cover">
                            ${book.imageData 
                                ? `<img src="${book.imageData}" alt="Cover" referrerpolicy="no-referrer">` 
                                : `<div class="book-placeholder"><span>${escapeHTML(book.title)}</span></div>`
                            }
                        </div>
                        <div class="book-front-info">
                            <div class="book-front-title">${escapeHTML(book.title)}</div>
                            <div class="book-front-author">${escapeHTML(book.author || '著者不明')}</div>
                        </div>
                    </div>
                    <div class="book-flip-card-back">
                        <div class="book-back-title">${escapeHTML(book.title)}</div>
                        <div class="book-back-meta" style="font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 0.2rem; line-height: 1.2;">
                            ${book.doneDate ? `読了: ${book.doneDate}` : (book.targetDate ? `目標: ${book.targetDate}` : '')}
                        </div>
                        <textarea class="book-back-memo-input" placeholder="メモ..." data-id="${book.id}">${escapeHTML(book.memo || '')}</textarea>
                        <div class="book-back-actions">
                            <select class="book-back-select book-status-select" data-id="${book.id}">
                                <option value="unread" ${book.status === 'unread' ? 'selected' : ''}>読みたい</option>
                                <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>読書中</option>
                                <option value="done" ${book.status === 'done' ? 'selected' : ''}>読了</option>
                            </select>
                            <button class="book-back-btn edit-book-btn" data-id="${book.id}">編集</button>
                            <button class="book-back-btn delete-book-btn" data-id="${book.id}">削除</button>
                        </div>
                    </div>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'textarea' || 
                    e.target.tagName.toLowerCase() === 'select' || 
                    e.target.tagName.toLowerCase() === 'button' ||
                    e.target.tagName.toLowerCase() === 'option') {
                    return;
                }
                card.classList.toggle('flip-active');
            });
            return card;
        };

        if (currentBookTab === 'done') {
            grid.classList.remove('bookshelf-grid');
            // Render Kanban layout for done books
            grid.innerHTML = '<div class="book-kanban-board" id="book-kanban-board"></div>';
            const board = document.getElementById('book-kanban-board');
            
            // Group by month
            const groups = { unset: [] };
            filteredBooks.forEach(b => {
                if (!b.doneDate) {
                    groups.unset.push(b);
                } else {
                    const month = b.doneDate.substring(0, 7); // YYYY-MM
                    if (!groups[month]) groups[month] = [];
                    groups[month].push(b);
                }
            });
            
            // Sort months descending
            const months = Object.keys(groups).filter(k => k !== 'unset').sort().reverse();
            
            const renderColumn = (monthKey, label, booksInColumn) => {
                const col = document.createElement('div');
                col.className = 'book-kanban-column';
                col.setAttribute('ondragover', 'allowDropBook(event)');
                col.setAttribute('ondragleave', 'leaveDropBook(event)');
                col.setAttribute('ondrop', `dropBook(event, '${monthKey}')`);
                
                col.innerHTML = `
                    <div class="book-kanban-header">${label} <span style="font-weight: normal; font-size: 0.85em; color: var(--text-secondary);">(${booksInColumn.length})</span></div>
                    <div class="bookshelf-grid"></div>
                `;
                
                const colGrid = col.querySelector('.bookshelf-grid');
                booksInColumn.forEach(b => colGrid.appendChild(createBookCard(b, true)));
                board.appendChild(col);
            };

            months.forEach(m => {
                const parts = m.split('-');
                const label = `${parts[0]}年${parseInt(parts[1], 10)}月`;
                renderColumn(m, label, groups[m]);
            });
            
            if (groups.unset.length > 0 || months.length === 0) {
                renderColumn('unset', '未設定', groups.unset);
            }
            
        } else {
            grid.classList.add('bookshelf-grid');
            // Normal grid layout for reading/unread
            grid.innerHTML = '';
            filteredBooks.forEach(book => {
                grid.appendChild(createBookCard(book, false));
            });
        }
        document.querySelectorAll('.book-status-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const book = books.find(b => b.id === e.target.getAttribute('data-id'));
                if(book) { 
                    const oldStatus = book.status;
                    book.status = e.target.value; 
                    if (book.status === 'done' && oldStatus !== 'done') {
                        const d = new Date();
                        book.doneDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    }
                    saveBooks(); 
                    renderBooks(); 
                }
            });
        });
        document.querySelectorAll('.delete-book-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm('削除しますか？')) {
                    books = books.filter(b => b.id !== e.currentTarget.getAttribute('data-id'));
                    saveBooks(); renderBooks();
                }
            });
        });
        document.querySelectorAll('.edit-book-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const book = books.find(b => b.id === id);
                if (book) {
                    editingBookId = book.id;
                    document.getElementById('book-modal-title').textContent = '本を編集';
                    
                    const titleEl = document.getElementById('book-title');
                    const authorEl = document.getElementById('book-author');
                    const genreEl = document.getElementById('book-genre');
                    const dateEl = document.getElementById('book-target-date');
                    const statusEl = document.getElementById('book-status');
                    
                    if (titleEl) titleEl.value = book.title || '';
                    if (authorEl) authorEl.value = book.author || '';
                    if (genreEl) genreEl.value = book.genre || '';
                    if (statusEl) statusEl.value = book.status || 'unread';

                    const dateLabel = document.getElementById('book-date-label');
                    if (dateLabel && statusEl) {
                        dateLabel.textContent = statusEl.value === 'done' ? '読了日（任意）' : '読了目標日（任意）';
                        if (dateEl) {
                            dateEl.value = statusEl.value === 'done' ? (book.doneDate || '') : (book.targetDate || '');
                        }
                        
                        // Replace statusEl to clear old listeners
                        const newStatusEl = statusEl.cloneNode(true);
                        statusEl.parentNode.replaceChild(newStatusEl, statusEl);
                        newStatusEl.addEventListener('change', (e) => {
                            dateLabel.textContent = e.target.value === 'done' ? '読了日（任意）' : '読了目標日（任意）';
                        });
                    } else if (dateEl) {
                        dateEl.value = book.targetDate || '';
                    }

                    selectedCoverUrl = '';
                    const candidatesContainer = document.getElementById('book-cover-candidates');
                    if (candidatesContainer) candidatesContainer.style.display = 'none';
                    const selectedContainer = document.getElementById('book-cover-selected');
                    if (selectedContainer) selectedContainer.style.display = 'none';
                    const gridEl = document.getElementById('book-cover-grid');
                    if (gridEl) gridEl.innerHTML = '';
                    
                    if (book.imageData) {
                        const selectedImg = document.getElementById('book-cover-selected-img');
                        if (selectedImg) {
                            selectedImg.src = book.imageData;
                            if (selectedContainer) selectedContainer.style.display = 'block';
                        }
                    }

                    openAppleModal('book-modal');
                }
            });
        });
        document.querySelectorAll('.book-back-memo-input').forEach(textarea => {
            textarea.addEventListener('change', (e) => {
                const book = books.find(b => b.id === e.target.getAttribute('data-id'));
                if(book) { book.memo = e.target.value; saveBooks(); }
            });
        });
        
        renderBooksChart();
    }

    let booksChartInstance = null;

    function renderBooksChart() {
        const chartContainer = document.getElementById('books-chart-container');
        if (!chartContainer) return;

        if (currentBookTab !== 'done') {
            chartContainer.style.display = 'none';
            return;
        }

        chartContainer.style.display = 'block';
        const ctx = document.getElementById('booksChart');
        if (!ctx) return;

        const doneBooks = books.filter(b => b.status === 'done');
        
        if (doneBooks.length === 0) {
            // Show empty state chart
            if (booksChartInstance) booksChartInstance.destroy();
            booksChartInstance = new Chart(ctx, {
                type: 'bar',
                data: { labels: ['今月'], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            suggestedMax: 5,
                            ticks: { stepSize: 1 }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'まだ読了した本がありません',
                            color: '#888'
                        }
                    }
                }
            });
            return;
        }

        // Group by Month (YYYY-MM) and Genre
        const monthlyData = {};
        const allGenres = new Set();

        doneBooks.forEach(b => {
            const month = b.doneDate.substring(0, 7); // YYYY-MM
            const genre = b.genre || '未設定';
            allGenres.add(genre);

            if (!monthlyData[month]) monthlyData[month] = {};
            if (!monthlyData[month][genre]) monthlyData[month][genre] = 0;
            monthlyData[month][genre]++;
        });

        // Sort months ascending
        const sortedMonths = Object.keys(monthlyData).sort();

        // Chart.js requires datasets array
        // Define fixed colors for genres
        const genreColors = {
            'すぐ実務に活かす': 'rgba(0, 122, 255, 0.8)',
            '思考力を鍛える': 'rgba(255, 149, 0, 0.8)',
            '教養を深める': 'rgba(88, 86, 214, 0.8)',
            'リフレッシュ・娯楽': 'rgba(52, 199, 89, 0.8)',
            '未設定': 'rgba(142, 142, 147, 0.8)'
        };

        const datasets = Array.from(allGenres).map(genre => {
            return {
                label: genre,
                data: sortedMonths.map(m => monthlyData[m][genre] || 0),
                backgroundColor: genreColors[genre] || 'rgba(142, 142, 147, 0.8)',
                borderRadius: 4
            };
        });

        if (booksChartInstance) {
            booksChartInstance.destroy();
        }

        booksChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedMonths,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: "'Outfit', 'Noto Sans JP', sans-serif" },
                            color: getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#fff'
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#aaa' },
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        ticks: { 
                            stepSize: 1, 
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#aaa'
                        },
                        grid: { color: 'rgba(128,128,128,0.1)' }
                    }
                }
            }
        });
    }

    // --- Book Cover Search ---
    let selectedCoverUrl = '';

    // JSONP helper — bypasses CORS completely (works from file://)
    function jsonp(url) {
        return new Promise((resolve, reject) => {
            const cbName = '_gbcb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            const script = document.createElement('script');
            const timeout = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 8000);
            function cleanup() {
                clearTimeout(timeout);
                delete window[cbName];
                script.remove();
            }
            window[cbName] = (data) => { cleanup(); resolve(data); };
            script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName;
            script.onerror = () => { cleanup(); reject(new Error('script error')); };
            document.head.appendChild(script);
        });
    }

    async function fetchBookCandidates(title, author) {
        const queryStr = author ? `${title} ${author}` : title;
        const query = encodeURIComponent(queryStr);
        // Switch to iTunes Search API for eBooks to avoid Google Books 429 Quota Exceeded limits
        const apiUrl = `https://itunes.apple.com/search?term=${query}&entity=ebook&country=jp&limit=5`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        try {
            const res = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            if (!data.results) return [];
            return data.results.map(item => {
                // iTunes returns artworkUrl100, which can be modified to request a larger image
                let highResImage = item.artworkUrl100 || '';
                if (highResImage) {
                    highResImage = highResImage.replace('100x100bb', '600x600bb');
                }
                return {
                    title: item.trackName || '',
                    authors: item.artistName ? [item.artistName] : [],
                    thumbnail: highResImage
                };
            }).filter(b => b.thumbnail);
        } catch (e) {
            console.error('Book search failed', e);
            return [];
        }
    }

    // Convert an image URL to base64 data URI using a proxy canvas
    function imageUrlToBase64(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            // Use a CORS proxy for Google Books images
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url.replace('http:', 'https:'))}`;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                } catch (e) {
                    console.error('Canvas export failed', e);
                    resolve('');
                }
            };
            img.onerror = () => {
                // Fallback: try without proxy
                const img2 = new Image();
                img2.crossOrigin = 'anonymous';
                img2.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img2.naturalWidth;
                        canvas.height = img2.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img2, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    } catch (e) {
                        resolve('');
                    }
                };
                img2.onerror = () => resolve('');
                img2.src = url.replace('http:', 'https:');
            };
            img.src = proxyUrl;
        });
    }

    document.getElementById('book-cover-search-btn')?.addEventListener('click', async () => {
        const title = document.getElementById('book-title')?.value.trim();
        if (!title) { alert('まずタイトルを入力してください'); return; }

        const author = document.getElementById('book-author')?.value.trim() || '';
        const candidatesContainer = document.getElementById('book-cover-candidates');
        const loadingEl = document.getElementById('book-cover-loading');
        const gridEl = document.getElementById('book-cover-grid');
        const noneEl = document.getElementById('book-cover-none');
        const searchBtn = document.getElementById('book-cover-search-btn');

        candidatesContainer.style.display = 'block';
        loadingEl.style.display = 'block';
        gridEl.innerHTML = '';
        noneEl.style.display = 'none';
        searchBtn.textContent = '🔍 検索中...';
        searchBtn.disabled = true;

        const candidates = await fetchBookCandidates(title, author);

        loadingEl.style.display = 'none';
        searchBtn.textContent = '🔍 タイトルから表紙を検索';
        searchBtn.disabled = false;

        if (candidates.length === 0) {
            noneEl.style.display = 'block';
            return;
        }

        candidates.forEach(book => {
            const thumb = document.createElement('div');
            thumb.style.cssText = 'cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid transparent;transition:border-color 0.2s, transform 0.2s;aspect-ratio:2/3;';
            const img = document.createElement('img');
            img.src = book.thumbnail.replace('http:', 'https:');
            img.alt = book.title;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            img.referrerPolicy = 'no-referrer';
            thumb.appendChild(img);

            thumb.addEventListener('mouseenter', () => { thumb.style.transform = 'scale(1.05)'; });
            thumb.addEventListener('mouseleave', () => { thumb.style.transform = 'scale(1)'; });

            thumb.addEventListener('click', () => {
                // Deselect others
                gridEl.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
                thumb.style.borderColor = '#4facfe';

                selectedCoverUrl = book.thumbnail.replace('http:', 'https:');

                // Show selected preview
                const selectedContainer = document.getElementById('book-cover-selected');
                const selectedImg = document.getElementById('book-cover-selected-img');
                selectedImg.src = selectedCoverUrl;
                selectedImg.referrerPolicy = 'no-referrer';
                selectedContainer.style.display = 'block';

                // Auto-fill author if empty
                if (!document.getElementById('book-author')?.value.trim() && book.authors.length > 0) {
                    document.getElementById('book-author').value = book.authors[0];
                }
            });

            gridEl.appendChild(thumb);
        });
    });

    document.getElementById('book-cover-clear-btn')?.addEventListener('click', () => {
        selectedCoverUrl = '';
        document.getElementById('book-cover-selected').style.display = 'none';
        document.getElementById('book-cover-grid')?.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
    });

    let editingBookId = null;

    // --- Open Modal for New Book ---
    document.getElementById('add-book-btn')?.addEventListener('click', () => {
        editingBookId = null;
        document.getElementById('book-modal-title').textContent = '新しい本を登録';
        
        const titleEl = document.getElementById('book-title');
        const authorEl = document.getElementById('book-author');
        const genreEl = document.getElementById('book-genre');
        const dateEl = document.getElementById('book-target-date');
        const statusEl = document.getElementById('book-status');
        
        if (titleEl) titleEl.value = '';
        if (authorEl) authorEl.value = '';
        if (genreEl) genreEl.value = '';
        if (dateEl) dateEl.value = '';
        if (statusEl) statusEl.value = currentBookTab;

        const dateLabel = document.getElementById('book-date-label');
        if (dateLabel && statusEl) {
            dateLabel.textContent = statusEl.value === 'done' ? '読了日（任意）' : '読了目標日（任意）';
            
            // Remove old listener to avoid duplicates, then add a new one
            const newStatusEl = statusEl.cloneNode(true);
            statusEl.parentNode.replaceChild(newStatusEl, statusEl);
            newStatusEl.addEventListener('change', (e) => {
                dateLabel.textContent = e.target.value === 'done' ? '読了日（任意）' : '読了目標日（任意）';
            });
        }

        selectedCoverUrl = '';
        const candidatesContainer = document.getElementById('book-cover-candidates');
        if (candidatesContainer) candidatesContainer.style.display = 'none';
        const selectedContainer = document.getElementById('book-cover-selected');
        if (selectedContainer) selectedContainer.style.display = 'none';
        const gridEl = document.getElementById('book-cover-grid');
        if (gridEl) gridEl.innerHTML = '';

        openAppleModal('book-modal');
    });

    document.getElementById('book-modal-cancel')?.addEventListener('click', () => closeAppleModal('book-modal'));

    // --- Save Book ---
    document.getElementById('book-modal-save')?.addEventListener('click', async () => {
        const btn = document.getElementById('book-modal-save');
        const title = document.getElementById('book-title')?.value.trim();
        if (!title) { alert('タイトルを入力してください'); return; }

        btn.textContent = '保存中...';
        btn.disabled = true;

        let author = document.getElementById('book-author')?.value.trim() || '';
        const genre = document.getElementById('book-genre')?.value.trim() || '';
        const targetDate = document.getElementById('book-target-date')?.value || '';
        const statusEl = document.getElementById('book-status');
        const status = statusEl ? statusEl.value : currentBookTab;

        let imageData = '';
        const editingBook = books.find(b => b.id === editingBookId);

        // Convert selected cover URL to base64
        if (selectedCoverUrl) {
            imageData = selectedCoverUrl;
        } else if (editingBook) {
            // Keep existing image if no new cover was selected
            imageData = editingBook.imageData;
        }

        // If no cover was selected and it's a new book, try auto-search
        if (!imageData && !editingBook) {
            const candidates = await fetchBookCandidates(title, author);
            if (candidates.length > 0) {
                const url = candidates[0].thumbnail.replace('http:', 'https:');
                imageData = url;
                if (!author && candidates[0].authors.length > 0) {
                    author = candidates[0].authors[0];
                }
            }
        }

        const today = new Date();
        const todayStrForBook = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        
        let finalTargetDate = '';
        let finalDoneDate = undefined;
        if (status === 'done') {
            finalDoneDate = targetDate || todayStrForBook; // targetDate variable holds the input value
            finalTargetDate = editingBook ? editingBook.targetDate : '';
        } else {
            finalTargetDate = targetDate; // targetDate variable holds the input value
            finalDoneDate = undefined;
        }

        if (editingBook) {
            editingBook.title = title;
            editingBook.author = author;
            editingBook.genre = genre;
            editingBook.targetDate = finalTargetDate;
            editingBook.status = status;
            editingBook.imageData = imageData;
            editingBook.doneDate = finalDoneDate;
        } else {
            books.push({
                id: 'b_' + Date.now(),
                title: title,
                author: author,
                genre: genre,
                targetDate: finalTargetDate,
                status: status,
                imageData: imageData,
                memo: '',
                doneDate: finalDoneDate
            });
        }
        
        saveBooks();
        renderBooks();

        btn.textContent = '保存する';
        btn.disabled = false;
        closeAppleModal('book-modal');
    });

    // Hide on scroll down, show on scroll up for nav-bar
    let lastScrollY = window.scrollY;
    const navBar = document.getElementById('top-nav-bar');
    
    window.addEventListener('scroll', () => {
        if (!navBar) return;
        const currentScrollY = window.scrollY;
        
        // Don't hide when near the top (e.g. bounce effect on iOS)
        if (currentScrollY < 50) {
            navBar.classList.remove('nav-hidden');
        } else if (currentScrollY > lastScrollY) {
            // Scrolling down
            navBar.classList.add('nav-hidden');
        } else {
            // Scrolling up
            navBar.classList.remove('nav-hidden');
        }
        lastScrollY = currentScrollY;
    }, { passive: true });

    // Initialize
    renderKanban();
    renderHabits();
    renderBooks();

    // Global refresh function for cloud sync
    window.reloadAllData = function() {
        dreams = JSON.parse(localStorage.getItem('lifeClockDreams')) || [];
        habits = JSON.parse(localStorage.getItem(HABIT_KEY)) || [];
        habitLogs = JSON.parse(localStorage.getItem(HABIT_LOG_KEY)) || {};
        books = JSON.parse(localStorage.getItem('lifeClockBooks')) || [];
        renderDreams();
        renderHabits();
        renderBooks();
    };

});
