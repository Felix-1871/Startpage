export function renderLute() {
    const luteContainer = document.getElementById('lute-container');
    const middleLute = document.querySelector('.middle-lute');
    if (!luteContainer || !middleLute) return;

    // Default Lute URL
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
                allow="clipboard-read; clipboard-write"
            ></iframe>
        </div>
    `;

    // Toggle expansion on click
    luteContainer.addEventListener('click', (e) => {
        // Don't toggle if clicking inside the iframe (though clicks usually don't bubble out of iframes anyway)
        if (e.target.tagName === 'IFRAME') return;
        
        middleLute.classList.toggle('expanded');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderLute();
});
