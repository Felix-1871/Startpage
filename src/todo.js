document.addEventListener('DOMContentLoaded', () => {
    const todoListDisplay = document.getElementById('todo-list-display');
    const GLASSBOX_LEFT = document.querySelector('.glass-box-left'); 

    let todos = JSON.parse(localStorage.getItem('todos')) || [];

    
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    
    function renderTodos() {
        todoListDisplay.innerHTML = ''; 
        
        
        todos.forEach((todo, index) => {
            const todoItem = document.createElement('div');
            todoItem.classList.add('todo-item');
            todoItem.innerHTML = `
                <input type="checkbox" class="todo-item-checkbox" id="todo-${index}" ${todo.done ? 'checked' : ''}>
                <label for="todo-${index}" class="todo-item-text ${todo.done ? 'done' : ''}">${todo.text}</label>
                <span class="todo-actions">
                    <span class="todo-edit-icon" data-index="${index}">✏️</span>
                    <span class="todo-remove-icon" data-index="${index}">🗑️</span>
                </span>
            `;
            todoListDisplay.appendChild(todoItem);

            
            todoItem.querySelector('.todo-item-checkbox').addEventListener('change', (event) => {
                todos[index].done = event.target.checked;
                saveTodos();
                renderTodos(); 
            });

            
            todoItem.querySelector('.todo-edit-icon').addEventListener('click', (event) => {
                const todoIndex = parseInt(event.target.dataset.index);
                const newText = prompt('Edit your todo:', todos[todoIndex].text);
                if (newText !== null && newText.trim() !== '') {
                    todos[todoIndex].text = newText.trim();
                    saveTodos();
                    renderTodos();
                }
            });

            
            todoItem.querySelector('.todo-remove-icon').addEventListener('click', (event) => {
                const todoIndex = parseInt(event.target.dataset.index);
                if (confirm('Are you sure you want to remove this todo?')) {
                    todos.splice(todoIndex, 1);
                    saveTodos();
                    renderTodos();
                }
            });
        });
        
        
        const todoInputContainer = document.createElement('div');
        todoInputContainer.id = 'todo-input-container';
        todoInputContainer.innerHTML = `
            <input type="text" id="todo-input" placeholder="${todos.length === 0 ? '✏️ Write your todo here' : 'Add new todo'}">
        `;
        todoListDisplay.appendChild(todoInputContainer);

        
        if (todos.length === 0) {
            GLASSBOX_LEFT.style.justifyContent = 'center';
            GLASSBOX_LEFT.style.alignItems = 'center';
        } else {
            GLASSBOX_LEFT.style.justifyContent = 'flex-start';
            GLASSBOX_LEFT.style.alignItems = 'flex-start';
        }

        
        const todoInput = document.getElementById('todo-input');
        if (todoInput) {
            todoInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && todoInput.value.trim() !== '') {
                    todos.push({ text: todoInput.value.trim(), done: false });
                    saveTodos();
                    renderTodos();
                }
            });
            todoInput.addEventListener('blur', () => {
                if (todoInput.value.trim() !== '') {
                    todos.push({ text: todoInput.value.trim(), done: false });
                    saveTodos();
                    renderTodos();
                }
            });
        }
    }

    
    renderTodos();
});
