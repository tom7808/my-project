// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const LISTS = ["inbox", "next", "project", "waiting", "someday"];
const LIST_LABELS = {
    inbox: "📥 インボックス",
    next: "⚡ 次のアクション",
    project: "📁 プロジェクト",
    waiting: "⏳ 待ち中",
    someday: "💭 いつか",
};
const CONTEXTS = ["work", "home", "phone", "computer"];
const CONTEXT_LABELS = {
    work: "💼 仕事",
    home: "🏠 自宅",
    phone: "📱 電話",
    computer: "💻 コンピュータ",
};
const CONTEXT_COLORS = {
    work: "task-context-work",
    home: "task-context-home",
    phone: "task-context-phone",
    computer: "task-context-computer",
};
const PRIORITY_LABELS = {
    high: "高",
    medium: "中",
    low: "低",
};
const STORAGE_KEY = "gtdpro-items";
const THEME_KEY = "gtdpro-theme";

// ============================================================================
// DOM REFERENCES
// ============================================================================

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const mainTabs = document.getElementById("main-tabs");
const filterTabs = document.getElementById("filter-tabs");
const listContainer = document.getElementById("list-container");
const reviewSection = document.getElementById("review-section");

const taskModal = document.getElementById("task-modal");
const taskEditForm = document.getElementById("task-edit-form");
const editTitle = document.getElementById("edit-title");
const editDescription = document.getElementById("edit-description");
const editPriority = document.getElementById("edit-priority");
const editDueDate = document.getElementById("edit-due-date");
const editProject = document.getElementById("edit-project");
const editTags = document.getElementById("edit-tags");
const modalClose = document.getElementById("modal-close");
const modalCancel = document.getElementById("modal-cancel");
const modalDelete = document.getElementById("modal-delete");

const moveModal = document.getElementById("move-modal");
const moveCancel = document.getElementById("move-cancel");

const deleteModal = document.getElementById("delete-modal");
const confirmDelete = document.getElementById("confirm-delete");
const cancelDelete = document.getElementById("cancel-delete");

const shortcutsModal = document.getElementById("shortcuts-modal");
const shortcutsBtn = document.getElementById("shortcuts-btn");
const shortcutsClose = document.getElementById("shortcuts-close");

const clearCompletedBtn = document.getElementById("clear-completed-btn");
const themeToggle = document.getElementById("theme-toggle");

// ============================================================================
// STATE VARIABLES
// ============================================================================

let items = [];
let currentList = "inbox";
let currentFilter = "all";
let currentContext = null;
let editingTaskId = null;
let moveTargetId = null;
let deleteTargetId = null;
let darkMode = true;

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

function loadItems() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error("Failed to load items:", error);
        return [];
    }
}

function saveItems() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error("Failed to save items:", error);
    }
}

function loadTheme() {
    try {
        const stored = localStorage.getItem(THEME_KEY);
        return stored === "light" ? false : true;
    } catch {
        return true;
    }
}

