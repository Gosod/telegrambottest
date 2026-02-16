// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;
tg.expand();

// Применяем тему
document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';

// Глобальные переменные
let selectedProject = null;
let hours = 4;
let isAdmin = false;
let projects = [];
let navigationHistory = [];

// Проверка админа и загрузка данных при старте
async function init() {
    // Проверяем админа (можно получить из initData бота)
    const initData = tg.initDataUnsafe;
    const userId = initData?.user?.id;
    
    // Для демо - проверяем ID
    // В продакшене бот передаст эту информацию через query параметры
    isAdmin = checkIfAdmin(userId);
    
    if (isAdmin) {
        document.getElementById('projectsNav').style.display = 'block';
        document.getElementById('adminProjectsCard').style.display = 'block';
        document.getElementById('adminStatsCard').style.display = 'block';
        document.getElementById('addProjectBtn').style.display = 'block';
    }
    
    // Загружаем проекты
    await loadProjects();
}

function checkIfAdmin(userId) {
    // Здесь бот передаст информацию через URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('admin') === 'true' || userId === 699229724;
}

async function loadProjects() {
    // В реальности получаем от бота через URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const projectsData = urlParams.get('projects');
    
    if (projectsData) {
        try {
            projects = JSON.parse(decodeURIComponent(projectsData));
        } catch (e) {
            console.error('Error parsing projects:', e);
        }
    }
    
    // Если нет данных - используем demo
    if (!projects || projects.length === 0) {
        projects = [
            {"abbr": "РС", "full": "Разработка сайта"},
            {"abbr": "МРК", "full": "Маркетинг"},
            {"abbr": "КП", "full": "Клиентская поддержка"},
            {"abbr": "ДЗ", "full": "Дизайн"},
            {"abbr": "ТСТ", "full": "Тестирование"}
        ];
    }
    
    renderProjects();
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = '';
    
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-abbr">${project.abbr}</div>
            <div class="project-name">${project.full}</div>
        `;
        card.addEventListener('click', () => selectProject(card, project));
        grid.appendChild(card);
    });
    
    // Также обновляем список проектов на странице управления
    renderProjectsList();
}

function renderProjectsList() {
    const list = document.getElementById('projectsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'stats-card';
        card.innerHTML = `
            <div class="stats-header">
                <span><strong>${project.abbr}</strong> - ${project.full}</span>
            </div>
        `;
        list.appendChild(card);
    });
}

function selectProject(card, project) {
    // Снимаем выделение
    document.querySelectorAll('.project-card').forEach(c => c.classList.remove('selected'));
    
    // Выделяем
    card.classList.add('selected');
    selectedProject = project;
    
    // Убираем ошибку
    document.getElementById('projectError').classList.remove('show');
    
    // Обновляем сводку
    updateSummary();
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Слайдер часов
const hoursRange = document.getElementById('hoursRange');
const hoursDisplay = document.getElementById('hoursDisplay');

if (hoursRange) {
    hoursRange.addEventListener('input', (e) => {
        hours = parseFloat(e.target.value);
        hoursDisplay.textContent = `${hours} ч`;
        updateQuickButtons();
        updateSummary();
    });
}

// Быстрые кнопки часов
const quickBtns = document.querySelectorAll('.quick-btn');
quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        hours = parseFloat(btn.dataset.hours);
        hoursRange.value = hours;
        hoursDisplay.textContent = `${hours} ч`;
        updateQuickButtons();
        updateSummary();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
});

function updateQuickButtons() {
    quickBtns.forEach(btn => {
        if (parseFloat(btn.dataset.hours) === hours) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Комментарий
const commentsInput = document.getElementById('comments');
if (commentsInput) {
    commentsInput.addEventListener('input', updateSummary);
}

function updateSummary() {
    const summary = document.getElementById('summary');
    
    if (selectedProject) {
        summary.style.display = 'block';
        document.getElementById('summaryProject').textContent = selectedProject.full;
        document.getElementById('summaryHours').textContent = `${hours} ч`;
        document.getElementById('summaryComment').textContent = commentsInput.value || 'Без комментария';
    }
}

// Отправка отчёта
function submitReport() {
    if (!selectedProject) {
        document.getElementById('projectError').classList.add('show');
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
        return;
    }
    
    const data = {
        type: 'report',
        project: selectedProject.full,
        project_abbr: selectedProject.abbr,
        hours: hours,
        comments: commentsInput.value || '-'
    };
    
    tg.sendData(JSON.stringify(data));
    tg.close();
}

// Добавление проекта
const newAbbrInput = document.getElementById('newAbbr');
const newFullNameInput = document.getElementById('newFullName');

if (newAbbrInput && newFullNameInput) {
    newAbbrInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
        updateNewProjectPreview();
    });
    
    newFullNameInput.addEventListener('input', updateNewProjectPreview);
}

function updateNewProjectPreview() {
    const preview = document.getElementById('newProjectPreview');
    const abbr = newAbbrInput.value.trim();
    const fullName = newFullNameInput.value.trim();
    
    if (abbr || fullName) {
        preview.style.display = 'block';
        document.getElementById('previewNewAbbr').textContent = abbr || 'АББ';
        document.getElementById('previewNewName').textContent = fullName || 'Полное название';
    } else {
        preview.style.display = 'none';
    }
}

function submitNewProject() {
    const abbr = newAbbrInput.value.trim();
    const fullName = newFullNameInput.value.trim();
    
    // Валидация
    let isValid = true;
    
    if (!abbr || abbr.length < 2) {
        document.getElementById('abbrError').classList.add('show');
        isValid = false;
    }
    
    if (!fullName || fullName.length < 3) {
        document.getElementById('nameError').classList.add('show');
        isValid = false;
    }
    
    // Проверка дубликатов
    const duplicate = projects.find(
        p => p.abbr.toUpperCase() === abbr.toUpperCase() || 
             p.full.toLowerCase() === fullName.toLowerCase()
    );
    
    if (duplicate) {
        if (duplicate.abbr.toUpperCase() === abbr.toUpperCase()) {
            document.getElementById('abbrError').textContent = 'Такая аббревиатура уже существует';
            document.getElementById('abbrError').classList.add('show');
        } else {
            document.getElementById('nameError').textContent = 'Такое название уже существует';
            document.getElementById('nameError').classList.add('show');
        }
        isValid = false;
    }
    
    if (!isValid) {
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
        return;
    }
    
    const data = {
        type: 'add_project',
        abbr: abbr,
        full: fullName
    };
    
    tg.sendData(JSON.stringify(data));
    tg.close();
}

// Навигация
function showPage(pageId) {
    // Сохраняем в историю
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        navigationHistory.push(currentPage.id);
    }
    
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Показываем нужную
    document.getElementById(pageId).classList.add('active');
    
    // Активируем кнопку навигации
    const navBtn = document.querySelector(`[data-page="${pageId}"]`);
    if (navBtn) {
        navBtn.classList.add('active');
    }
    
    // Специальные действия при открытии страниц
    if (pageId === 'stats') {
        loadStats();
    } else if (pageId === 'admin-stats') {
        loadAdminStats();
    }
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    // Скроллим наверх
    window.scrollTo(0, 0);
}

// Обработка кнопок навигации
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) {
            showPage(page);
        }
    });
});

// История навигации
function history_back() {
    if (navigationHistory.length > 0) {
        const previousPage = navigationHistory.pop();
        showPage(previousPage);
    } else {
        showPage('home');
    }
}

// Замена стандартной history.back()
window.history.back = history_back;

// Загрузка статистики
function loadStats() {
    const content = document.getElementById('statsContent');
    
    // Здесь можно запросить данные у бота через WebApp API
    // Пока покажем заглушку
    content.innerHTML = `
        <div class="stats-card">
            <div class="stats-header">
                <span>⏱️ Всего часов</span>
                <span class="stats-value">0</span>
            </div>
        </div>
        <div class="stats-card">
            <div class="stats-header">
                <span>📝 Отчётов</span>
                <span class="stats-value">0</span>
            </div>
        </div>
        <div class="info-card">
            💡 Создайте первый отчёт чтобы увидеть статистику!
        </div>
    `;
}

function loadAdminStats() {
    const iframe = document.getElementById('adminStatsFrame');
    // Загружаем админскую статистику
    iframe.src = 'admin_stats.html';
}

// Инициализация при загрузке
init();
updateQuickButtons();

console.log('App initialized');
