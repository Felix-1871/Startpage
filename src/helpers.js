export function parseStorage(key, fallback, storageType = localStorage) {
    try {
        const raw = storageType.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        console.warn(`Corrupt localStorage key: ${key}`);
        return fallback;
    }
}

export async function invoke(action, version, params = {}) {
    const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
    try {
        const response = await fetch(ANKI_CONNECT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, version, params })
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.result;
    } catch (error) {
        console.error('AnkiConnect Error:', error);
        return null;
    }
}


export function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}


export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


export function showHide(type, isShow, style = "inline") {
    const elements = typeof type === 'string' ? document.querySelectorAll(type) : [type];
    elements.forEach(function (val) {
        if (val) val.style.display = isShow ? style : 'none';
    });
}


export function getStorage(key, defaultValue = null, storageType = localStorage) {
    const stored = storageType.getItem(key);
    return stored !== null ? stored : defaultValue;
}


export function setStorage(key, value, storageType = localStorage) {
    storageType.setItem(key, value);
}