function saveTheme(isDark) {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

function applyTheme() {
    if (darkMode) {
        document.body.classList.remove("light-mode");
        themeToggle.textContent = "🌙";
    } else {
        document.body.classList.add("light-mode");
        themeToggle.textContent = "☀️";
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createTask(text) {
    return {
        id: generateId(),
        text: text.trim(),
        description: "",
        list: "inbox",
        done: false,
        priority: "medium",
        dueDate: null,
        project: "",
        contexts: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

function isTaskDueToday(dueDate) {
    if (!dueDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return dueDate === today;
}

function isTaskThisWeek(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    return daysUntilDue >= 0 && daysUntilDue <= 7;
}

function getFilteredItems() {
    let filtered = items.filter(item => item.list === currentList);

    if (currentFilter === "today") {
        filtered = filtered.filter(item => !item.done && isTaskDueToday(item.dueDate));
    } else if (currentFilter === "week") {
        filtered = filtered.filter(item => !item.done && isTaskThisWeek(item.dueDate));
    } else if (currentFilter === "context" && currentContext) {
        filtered = filtered.filter(item => item.contexts.includes(currentContext));
    }

    // Sort by priority, then by creation date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt - a.createdAt;
    });

    return filtered;
}

// ============================================================================
// TASK OPERATIONS
// ============================================================================

function addTask(text) {
    if (!text.trim()) return;
    const task = createTask(text);
    items.unshift(task);
    saveItems();
    if (currentList !== "inbox") {
        currentList = "inbox";
        currentFilter = "all";
        updateTabs();
    }
    render();
}

function editTask(id, updates) {
    const task = items.find(t => t.id === id);
    if (!task) return;
    Object.assign(task, updates, { updatedAt: Date.now() });
    saveItems();
    render();
}

function deleteTask(id) {
    items = items.filter(t => t.id !== id);
    saveItems();
    render();
}

function toggleDone(id) {
    const task = items.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        saveItems();
        render();
    }
}

function moveTask(id, targetList) {
    const task = items.find(t => t.id === id);
    if (task) {
        task.list = targetList;
        saveItems();
        render();
    }
}

function clearCompletedTasks() {
    items = items.filter(t => !t.done);
    saveItems();
    render();
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

function render() {
    renderTaskList();
    updateTabCounts();
    updateReviewStats();
}

function renderTaskList() {
    const filtered = getFilteredItems();
    taskList.innerHTML = "";

    if (filtered.length === 0) {
        emptyState.classList.remove("hidden");
    } else {
        emptyState.classList.add("hidden");
        filtered.forEach(task => {
            taskList.appendChild(createTaskElement(task));
        });
    }
}

function createTaskElement(task) {
    const li = document.createElement("li");
    li.className = "task-card" + (task.done ? " done" : "");
    li.dataset.taskId = task.id;

    // Checkbox
    const checkbox = document.createElement("div");
    checkbox.className = "task-checkbox" + (task.done ? " checked" : "");
    checkbox.addEventListener("click", () => toggleDone(task.id));

    // Content
    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.text;

    content.appendChild(title);

    // Meta info (if available)
    if (task.description || task.dueDate || task.contexts.length > 0 || task.priority !== "medium" || task.project || task.tags.length > 0) {
        const meta = document.createElement("div");
        meta.className = "task-meta";

        // Due date
        if (task.dueDate) {
            const dateEl = document.createElement("span");
            dateEl.className = "task-due-date";
            dateEl.textContent = `📅 ${new Date(task.dueDate).toLocaleDateString("ja-JP")}`;
            meta.appendChild(dateEl);
        }

        // Priority
        if (task.priority !== "medium") {
            const priorityEl = document.createElement("span");
            priorityEl.className = `task-priority task-priority-${task.priority}`;
            priorityEl.textContent = PRIORITY_LABELS[task.priority];
            meta.appendChild(priorityEl);
        }

        // Contexts
        task.contexts.forEach(ctx => {
            const ctxEl = document.createElement("span");
            ctxEl.className = `task-badge ${CONTEXT_COLORS[ctx]}`;
            ctxEl.textContent = CONTEXT_LABELS[ctx];
            meta.appendChild(ctxEl);
        });

        // Project
        if (task.project) {
            const projectEl = document.createElement("span");
            projectEl.className = "task-badge";
            projectEl.style.background = "rgba(168, 85, 247, 0.2)";
            projectEl.style.borderColor = "rgba(168, 85, 247, 0.4)";
            projectEl.style.color = "#d8b4fe";
            projectEl.textContent = `📂 ${task.project}`;
            meta.appendChild(projectEl);
        }

        // Tags
        task.tags.forEach(tag => {
            const tagEl = document.createElement("span");
            tagEl.className = "task-badge";
            tagEl.textContent = `#${tag}`;
            meta.appendChild(tagEl);
        });

        content.appendChild(meta);
    }

    // Actions
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "task-btn";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", () => openEditModal(task.id));

    const moveBtn = document.createElement("button");
    moveBtn.className = "task-btn";
    moveBtn.textContent = "移動";
    moveBtn.addEventListener("click", () => openMoveModal(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "task-btn delete";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => openDeleteModal(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(moveBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(actions);

    return li;
}

function updateTabCounts() {
    // Update main tabs
    const tabBtns = mainTabs.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        const list = btn.dataset.tab;
        const count = items.filter(i => i.list === list && !i.done).length;
        const label = LIST_LABELS[list];
        btn.textContent = count > 0 ? `${label} (${count})` : label;
        btn.classList.toggle("active", list === currentList);
    });
}

function updateReviewStats() {
    if (reviewSection.classList.contains("hidden")) return;

    const activeItems = items.filter(i => !i.done);
    const completedItems = items.filter(i => i.done);
    const thisWeekItems = items.filter(i => isTaskThisWeek(i.dueDate));
    const completionRate = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

    document.getElementById("stat-total").textContent = items.length;
    document.getElementById("stat-active").textContent = activeItems.length;
    document.getElementById("stat-completed").textContent = completedItems.length;
    document.getElementById("stat-rate").textContent = `${completionRate}%`;
    document.getElementById("stat-this-week").textContent = thisWeekItems.length;

    // Priority breakdown
    const priorityBreakdown = document.getElementById("priority-breakdown");
    priorityBreakdown.innerHTML = "";
    const priorityCounts = { high: 0, medium: 0, low: 0 };
    activeItems.forEach(item => {
        priorityCounts[item.priority]++;
    });
    const maxPriority = Math.max(...Object.values(priorityCounts));
    Object.entries(priorityCounts).forEach(([priority, count]) => {
        const pct = maxPriority > 0 ? Math.round((count / maxPriority) * 100) : 0;
        const div = document.createElement("div");
        div.className = "breakdown-item";
        div.innerHTML = `
            <span>${PRIORITY_LABELS[priority]}</span>
            <div class="breakdown-bar">
                <div class="breakdown-progress">
                    <div class="breakdown-progress-fill" style="width: ${pct}%"></div>
                </div>
                <span style="min-width: 2rem; text-align: right;">${count}</span>
            </div>
        `;
        priorityBreakdown.appendChild(div);
    });

    // Context breakdown
    const contextBreakdown = document.getElementById("context-breakdown");
    contextBreakdown.innerHTML = "";
    const contextCounts = { work: 0, home: 0, phone: 0, computer: 0 };
    activeItems.forEach(item => {
        item.contexts.forEach(ctx => {
            if (contextCounts[ctx] !== undefined) contextCounts[ctx]++;
        });
    });
    const maxContext = Math.max(...Object.values(contextCounts));
    Object.entries(contextCounts).forEach(([context, count]) => {
        const pct = maxContext > 0 ? Math.round((count / maxContext) * 100) : 0;
        const div = document.createElement("div");
        div.className = "breakdown-item";
        div.innerHTML = `
            <span>${CONTEXT_LABELS[context]}</span>
            <div class="breakdown-bar">
                <div class="breakdown-progress">
                    <div class="breakdown-progress-fill" style="width: ${pct}%"></div>
                </div>
                <span style="min-width: 2rem; text-align: right;">${count}</span>
            </div>
        `;
        contextBreakdown.appendChild(div);
    });

    // Project breakdown
    const projectBreakdown = document.getElementById("project-breakdown");
    projectBreakdown.innerHTML = "";
    const projectCounts = {};
    activeItems.forEach(item => {
        if (item.project) {
            projectCounts[item.project] = (projectCounts[item.project] || 0) + 1;
        }
    });
    const maxProject = Math.max(...Object.values(projectCounts || {}), 0);
    if (Object.keys(projectCounts).length === 0) {
        const div = document.createElement("div");
        div.className = "breakdown-item";
        div.innerHTML = "<span>プロジェクトなし</span>";
        projectBreakdown.appendChild(div);
    } else {
        Object.entries(projectCounts).forEach(([project, count]) => {
            const pct = maxProject > 0 ? Math.round((count / maxProject) * 100) : 0;
            const div = document.createElement("div");
            div.className = "breakdown-item";
            div.innerHTML = `
                <span>${project}</span>
                <div class="breakdown-bar">
                    <div class="breakdown-progress">
                        <div class="breakdown-progress-fill" style="width: ${pct}%"></div>
                    </div>
                    <span style="min-width: 2rem; text-align: right;">${count}</span>
                </div>
            `;
            projectBreakdown.appendChild(div);
        });
    }

    // List breakdown
    const listBreakdown = document.getElementById("list-breakdown");
    listBreakdown.innerHTML = "";
    const listCounts = { inbox: 0, next: 0, project: 0, waiting: 0, someday: 0 };
    activeItems.forEach(item => {
        if (listCounts[item.list] !== undefined) listCounts[item.list]++;
    });
    const maxList = Math.max(...Object.values(listCounts));
    LISTS.forEach(list => {
        const count = listCounts[list];
        const pct = maxList > 0 ? Math.round((count / maxList) * 100) : 0;
        const div = document.createElement("div");
        div.className = "breakdown-item";
        div.innerHTML = `
            <span>${LIST_LABELS[list]}</span>
            <div class="breakdown-bar">
                <div class="breakdown-progress">
                    <div class="breakdown-progress-fill" style="width: ${pct}%"></div>
                </div>
                <span style="min-width: 2rem; text-align: right;">${count}</span>
            </div>
        `;
        listBreakdown.appendChild(div);
    });
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

function openEditModal(taskId) {
    editingTaskId = taskId;
    const task = items.find(t => t.id === taskId);
    if (!task) return;

    editTitle.value = task.text;
    editDescription.value = task.description;
    editPriority.value = task.priority;
    editDueDate.value = task.dueDate || "";
    editProject.value = task.project;
    editTags.value = task.tags.join(", ");

    // Clear and set contexts
    document.querySelectorAll("input[id^='context-']").forEach(cb => {
        cb.checked = task.contexts.includes(cb.value);
    });

    taskModal.classList.remove("hidden");
    taskModal.classList.add("flex");
    editTitle.focus();
}

function closeEditModal() {
    editingTaskId = null;
    taskModal.classList.add("hidden");
    taskModal.classList.remove("flex");
}

function openMoveModal(taskId) {
    moveTargetId = taskId;
    moveModal.classList.remove("hidden");
    moveModal.classList.add("flex");
}

function closeMoveModal() {
    moveTargetId = null;
    moveModal.classList.add("hidden");
    moveModal.classList.remove("flex");
}

function openDeleteModal(taskId) {
    deleteTargetId = taskId;
    deleteModal.classList.remove("hidden");
    deleteModal.classList.add("flex");
}

function closeDeleteModal() {
    deleteTargetId = null;
    deleteModal.classList.add("hidden");
    deleteModal.classList.remove("flex");
}

function openShortcutsModal() {
    shortcutsModal.classList.remove("hidden");
    shortcutsModal.classList.add("flex");
}

function closeShortcutsModal() {
    shortcutsModal.classList.add("hidden");
    shortcutsModal.classList.remove("flex");
}

// ============================================================================
// TAB & FILTER FUNCTIONS
// ============================================================================

function switchMainTab(list) {
    currentList = list;
    currentFilter = "all";
    currentContext = null;
    updateTabs();
    render();
    listContainer.scrollTop = 0;
}

function applyFilter(filter, context = null) {
    currentFilter = filter;
    if (context) currentContext = context;
    updateTabs();
    render();
    listContainer.scrollTop = 0;
}

function switchReview() {
    const isReview = reviewSection.classList.contains("hidden");
    reviewSection.classList.toggle("hidden");
    listContainer.classList.toggle("hidden");

    const reviewFilter = filterTabs.querySelector('[data-filter="review"]');
    if (reviewFilter) {
        reviewFilter.classList.toggle("active", isReview);
    }

    if (isReview) {
        updateReviewStats();
    }
}

function updateTabs() {
    // Update main tabs
    mainTabs.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === currentList);
    });

    // Update filter tabs
    filterTabs.querySelectorAll(".filter-btn").forEach(btn => {
        const isActive = btn.dataset.filter === currentFilter ||
                         (currentFilter === "context" && btn.dataset.filter === "context");
        btn.classList.toggle("active", isActive);
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Task form
taskForm.addEventListener("submit", e => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (text) {
        addTask(text);
        taskInput.value = "";
    }
});

// Main tabs
mainTabs.addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (btn) switchMainTab(btn.dataset.tab);
});

// Filter tabs
filterTabs.addEventListener("click", e => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    const filter = btn.dataset.filter;
    if (filter === "clear") {
        clearCompletedTasks();
    } else if (filter === "review") {
        switchReview();
    } else {
        applyFilter(filter);
    }
});

// Context filter
document.querySelectorAll(".context-filter").forEach(btn => {
    btn.addEventListener("click", e => {
        e.stopPropagation();
        applyFilter("context", btn.dataset.context);
    });
});

// Task modal
taskEditForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!editingTaskId) return;

    const contexts = [];
    document.querySelectorAll("input[id^='context-']:checked").forEach(cb => {
        contexts.push(cb.value);
    });

    const tags = editTags.value
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag);

    editTask(editingTaskId, {
        text: editTitle.value,
        description: editDescription.value,
        priority: editPriority.value,
        dueDate: editDueDate.value || null,
        project: editProject.value,
        contexts,
        tags,
    });

    closeEditModal();
});

