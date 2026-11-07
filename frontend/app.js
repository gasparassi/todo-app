// app.js — consome a API PHP (servida pelo nginx em /api/tasks) com interface Bootstrap 5
const API = '/api/tasks';

const form        = document.getElementById('task-form');
const input       = document.getElementById('task-input');
const addBtn      = document.getElementById('add-btn');
const charCount   = document.getElementById('char-count');
const list        = document.getElementById('task-list');
const toastArea   = document.getElementById('toast-area');
const progressBar = document.getElementById('progress-bar');
const progressLbl = document.getElementById('progress-label');
const themeToggle = document.getElementById('theme-toggle');

const modalEl      = document.getElementById('confirm-modal');
const confirmModal = new bootstrap.Modal(modalEl);
const confirmTitle = document.getElementById('confirm-task-title');
const confirmBtn   = document.getElementById('confirm-delete');

let tasks = [];
let currentFilter = 'all';
let pendingDeleteId = null;

// ── Tema claro/escuro (preferência salva no navegador) ──
function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    themeToggle.innerHTML = theme === 'dark'
        ? '<i class="bi bi-sun-fill"></i>'
        : '<i class="bi bi-moon-stars-fill"></i>';
    try { localStorage.setItem('theme', theme); } catch (_) { /* ignora */ }
}
let savedTheme = null;
try { savedTheme = localStorage.getItem('theme'); } catch (_) { /* ignora */ }
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
});

// Tooltips estáticos da página
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));

// ── Notificações (toasts) ──
function showToast(text, type = 'danger') {
    const icons = { success: 'check-circle-fill', danger: 'exclamation-octagon-fill', info: 'info-circle-fill' };
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    el.setAttribute('aria-atomic', 'true');
    el.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"><i class="bi bi-${icons[type] || icons.info} me-2"></i><span></span></div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>`;
    el.querySelector('.toast-body span').textContent = text; // textContent evita injeção de HTML
    toastArea.appendChild(el);
    const toast = new bootstrap.Toast(el, { delay: 3000 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    toast.show();
}

async function request(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
}

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value.replace(' ', 'T'));
    return isNaN(d) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Estatísticas, progresso e contadores ──
function updateStats() {
    const total = tasks.length;
    const done  = tasks.filter((t) => t.done).length;
    const pct   = total ? Math.round((done / total) * 100) : 0;

    progressBar.style.width = pct + '%';
    progressBar.parentElement.setAttribute('aria-valuenow', pct);
    progressBar.textContent = pct >= 15 ? pct + '%' : '';
    progressLbl.textContent = `${done} de ${total} concluídas`;

    document.getElementById('count-all').textContent     = total;
    document.getElementById('count-pending').textContent = total - done;
    document.getElementById('count-done').textContent    = done;
}

function emptyItem(text, icon) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-center py-4 text-body-secondary';
    li.innerHTML = `<i class="bi bi-${icon} fs-2 d-block mb-2"></i><span></span>`;
    li.querySelector('span').textContent = text;
    return li;
}

function render() {
    updateStats();
    list.innerHTML = '';

    const visible = tasks.filter((t) =>
        currentFilter === 'all' ? true : currentFilter === 'done' ? t.done : !t.done);

    if (tasks.length === 0) {
        list.appendChild(emptyItem('Nenhuma tarefa cadastrada.', 'inbox'));
        return;
    }
    if (visible.length === 0) {
        list.appendChild(emptyItem('Nenhuma tarefa neste filtro.', 'funnel'));
        return;
    }

    visible.forEach((task) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-center gap-3 py-3 task-item';
        if (task.done) li.classList.add('done');

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'form-check-input mt-0 flex-shrink-0';
        check.id = `task-${task.id}`;
        check.checked = task.done;
        check.addEventListener('change', () => toggleTask(task.id));

        const body = document.createElement('label');
        body.className = 'flex-grow-1 text-break';
        body.htmlFor = check.id;

        const title = document.createElement('div');
        title.className = 'task-title';
        title.textContent = task.title;   // textContent evita injeção de HTML

        const meta = document.createElement('small');
        meta.className = 'text-body-secondary';
        const created = formatDate(task.created_at);
        meta.innerHTML = created ? '<i class="bi bi-clock"></i> ' : '';
        meta.append(created);

        body.append(title, meta);

        const badge = document.createElement('span');
        badge.className = `badge rounded-pill ${task.done ? 'text-bg-success' : 'text-bg-warning'} d-none d-sm-inline`;
        badge.textContent = task.done ? 'Concluída' : 'Pendente';

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-sm btn-outline-danger flex-shrink-0';
        del.setAttribute('aria-label', 'Excluir');
        del.setAttribute('data-bs-title', 'Excluir tarefa');
        del.innerHTML = '<i class="bi bi-trash"></i>';
        const tip = new bootstrap.Tooltip(del);
        del.addEventListener('click', () => {
            tip.hide();
            askDelete(task);
        });

        li.append(check, body, badge, del);
        list.appendChild(li);
    });
}

// ── Operações da API ──
async function loadTasks() {
    try {
        tasks = await request(API);
        render();
    } catch (err) {
        list.innerHTML = '';
        list.appendChild(emptyItem('Não foi possível carregar as tarefas.', 'wifi-off'));
        showToast('Erro ao carregar: ' + err.message);
    }
}

async function addTask(title) {
    addBtn.disabled = true;
    const original = addBtn.innerHTML;
    addBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
    try {
        await request(API, { method: 'POST', body: JSON.stringify({ title }) });
        input.value = '';
        charCount.textContent = '0';
        form.classList.remove('was-validated');
        showToast('Tarefa adicionada!', 'success');
        await loadTasks();
    } catch (err) {
        showToast(err.message);
    } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = original;
        input.focus();
    }
}

async function toggleTask(id) {
    try {
        await request(`${API}/${id}`, { method: 'PUT' });
        await loadTasks();
    } catch (err) {
        showToast(err.message);
        render(); // restaura o estado do checkbox
    }
}

function askDelete(task) {
    pendingDeleteId = task.id;
    confirmTitle.textContent = `"${task.title}"`;
    confirmModal.show();
}

confirmBtn.addEventListener('click', async () => {
    if (pendingDeleteId === null) return;
    const id = pendingDeleteId;
    pendingDeleteId = null;
    confirmModal.hide();
    try {
        await request(`${API}/${id}`, { method: 'DELETE' });
        showToast('Tarefa excluída.', 'info');
        await loadTasks();
    } catch (err) {
        showToast(err.message);
    }
});

// ── Eventos da interface ──
input.addEventListener('input', () => {
    charCount.textContent = input.value.length;
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) {
        input.value = '';
        form.classList.add('was-validated');
        return;
    }
    addTask(title);
});

document.querySelectorAll('#filters [data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#filters .nav-link').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

loadTasks();
