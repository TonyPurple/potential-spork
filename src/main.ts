import "./styles.css";

interface Todo {
  id: string;
  name: string;
  complete: boolean;
}

interface TodoStorage {
  saveTodos(todos: Todo[]): void;
  loadTodos(): Todo[];
}

interface TodoRenderer {
  render(todo: Todo): HTMLElement;
  remove(id: string): void;
}

const form = document.querySelector<HTMLFormElement>("#new-todo-form")!;
const todoInput = document.querySelector<HTMLInputElement>("#todo-input")!;
const list = document.querySelector<HTMLUListElement>("#list")!;

function validateTodo(todo: unknown): todo is Todo {
  return (
    typeof todo === "object" &&
    todo !== null &&
    "id" in todo &&
    "name" in todo &&
    "complete" in todo &&
    typeof (todo as Todo).name === "string" &&
    typeof (todo as Todo).complete === "boolean"
  );
}

function sanitizeTodoName(name: string): string {
  return name.trim().slice(0, 100);
}

const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

const storage: TodoStorage = {
  saveTodos(todos: Todo[]): void {
    try {
      localStorage.setItem("todos", JSON.stringify(todos));
    } catch (e) {
      console.error("Failed to save todos:", e);
    }
  },

  loadTodos(): Todo[] {
    try {
      const value = localStorage.getItem("todos");
      if (value === null) return [];
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every(validateTodo)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.error("Failed to load todos:", e);
      return [];
    }
  },
};

const renderer: TodoRenderer = {
  render(todo: Todo): HTMLElement {
    const listItem = document.createElement("li");
    listItem.classList.add("list-item");
    listItem.dataset.todoId = todo.id;

    const label = document.createElement("label");
    label.classList.add("list-item-label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.complete;
    checkbox.classList.add("label-input");
    checkbox.setAttribute("aria-labelledby", `label-${todo.id}`);
    checkbox.addEventListener("change", () =>
      handleTodoToggle(todo.id, checkbox.checked)
    );

    const textElement = document.createElement("span");
    textElement.classList.add("label-text");
    textElement.innerText = todo.name;
    label.id = `label-${todo.id}`;

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-btn");
    deleteButton.innerText = "Delete";
    deleteButton.setAttribute("aria-label", `Delete todo: ${todo.name}`);
    deleteButton.addEventListener("click", () => handleTodoDelete(todo.id));

    label.append(checkbox, textElement);
    listItem.append(label, deleteButton);
    list.append(listItem);

    return listItem;
  },

  remove(id: string): void {
    const listItem = list.querySelector(`[data-todo-id="${id}"]`);
    listItem?.remove();
  },
};

function handleTodoToggle(todoId: string, checked: boolean): void {
  const todo = todos.find((t) => t.id === todoId);
  if (todo) {
    todo.complete = checked;
    saveTodosDebounced();
  }
}

function handleTodoDelete(todoId: string): void {
  const todo = todos.find((t) => t.id === todoId);
  if (!todo) return;

  renderer.remove(todoId);
  todos = todos.filter((t) => t.id !== todoId);
  saveTodosDebounced();

  const undoMessage = document.createElement("div");
  undoMessage.textContent = `Deleted "${todo.name}". Undo?`;
  const undoButton = document.createElement("button");
  undoButton.textContent = "Undo";
  undoButton.addEventListener("click", () => {
    todos.push(todo);
    renderer.render(todo);
    saveTodosDebounced();
    undoMessage.remove();
  });
  undoMessage.appendChild(undoButton);
  document.body.appendChild(undoMessage);

  setTimeout(() => undoMessage.remove(), 5000);
}

const saveTodosDebounced = debounce(() => storage.saveTodos(todos), 300);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const todoName = sanitizeTodoName(todoInput.value);
  if (todoName === "") return;

  const newTodo: Todo = {
    id: crypto.randomUUID(),
    name: todoName,
    complete: false,
  };

  todos.push(newTodo);
  renderer.render(newTodo);
  saveTodosDebounced();
  todoInput.value = "";
});

let todos: Todo[] = [];
const loadingMessage = document.createElement("li");
loadingMessage.textContent = "Loading...";
list.append(loadingMessage);

Promise.resolve()
  .then(() => {
    todos = storage.loadTodos();
    list.innerHTML = "";
    todos.forEach((todo) => renderer.render(todo));
  })
  .catch((error) => {
    console.error("Failed to initialize todos:", error);
    list.innerHTML = "Failed to load todos. Please refresh the page.";
  });

const darkModeToggle = document.createElement("button");
darkModeToggle.textContent = "Toggle Dark Mode";
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});
document.body.appendChild(darkModeToggle);
