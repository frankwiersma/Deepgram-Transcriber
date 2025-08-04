// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileSelected = document.getElementById('fileSelected');
const fileName = fileSelected.querySelector('.file-name');
const removeFileBtn = fileSelected.querySelector('.remove-file');
const transcribeBtn = document.getElementById('transcribeBtn');
const advancedOptions = document.getElementById('advancedOptions');
const resultsSection = document.getElementById('resultsSection');
const resultContent = document.getElementById('resultContent');
const errorMessage = document.getElementById('errorMessage');
const modeBtns = document.querySelectorAll('.mode-btn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// State
let selectedFile = null;
let currentMode = 'simple';
let lastTranscriptionResult = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Mode toggle
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // File upload
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Remove file
    removeFileBtn.addEventListener('click', removeFile);
    
    // Transcribe
    transcribeBtn.addEventListener('click', handleTranscribe);
    
    // Result actions
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadResult);
}

function switchMode(mode) {
    currentMode = mode;
    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    advancedOptions.style.display = mode === 'advanced' ? 'block' : 'none';
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        setSelectedFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        setSelectedFile(files[0]);
    }
}

function setSelectedFile(file) {
    // Validate file type
    const validTypes = ['audio/', 'video/'];
    if (!validTypes.some(type => file.type.startsWith(type))) {
        showError('Please select an audio or video file');
        return;
    }
    
    // Validate file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('File size exceeds 2GB limit');
        return;
    }
    
    selectedFile = file;
    fileName.textContent = file.name;
    dropZone.style.display = 'none';
    fileSelected.style.display = 'flex';
    transcribeBtn.disabled = false;
    hideError();
    hideResults();
}

function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileSelected.style.display = 'none';
    transcribeBtn.disabled = true;
    hideResults();
}

async function handleTranscribe() {
    if (!selectedFile) return;
    
    // Update UI
    setLoading(true);
    hideError();
    hideResults();
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('audio', selectedFile);
        
        // Add options based on mode
        if (currentMode === 'simple') {
            formData.append('model', 'nova-3');
            formData.append('smart_format', 'true');
            formData.append('language', 'auto');
            formData.append('utterances', 'true');
            formData.append('output_format', 'text');
        } else {
            formData.append('model', document.getElementById('model').value);
            formData.append('smart_format', document.getElementById('smartFormatting').checked);
            formData.append('language', document.getElementById('language').value);
            formData.append('utterances', document.getElementById('utterances').checked);
            formData.append('output_format', document.getElementById('outputFormat').value);
        }
        
        // Make request
        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Transcription failed');
        }
        
        // Display results
        displayResults(data.result);
        
    } catch (error) {
        console.error('Transcription error:', error);
        showError(error.message || 'An error occurred during transcription');
    } finally {
        setLoading(false);
    }
}

function displayResults(result) {
    lastTranscriptionResult = result;
    resultsSection.style.display = 'block';
    
    // Clear previous content
    resultContent.innerHTML = '';
    
    switch (result.type) {
        case 'text':
            resultContent.innerHTML = `<pre>${escapeHtml(result.content)}</pre>`;
            break;
            
        case 'utterances':
            const utterancesHtml = result.content.map(utterance => `
                <div class="utterance">
                    <div class="utterance-header">
                        <span class="speaker">Speaker ${utterance.speaker}</span>
                        <span class="timestamp">${formatTime(utterance.start)} - ${formatTime(utterance.end)}</span>
                    </div>
                    <div class="utterance-text">${escapeHtml(utterance.text)}</div>
                </div>
            `).join('');
            resultContent.innerHTML = utterancesHtml;
            break;
            
        case 'json':
            resultContent.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
            break;
            
        case 'caption':
            resultContent.innerHTML = `<pre>${escapeHtml(result.content)}</pre>`;
            break;
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function copyToClipboard() {
    try {
        let textToCopy = '';
        
        switch (lastTranscriptionResult.type) {
            case 'text':
                textToCopy = lastTranscriptionResult.content;
                break;
            case 'utterances':
                textToCopy = lastTranscriptionResult.content
                    .map(u => `[${formatTime(u.start)} - ${formatTime(u.end)}] Speaker ${u.speaker}: ${u.text}`)
                    .join('\n\n');
                break;
            case 'json':
                textToCopy = JSON.stringify(lastTranscriptionResult, null, 2);
                break;
            case 'caption':
                textToCopy = lastTranscriptionResult.content;
                break;
        }
        
        await navigator.clipboard.writeText(textToCopy);
        
        // Show feedback
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '';
        setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
        }, 2000);
        
    } catch (error) {
        console.error('Copy failed:', error);
        showError('Failed to copy to clipboard');
    }
}

function downloadResult() {
    let content = '';
    let filename = 'transcription';
    let mimeType = 'text/plain';
    
    switch (lastTranscriptionResult.type) {
        case 'text':
            content = lastTranscriptionResult.content;
            filename += '.txt';
            break;
            
        case 'utterances':
            content = lastTranscriptionResult.content
                .map(u => `[${formatTime(u.start)} - ${formatTime(u.end)}] Speaker ${u.speaker}: ${u.text}`)
                .join('\n\n');
            filename += '.txt';
            break;
            
        case 'json':
            content = JSON.stringify(lastTranscriptionResult, null, 2);
            filename += '.json';
            mimeType = 'application/json';
            break;
            
        case 'caption':
            content = lastTranscriptionResult.content;
            filename += `.${lastTranscriptionResult.format}`;
            mimeType = lastTranscriptionResult.format === 'webvtt' ? 'text/vtt' : 'text/plain';
            break;
    }
    
    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function setLoading(loading) {
    if (loading) {
        transcribeBtn.classList.add('loading');
        transcribeBtn.querySelector('.btn-text').textContent = 'Transcribing...';
        transcribeBtn.querySelector('.spinner').style.display = 'block';
        transcribeBtn.disabled = true;
    } else {
        transcribeBtn.classList.remove('loading');
        transcribeBtn.querySelector('.btn-text').textContent = 'Transcribe';
        transcribeBtn.querySelector('.spinner').style.display = 'none';
        transcribeBtn.disabled = !selectedFile;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function hideResults() {
    resultsSection.style.display = 'none';
    lastTranscriptionResult = null;
}