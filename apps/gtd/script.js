const LISTS = ["inbox", "next", "project", "waiting", "someday"];
const STORAGE_KEY = "gtd-items";

let items = loadItems();
let currentList = "inbox";
let moveTargetId = null;

// --- DOM ---
const inboxForm = document.getElementById("inbox-form");
const inboxInput = document.getElementById("inbox-input");
const itemsList = document.getElementById("items-list");
const emptyState = document.getElementById("empty-state");
const tabs = document.querySelectorAll(".tab-btn");
const moveModal = document.getElementById("move-modal");
const moveOptions = document.querySelectorAll(".move-option");
const moveCancel = document.getElementById("move-cancel");
const clearDoneBtn = document.getElementById("clear-done-btn");

// --- Storage ---
function loadItems() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// --- Render ---
function render() {
    const filtered = items.filter((item) => item.list === currentList);
    itemsList.innerHTML = "";

    if (filtered.length === 0) {
        emptyState.classList.remove("hidden");
    } else {
        emptyState.classList.add("hidden");
        filtered.forEach((item) => {
            itemsList.appendChild(createItemEl(item));
        });
    }

    updateTabCounts();
}

function createItemEl(item) {
    const li = document.createElement("li");
    li.className = "item-card item-enter" + (item.done ? " done" : "");

    const checkbox = document.createElement("div");
    checkbox.className = "item-checkbox" + (item.done ? " checked" : "");
    checkbox.addEventListener("click", () => toggleDone(item.id));

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = item.text;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const moveBtn = document.createElement("button");
    moveBtn.className = "item-btn";
    moveBtn.textContent = "移動";
    moveBtn.addEventListener("click", () => openMoveModal(item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "item-btn delete";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => deleteItem(item.id));

    actions.appendChild(moveBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(actions);
    return li;
}

function updateTabCounts() {
    tabs.forEach((tab) => {
        const list = tab.dataset.list;
        const count = items.filter((i) => i.list === list && !i.done).length;
        const label = {
            inbox: "Inbox",
            next: "Next",
            project: "Projects",
            waiting: "Waiting",
            someday: "Someday",
        }[list];
        tab.textContent = count > 0 ? `${label} (${count})` : label;
    });
}

// --- Actions ---
function addItem(text) {
    items.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: text.trim(),
        list: "inbox",
        done: false,
        createdAt: Date.now(),
    });
    saveItems();
    if (currentList === "inbox") {
        render();
    } else {
        switchTab("inbox");
    }
}

function toggleDone(id) {
    const item = items.find((i) => i.id === id);
    if (item) {
        item.done = !item.done;
        saveItems();
        render();
    }
}

function deleteItem(id) {
    items = items.filter((i) => i.id !== id);
    saveItems();
    render();
}

function moveItem(id, targetList) {
    const item = items.find((i) => i.id === id);
    if (item) {
        item.list = targetList;
        saveItems();
        render();
    }
}

function clearDone() {
    items = items.filter((i) => !i.done);
    saveItems();
    render();
}

// --- Tabs ---
function switchTab(list) {
    currentList = list;
    tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.list === list);
    });
    render();
}

// --- Modal ---
function openMoveModal(id) {
    moveTargetId = id;
    moveModal.classList.remove("hidden");
    moveModal.classList.add("flex");
}

function closeMoveModal() {
    moveTargetId = null;
    moveModal.classList.add("hidden");
    moveModal.classList.remove("flex");
}

// --- Events ---
inboxForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inboxInput.value.trim();
    if (text) {
        addItem(text);
        inboxInput.value = "";
    }
});

tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.list));
});

moveOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
        if (moveTargetId) {
            moveItem(moveTargetId, opt.dataset.target);
            closeMoveModal();
        }
    });
});

moveCancel.addEventListener("click", closeMoveModal);

moveModal.addEventListener("click", (e) => {
    if (e.target === moveModal) closeMoveModal();
});

clearDoneBtn.addEventListener("click", clearDone);

// --- Init ---
render();
