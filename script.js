"use strict";

const STORAGE_KEY = "studyflow-state-v1";
const PAGE_TITLES = {
    dashboard: "Dashboard",
    tasks: "Tasks",
    calendar: "Calendar",
    subjects: "Subjects",
    settings: "Settings"
};
const DEFAULT_STATE = {
    tasks: [
        { id: "seed-html", title: "Study HTML", subject: "Web Development", dueDate: "", completed: false },
        { id: "seed-css", title: "Practice CSS", subject: "Web Development", dueDate: "", completed: false },
        { id: "seed-js", title: "Learn JavaScript", subject: "Web Development", dueDate: "", completed: false },
        { id: "seed-bootstrap", title: "Study Bootstrap", subject: "Web Development", dueDate: "", completed: false },
        { id: "seed-react", title: "Learn React", subject: "Web Development", dueDate: "", completed: false }
    ],
    subjects: ["General", "Web Development"],
    darkTheme: false
};

let state;
let shouldSaveInitialState = false;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDate = toDateKey(new Date());

const elements = {
    message: document.getElementById("appMessage"),
    dashboardTotal: document.getElementById("dashboardTotal"),
    dashboardCompleted: document.getElementById("dashboardCompleted"),
    dashboardSubjects: document.getElementById("dashboardSubjects"),
    dashboardTasks: document.getElementById("dashboardTasks"),
    totalTasks: document.getElementById("totalTasks"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    taskSubject: document.getElementById("taskSubject"),
    taskDueDate: document.getElementById("taskDueDate"),
    taskList: document.getElementById("taskList"),
    subjectForm: document.getElementById("subjectForm"),
    subjectInput: document.getElementById("subjectInput"),
    subjectList: document.getElementById("subjectList"),
    calendarMonth: document.getElementById("calendarMonth"),
    calendarGrid: document.getElementById("calendarGrid"),
    selectedDateLabel: document.getElementById("selectedDateLabel"),
    calendarTasks: document.getElementById("calendarTasks"),
    themeToggle: document.getElementById("themeToggle"),
    clearCompleted: document.getElementById("clearCompleted"),
    todayLabel: document.getElementById("todayLabel")
};

state = loadState();

function showMessage(message) {
    elements.message.textContent = message;
    elements.message.hidden = false;
}

function clearMessage() {
    elements.message.textContent = "";
    elements.message.hidden = true;
}

function createDefaultState() {
    return {
        tasks: DEFAULT_STATE.tasks.map((task) => ({ ...task })),
        subjects: [...DEFAULT_STATE.subjects],
        darkTheme: DEFAULT_STATE.darkTheme
    };
}

function loadState() {
    let saved;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            shouldSaveInitialState = true;
            return createDefaultState();
        }
        saved = JSON.parse(raw);
    } catch (error) {
        showMessage("Saved planner data could not be read. The default planner has been loaded.");
        return createDefaultState();
    }

    if (
        !saved ||
        !Array.isArray(saved.tasks) ||
        !Array.isArray(saved.subjects) ||
        typeof saved.darkTheme !== "boolean" ||
        !saved.tasks.every((task) =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.subject === "string" &&
            typeof task.completed === "boolean" &&
            (typeof task.dueDate === "string" || task.dueDate === undefined)
        ) ||
        !saved.subjects.every((subject) => typeof subject === "string")
    ) {
        showMessage("Saved planner data is invalid. The default planner has been loaded.");
        return createDefaultState();
    }

    return {
        tasks: saved.tasks.map((task) => ({ ...task, dueDate: task.dueDate || "" })),
        subjects: [...new Set(saved.subjects)],
        darkTheme: saved.darkTheme
    };
}

