import { parseStorage } from '../../src/helpers.js';
import { escapeHtml } from '../../src/dom-utils.js';
import { showAlert, showConfirm, showPrompt } from '../modals/modals.js';

export function init() {
    const todoListDisplay = document.getElementById('todo-list-display');
    const GLASSBOX_LEFT = document.querySelector('.glass-box-left');

    let todos = parseStorage('todos', []);

    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function renderTodoInput() {
        let todoInputContainer = document.getElementById('todo-input-container');
        if (!todoInputContainer) {
            todoInputContainer = document.createElement('div');
            todoInputContainer.id = 'todo-input-container';
            todoListDisplay.appendChild(todoInputContainer);
        }
        todoInputContainer.innerHTML = `
            <input type="text" id="todo-input" placeholder="${todos.length === 0 ? '✏️ Write your todo here' : 'Add new todo'}">
        `;

        const todoInput = document.getElementById('todo-input');
        if (todoInput) {
            const addTodo = () => {
                if (todoInput.value.trim() !== '') {
                    todos.push({ text: todoInput.value.trim(), done: false });
                    saveTodos();
                    renderTodos();
                }
            };
            todoInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') addTodo();
            });
            todoInput.addEventListener('blur', addTodo);
        }
    }

    function renderTodos() {
        if (!todoListDisplay) return;
        todoListDisplay.innerHTML = '';

        todos.forEach((todo, index) => {
            const todoItem = document.createElement('div');
            todoItem.classList.add('todo-item');
            todoItem.innerHTML = `
                <input type="checkbox" class="todo-item-checkbox" id="todo-${index}" ${todo.done ? 'checked' : ''}>
                <label for="todo-${index}" class="todo-item-text ${todo.done ? 'done' : ''}">${escapeHtml(todo.text)}</label>
                <span class="todo-actions">
                    <span class="todo-edit-icon" data-index="${index}">✏️</span>
                    <span class="todo-remove-icon" data-index="${index}">🗑️</span>
                </span>
            `;
            todoListDisplay.appendChild(todoItem);

            todoItem.querySelector('.todo-item-checkbox').addEventListener('change', (event) => {
                todos[index].done = event.target.checked;
                saveTodos();
                const label = todoItem.querySelector('.todo-item-text');
                label.classList.toggle('done', event.target.checked);
            });

            todoItem.querySelector('.todo-edit-icon').addEventListener('click', async (event) => {
                const todoIndex = parseInt(event.target.dataset.index);
                const newText = await showPrompt('Edit your todo:', todos[todoIndex].text);
                if (newText !== null && newText.trim() !== '') {
                    todos[todoIndex].text = newText.trim();
                    saveTodos();
                    renderTodos();
                }
            });

            todoItem.querySelector('.todo-remove-icon').addEventListener('click', async (event) => {
                const todoIndex = parseInt(event.target.dataset.index);
                if (await showConfirm('Are you sure you want to remove this todo?')) {
                    todos.splice(todoIndex, 1);
                    saveTodos();
                    renderTodos();
                }
            });
        });

        renderTodoInput();

        if (GLASSBOX_LEFT) {
            if (todos.length === 0) {
                GLASSBOX_LEFT.style.justifyContent = 'center';
                GLASSBOX_LEFT.style.alignItems = 'center';
            } else {
                GLASSBOX_LEFT.style.justifyContent = 'flex-start';
                GLASSBOX_LEFT.style.alignItems = 'flex-start';
            }
        }
    }

    renderTodos();
}
