// PixMorph - Main Application Logic

const WORKER_URL = '/api/enhance'; // Will be available after deployment
const FIXED_PROMPT = "Keep the person recognizable and preserve the original facial structure. Turn this into a premium DSLR-style portrait, natural skin retouching, remove acne and minor skin imperfections, cinematic depth of field, sharp eyes, detailed hair and beard, vibrant but natural colors, warm golden-hour lighting, professional photography look, blurred background.";

// State Management
let currentState = 'idle'; // idle, uploading, processing, results, error
let originalImageData = null;
let enhancedImageData = null;

// DOM Elements
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

// Initialize
function init() {
    registerServiceWorker();
    attachEventListeners();
}

// Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}

// Event Listeners
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

// Drag and Drop Handlers
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

// File Processing
async function processFile(file) {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('File size must be less than 10MB');
        return;
    }

    // Read and display original image
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

// Send to Worker for Enhancement
async function enhanceImage(file) {
    try {
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 20;
                progressFill.style.width = Math.min(progress, 90) + '%';
            }
        }, 500);

        // Create FormData
        const formData = new FormData();
        formData.append('image', file);
        formData.append('prompt', FIXED_PROMPT);

        // Send to Worker
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            body: formData,
        });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.enhanced_image) {
            enhancedImageData = data.enhanced_image;
            enhancedImage.src = enhancedImageData;
            showResults();
        } else {
            throw new Error(data.error || 'Failed to enhance image');
        }
    } catch (error) {
        console.error('Enhancement error:', error);
        showError(`Enhancement failed: ${error.message}`);
    }
}

// UI State Management
function showProcessing() {
    currentState = 'processing';
    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    progressFill.style.width = '10%';
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
}

// Download Handler
function handleDownload() {
    if (enhancedImageData) {
        const link = document.createElement('a');
        link.href = enhancedImageData;
        link.download = `pixmorph-enhanced-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Retry Handler
function handleRetry() {
    showUpload();
    originalImageData = null;
    enhancedImageData = null;
}

// Request PWA Install
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install prompt available');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA installed');
});

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