function saveState() {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        clearMessage();
        return true;
    } catch (error) {
        showMessage("Your changes are visible now, but could not be saved in this browser.");
        return false;
    }
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
    if (!dateKey) {
        return "";
    }

    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function setPage(pageName) {
    if (!Object.prototype.hasOwnProperty.call(PAGE_TITLES, pageName)) {
        window.location.hash = "dashboard";
        return;
    }

    document.querySelectorAll(".page-view").forEach((view) => {
        view.hidden = view.dataset.page !== pageName;
    });
    document.querySelectorAll("[data-page-link]").forEach((link) => {
        if (link.dataset.pageLink === pageName) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
    document.title = `${PAGE_TITLES[pageName]} — Studyflow`;
}

function createTaskRow(task, options = {}) {
    const row = document.createElement("div");
    row.className = `task-row${task.completed ? " is-complete" : ""}`;
    row.dataset.taskId = task.id;

    const checkbox = document.createElement("input");
    checkbox.className = "task-check";
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute("aria-label", `${task.completed ? "Mark incomplete" : "Complete"}: ${task.title}`);

    const copy = document.createElement("div");
    copy.className = "task-copy";
    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.title;
    copy.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "task-meta";
    if (task.subject) {
        const subject = document.createElement("span");
        subject.className = "subject-pill";
        subject.textContent = task.subject;
        meta.appendChild(subject);
    }
    if (task.dueDate) {
        const dueDate = document.createElement("span");
        dueDate.textContent = `Due ${formatDate(task.dueDate)}`;
        meta.appendChild(dueDate);
    }
    if (meta.childElementCount > 0) {
        copy.appendChild(meta);
    }

    row.append(checkbox, copy);
    if (options.allowDelete) {
        const remove = document.createElement("button");
        remove.className = "icon-button";
        remove.type = "button";
        remove.dataset.action = "delete";
        remove.setAttribute("aria-label", `Delete ${task.title}`);
        remove.textContent = "×";
        row.appendChild(remove);
    }

    return row;
}

function renderTaskRows(container, tasks, options = {}) {
    container.replaceChildren();
    if (tasks.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = options.emptyText || "No tasks here yet.";
        container.appendChild(empty);
        return;
    }

    tasks.forEach((task) => container.appendChild(createTaskRow(task, options)));
}

function renderSubjects() {
    elements.taskSubject.replaceChildren();
    state.subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        elements.taskSubject.appendChild(option);
    });

    elements.subjectList.replaceChildren();
    if (state.subjects.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No subjects yet. Add one above to organize your tasks.";
        elements.subjectList.appendChild(empty);
        return;
    }

    state.subjects.forEach((subject) => {
        const item = document.createElement("div");
        item.className = "subject-item";
        const name = document.createElement("span");
        name.textContent = subject;
        item.appendChild(name);

        if (subject !== "General") {
            const remove = document.createElement("button");
            remove.className = "subject-remove";
            remove.type = "button";
            remove.dataset.subject = subject;
            remove.setAttribute("aria-label", `Remove ${subject}`);
            remove.textContent = "×";
            item.appendChild(remove);
        }
        elements.subjectList.appendChild(item);
    });
}

function renderDashboard() {
    const completed = state.tasks.filter((task) => task.completed).length;
    elements.dashboardTotal.textContent = String(state.tasks.length);
    elements.dashboardCompleted.textContent = String(completed);
    elements.dashboardSubjects.textContent = String(state.subjects.length);
    const openTasks = state.tasks.filter((task) => !task.completed);
    renderTaskRows(elements.dashboardTasks, openTasks.slice(0, 5), {
        emptyText: "You’re all caught up. Add a task when you’re ready."
    });
}

function renderTasks() {
    const remaining = state.tasks.filter((task) => !task.completed).length;
    elements.totalTasks.textContent = String(remaining);
    renderTaskRows(elements.taskList, state.tasks, {
        allowDelete: true,
        emptyText: "No tasks yet. Add your first study task above."
    });
}

function renderCalendar() {
    elements.calendarMonth.textContent = calendarMonth.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
    });
    elements.calendarGrid.replaceChildren();

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
        const label = document.createElement("span");
        label.className = "calendar-weekday";
        label.textContent = day;
        elements.calendarGrid.appendChild(label);
    });

    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    const today = toDateKey(new Date());

    for (let index = 0; index < 42; index += 1) {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        const dateKey = toDateKey(date);
        const dayTasks = state.tasks.filter((task) => task.dueDate === dateKey);
        const button = document.createElement("button");
        button.className = "calendar-day";
        button.type = "button";
        button.dataset.date = dateKey;
        button.setAttribute("aria-label", `${date.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric"
        })}${dayTasks.length ? `, ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}` : ""}`);
        if (date.getMonth() !== calendarMonth.getMonth()) {
            button.classList.add("is-outside");
        }
        if (dateKey === today) {
            button.classList.add("is-today");
        }
        if (dateKey === selectedDate) {
            button.classList.add("is-selected");
            button.setAttribute("aria-pressed", "true");
        } else {
            button.setAttribute("aria-pressed", "false");
        }

        const number = document.createElement("span");
        number.textContent = String(date.getDate());
        button.appendChild(number);
        const dots = document.createElement("span");
        dots.className = "calendar-dots";
        dots.textContent = dayTasks.length ? "•".repeat(Math.min(dayTasks.length, 4)) : "";
        dots.setAttribute("aria-hidden", "true");
        button.appendChild(dots);
        elements.calendarGrid.appendChild(button);
    }

    elements.selectedDateLabel.textContent = `Tasks for ${formatDate(selectedDate)}`;
    const selectedTasks = state.tasks.filter((task) => task.dueDate === selectedDate);
    renderTaskRows(elements.calendarTasks, selectedTasks, {
        allowDelete: true,
        emptyText: "No tasks scheduled for this day."
    });
}

