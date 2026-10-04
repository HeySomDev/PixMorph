// PixMorph - Main Application Logic
// Production PWA with AI enhancement

const WORKER_URL = '/api/enhance';
const HEALTH_CHECK_URL = '/api/health';
const FIXED_PROMPT = "Keep the person recognizable and preserve the original facial structure. Turn this into a premium DSLR-style portrait, natural skin retouching, remove acne and minor skin imperfections, cinematic depth of field, sharp eyes, detailed hair and beard, vibrant but natural colors, warm golden-hour lighting, professional photography look, blurred background.";

let currentState = 'idle';
let originalImageData = null;
let enhancedImageData = null;

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.querySelector('.upload-section');
const processingSection = document.getElementById('processingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const originalImage = document.getElementById('originalImage');
const enhancedImage = document.getElementById('enhancedImage');
const downloadBtn = document.getElementById('downloadBtn');
const retryBtn = document.getElementById('retryBtn');
const errorRetryBtn = document.getElementById('errorRetryBtn');
const errorMessage = document.getElementById('errorMessage');
const progressFill = document.getElementById('progressFill');
const processingText = document.querySelector('.processing-text');

function init() {
    registerServiceWorker();
    attachEventListeners();
    checkHealth();
    requestInstallPrompt();
}

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    }
}

async function checkHealth() {
    try {
        const response = await fetch(HEALTH_CHECK_URL);
        if (response.ok) {
            const data = await response.json();
            console.log('PixMorph Status:', data);
        }
    } catch (error) {
        console.warn('Health check failed:', error);
    }
}

function attachEventListeners() {
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    downloadBtn.addEventListener('click', handleDownload);
    retryBtn.addEventListener('click', handleRetry);
    errorRetryBtn.addEventListener('click', handleRetry);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            processFile(file);
        } else {
            showError('Please upload an image file');
        }
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

async function processFile(file) {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('File size must be less than 10MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        originalImageData = e.target.result;
        originalImage.src = originalImageData;
        showProcessing();
        await enhanceImage(file);
    };
    reader.onerror = () => showError('Failed to read file');
    reader.readAsDataURL(file);
}

async function enhanceImage(file) {
    try {
        let progress = 0;

        const progressInterval = setInterval(() => {
            if (progress < 85) {
                progress += Math.random() * 15;
                progressFill.style.width = Math.min(progress, 85) + '%';
            }
        }, 500);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('prompt', FIXED_PROMPT);

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            body: formData,
        });

        clearInterval(progressInterval);
        progressFill.style.width = '95%';

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.enhanced_image) {
            enhancedImageData = data.enhanced_image;

            const img = new Image();
            img.onload = () => {
                enhancedImage.src = enhancedImageData;
                progressFill.style.width = '100%';
                setTimeout(() => showResults(), 300);
            };
            img.onerror = () => showError('Failed to load enhanced image');
            img.src = enhancedImageData;
        } else {
            throw new Error(data.error || 'Failed to enhance image');
        }
    } catch (error) {
        console.error('Enhancement error:', error);
        showError(`Enhancement failed: ${error.message}`);
    }
}

function showProcessing() {
    currentState = 'processing';
    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    progressFill.style.width = '10%';
    processingText.textContent = 'Enhancing your portrait with AI...';
}

function showResults() {
    currentState = 'results';
    uploadSection.style.display = 'none';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'block';
    errorSection.style.display = 'none';
}

function showError(message) {
    currentState = 'error';
    uploadSection.style.display = 'none';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
}

function showUpload() {
    currentState = 'idle';
    uploadSection.style.display = 'block';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    fileInput.value = '';
    progressFill.style.width = '0%';
}

function handleDownload() {
    if (enhancedImageData) {
        const link = document.createElement('a');
        link.href = enhancedImageData;
        link.download = `PixMorph-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function handleRetry() {
    showUpload();
    originalImageData = null;
    enhancedImageData = null;
}

let deferredPrompt;

function requestInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA install available');
    });

    window.addEventListener('appinstalled', () => {
        console.log('PixMorph installed');
        deferredPrompt = null;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
