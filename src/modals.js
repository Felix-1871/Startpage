
const modalContainer = document.getElementById('modal-container');

export function openModal(title, fields, currentValues = {}, onSubmit) {
    modalContainer.innerHTML = ''; 
    modalContainer.style.display = 'flex'; 

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const h3 = document.createElement('h3');
    h3.textContent = title;
    modalContent.appendChild(h3);

    const form = document.createElement('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {};
        fields.forEach(field => {
            data[field.name] = inputElements[field.name].value;
        });
        onSubmit(data);
        modalContainer.style.display = 'none';
    }); 

    const inputElements = {}; 

    fields.forEach(field => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = field.label + ':';
        label.htmlFor = field.name;
        formGroup.appendChild(label);

        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
        } else if (field.type === 'select-icon') {
            const container = document.createElement('div');
            container.className = 'icon-selector-container';

            input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Local path (./img/...) or URL (https://...)';
            input.value = currentValues[field.name] || '';

            const iconPreview = document.createElement('img');
            iconPreview.className = 'icon-preview';
            iconPreview.style.width = '32px';
            iconPreview.style.height = '32px';
            iconPreview.style.marginLeft = '10px';
            iconPreview.style.verticalAlign = 'middle';
            iconPreview.style.display = input.value ? 'inline-block' : 'none';
            if (input.value) iconPreview.src = input.value;

            input.addEventListener('input', () => {
                if (input.value) {
                    iconPreview.src = input.value;
                    iconPreview.style.display = 'inline-block';
                } else {
                    iconPreview.style.display = 'none';
                }
            });

            container.appendChild(input);
            container.appendChild(iconPreview);
            formGroup.appendChild(container);
            inputElements[field.name] = input;
        } else {
            input = document.createElement('input');
            input.type = field.type;
        }

        if (field.type !== 'select-icon') {
            input.id = field.name;
            input.name = field.name;
            input.value = currentValues[field.name] || '';
            input.placeholder = field.placeholder || '';
            formGroup.appendChild(input);
            inputElements[field.name] = input;
        }

        form.appendChild(formGroup);
    });

    const modalButtons = document.createElement('div');
    modalButtons.className = 'modal-buttons';

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'save-button';
    saveButton.textContent = 'OK';
    modalButtons.appendChild(saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'cancel-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
        modalContainer.style.display = 'none';
    });
    modalButtons.appendChild(cancelButton);

    form.appendChild(modalButtons);
    modalContent.appendChild(form);
    modalContainer.appendChild(modalContent);

    // Focus first input
    const firstInput = modalContent.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
}

export function showAlert(message) {
    return new Promise((resolve) => {
        modalContainer.innerHTML = '';
        modalContainer.style.display = 'flex';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const msg = document.createElement('p');
        msg.textContent = message;
        msg.style.marginBottom = '20px';
        modalContent.appendChild(msg);

        const modalButtons = document.createElement('div');
        modalButtons.className = 'modal-buttons';

        const okButton = document.createElement('button');
        okButton.className = 'save-button';
        okButton.textContent = 'OK';
        okButton.addEventListener('click', () => {
            modalContainer.style.display = 'none';
            resolve();
        });
        modalButtons.appendChild(okButton);

        modalContent.appendChild(modalButtons);
        modalContainer.appendChild(modalContent);
        okButton.focus();
    });
}

export function showConfirm(message) {
    return new Promise((resolve) => {
        modalContainer.innerHTML = '';
        modalContainer.style.display = 'flex';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const msg = document.createElement('p');
        msg.textContent = message;
        msg.style.marginBottom = '20px';
        modalContent.appendChild(msg);

        const modalButtons = document.createElement('div');
        modalButtons.className = 'modal-buttons';

        const okButton = document.createElement('button');
        okButton.className = 'save-button';
        okButton.textContent = 'Confirm';
        okButton.addEventListener('click', () => {
            modalContainer.style.display = 'none';
            resolve(true);
        });

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            modalContainer.style.display = 'none';
            resolve(false);
        });

        modalButtons.appendChild(cancelButton);
        modalButtons.appendChild(okButton);

        modalContent.appendChild(modalButtons);
        modalContainer.appendChild(modalContent);
        okButton.focus();
    });
}

export function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        modalContainer.innerHTML = '';
        modalContainer.style.display = 'flex';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const msg = document.createElement('p');
        msg.textContent = message;
        msg.style.marginBottom = '10px';
        modalContent.appendChild(msg);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.className = 'modal-prompt-input';
        modalContent.appendChild(input);

        const modalButtons = document.createElement('div');
        modalButtons.className = 'modal-buttons';

        const okButton = document.createElement('button');
        okButton.className = 'save-button';
        okButton.textContent = 'OK';
        
        const submit = () => {
            modalContainer.style.display = 'none';
            resolve(input.value);
        };

        okButton.addEventListener('click', submit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submit();
        });

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            modalContainer.style.display = 'none';
            resolve(null);
        });

        modalButtons.appendChild(cancelButton);
        modalButtons.appendChild(okButton);

        modalContent.appendChild(modalButtons);
        modalContainer.appendChild(modalContent);
        input.focus();
        input.select();
    });
}
