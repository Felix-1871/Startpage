export function renderLute() {
    const luteContainer = document.getElementById('lute-container');
    const middleLute = document.querySelector('.middle-lute');
    if (!luteContainer || !middleLute) return;

    const luteUrl = 'http://localhost:5001'; 

    luteContainer.innerHTML = `
        <div class="lute-header">
            <span>Lute</span>
        </div>
        <div class="lute-iframe-container">
            <iframe 
                src="${luteUrl}" 
                frameborder="0" 
                width="100%" 
                height="100%"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
            ></iframe>
        </div>
    `;

    if (!luteContainer.dataset.listenerAdded) {
        luteContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'IFRAME') return;
            middleLute.classList.toggle('expanded');
        });
        luteContainer.dataset.listenerAdded = 'true';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderLute();
});