modalClose.addEventListener("click", closeEditModal);
modalCancel.addEventListener("click", closeEditModal);
modalDelete.addEventListener("click", () => openDeleteModal(editingTaskId));

taskModal.addEventListener("click", e => {
    if (e.target === taskModal) closeEditModal();
});

// Move modal
moveModal.addEventListener("click", e => {
    if (e.target === moveModal) closeMoveModal();
});

moveCancel.addEventListener("click", closeMoveModal);

document.querySelectorAll(".move-option").forEach(btn => {
    btn.addEventListener("click", () => {
        if (moveTargetId) {
            moveTask(moveTargetId, btn.dataset.target);
            closeMoveModal();
        }
    });
});

// Delete modal
deleteModal.addEventListener("click", e => {
    if (e.target === deleteModal) closeDeleteModal();
});

confirmDelete.addEventListener("click", () => {
    if (deleteTargetId) {
        deleteTask(deleteTargetId);
        closeDeleteModal();
        closeEditModal();
    }
});

cancelDelete.addEventListener("click", closeDeleteModal);

// Shortcuts
shortcutsBtn.addEventListener("click", openShortcutsModal);
shortcutsClose.addEventListener("click", closeShortcutsModal);

shortcutsModal.addEventListener("click", e => {
    if (e.target === shortcutsModal) closeShortcutsModal();
});