function render() {
    renderSubjects();
    renderDashboard();
    renderTasks();
    renderCalendar();
    elements.themeToggle.checked = state.darkTheme;
    document.body.classList.toggle("dark-theme", state.darkTheme);
}

function addTask(event) {
    event.preventDefault();
    const title = elements.taskInput.value.trim();
    if (!title) {
        showMessage("Enter a task before adding it.");
        elements.taskInput.focus();
        return;
    }

    state.tasks.unshift({
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        subject: elements.taskSubject.value || "General",
        dueDate: elements.taskDueDate.value,
        completed: false
    });
    elements.taskForm.reset();
    render();
    saveState();
    elements.taskInput.focus();
}

function handleTaskAction(event) {
    const control = event.target.closest("[data-action]");
    if (!control) {
        return;
    }
    if (control.dataset.action === "toggle" && event.type !== "change") {
        return;
    }
    const row = control.closest("[data-task-id]");
    const task = state.tasks.find((item) => item.id === row?.dataset.taskId);
    if (!task) {
        return;
    }

    if (control.dataset.action === "toggle") {
        task.completed = control.checked;
    } else if (control.dataset.action === "delete") {
        state.tasks = state.tasks.filter((item) => item.id !== task.id);
    }

    render();
    saveState();
}

function addSubject(event) {
    event.preventDefault();
    const subject = elements.subjectInput.value.trim();
    if (!subject) {
        showMessage("Enter a subject name before adding it.");
        elements.subjectInput.focus();
        return;
    }
    if (state.subjects.some((item) => item.toLocaleLowerCase() === subject.toLocaleLowerCase())) {
        showMessage("That subject already exists.");
        elements.subjectInput.focus();
        return;
    }

    state.subjects.push(subject);
    elements.subjectForm.reset();
    render();
    saveState();
    elements.subjectInput.focus();
}

function removeSubject(event) {
    const button = event.target.closest("[data-subject]");
    if (!button) {
        return;
    }
    const subject = button.dataset.subject;
    const hasTasks = state.tasks.some((task) => task.subject === subject);
    if (hasTasks && !window.confirm(`Tasks assigned to "${subject}" will be moved to General. Continue?`)) {
        return;
    }
    state.subjects = state.subjects.filter((item) => item !== subject);
    state.tasks.forEach((task) => {
        if (task.subject === subject) {
            task.subject = "General";
        }
    });
    render();
    saveState();
}

function changeMonth(offset) {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    renderCalendar();
}

document.querySelectorAll("[data-page-link]").forEach((link) => {
    link.addEventListener("click", () => {
        clearMessage();
    });
});

window.addEventListener("hashchange", () => {
    const pageName = window.location.hash.slice(1) || "dashboard";
    setPage(pageName);
    clearMessage();
});

elements.taskForm.addEventListener("submit", addTask);
elements.taskList.addEventListener("click", handleTaskAction);
elements.taskList.addEventListener("change", handleTaskAction);
elements.dashboardTasks.addEventListener("change", handleTaskAction);
elements.calendarTasks.addEventListener("click", handleTaskAction);
elements.calendarTasks.addEventListener("change", handleTaskAction);
elements.subjectForm.addEventListener("submit", addSubject);
elements.subjectList.addEventListener("click", removeSubject);
elements.calendarGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) {
        return;
    }
    selectedDate = button.dataset.date;
    const [year, month] = selectedDate.split("-").map(Number);
    calendarMonth = new Date(year, month - 1, 1);
    renderCalendar();
});
document.getElementById("previousMonth").addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
document.getElementById("calendarAddTask").addEventListener("click", () => {
    elements.taskDueDate.value = selectedDate;
});
elements.themeToggle.addEventListener("change", () => {
    state.darkTheme = elements.themeToggle.checked;
    render();
    saveState();
});
elements.clearCompleted.addEventListener("click", () => {
    const completedCount = state.tasks.filter((task) => task.completed).length;
    if (completedCount === 0) {
        showMessage("There are no completed tasks to clear.");
        return;
    }
    state.tasks = state.tasks.filter((task) => !task.completed);
    render();
    saveState();
});

elements.todayLabel.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
});

render();
if (window.location.hash) {
    setPage(window.location.hash.slice(1));
} else {
    setPage("dashboard");
}
if (shouldSaveInitialState) {
    saveState();
}