// Theme toggle
themeToggle.addEventListener("click", () => {
    darkMode = !darkMode;
    saveTheme(darkMode);
    applyTheme();
});

// Clear completed
clearCompletedBtn.addEventListener("click", clearCompletedTasks);

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener("keydown", e => {
    // N key: new task
    if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeEl = document.activeElement;
        if (activeEl !== taskInput && activeEl.tagName !== "TEXTAREA" && activeEl.tagName !== "INPUT") {
            e.preventDefault();
            taskInput.focus();
        }
    }

    // Escape: close modals
    if (e.key === "Escape") {
        if (!taskModal.classList.contains("hidden")) {
            closeEditModal();
        } else if (!moveModal.classList.contains("hidden")) {
            closeMoveModal();
        } else if (!deleteModal.classList.contains("hidden")) {
            closeDeleteModal();
        } else if (!shortcutsModal.classList.contains("hidden")) {
            closeShortcutsModal();
        }
    }

    // ? key: show shortcuts
    if (e.key === "?" && !e.shiftKey) {
        const activeEl = document.activeElement;
        if (activeEl.tagName !== "INPUT" && activeEl.tagName !== "TEXTAREA") {
            e.preventDefault();
            openShortcutsModal();
        }
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    items = loadItems();
    darkMode = loadTheme();
    applyTheme();
    render();
    updateTabs();
}

init();
