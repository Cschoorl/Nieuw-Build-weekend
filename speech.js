/**
 * Speech-to-Text Module voor VibeClub AI Judge
 * Powered by ElevenLabs API
 */

// Mic SVG icon
const MIC_ICON_SVG = '<svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 11v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>';

class SpeechRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentField = null;
        this.isRecording = false;
    }

    async startRecording(fieldId, button) {
        if (this.isRecording) {
            console.log('Already recording...');
            return;
        }

        this.currentField = document.getElementById(fieldId);
        this.audioChunks = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const wavBlob = await this.convertWebMToWav(audioBlob);
                
                // Update button state
                button.classList.remove('recording');
                button.innerHTML = MIC_ICON_SVG;
                button.title = 'Click to speak';
                
                // Transcribe
                await this.transcribe(wavBlob);
                
                // Clean up
                stream.getTracks().forEach(track => track.stop());
                this.isRecording = false;
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update button
            button.classList.add('recording');
            button.innerHTML = '⏹️';
            button.title = 'Click to stop';

        } catch (e) {
            console.error('Microphone error:', e);
            alert('Microphone access denied. Please allow microphone in your browser.');
            this.isRecording = false;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    toggleRecording(fieldId, button) {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording(fieldId, button);
        }
    }

    async transcribe(audioBlob) {
        if (!this.currentField) return;

        // Show loading state
        const originalPlaceholder = this.currentField.placeholder;
        this.currentField.placeholder = '🎤 Transcribing...';
        this.currentField.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            formData.append('model_id', 'scribe_v1');

            // Use proxy on production, direct API on localhost
            const isLocalhost = window.location.hostname === 'localhost';
            const apiUrl = isLocalhost 
                ? 'https://api.elevenlabs.io/v1/speech-to-text'
                : '/api/transcribe';
            
            const headers = isLocalhost 
                ? { 'xi-api-key': 'sk_4ae10a6d90856b512fdcc1154a2fc840707bcd2a5225ea93' }
                : {};

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();
            const transcript = data?.text || '';

            if (transcript) {
                if (this.currentField.value) {
                    this.currentField.value += ' ' + transcript;
                } else {
                    this.currentField.value = transcript;
                }
                
                this.currentField.dispatchEvent(new Event('input', { bubbles: true }));
            }

        } catch (error) {
            console.error('Transcription error:', error);
            alert('Transcription failed. Please try again.');
        } finally {
            this.currentField.placeholder = originalPlaceholder;
            this.currentField.disabled = false;
            this.currentField.focus();
        }
    }

    async convertWebMToWav(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const numSamples = audioBuffer.length;

        const buffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
        const view = new DataView(buffer);

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        let offset = 0;
        writeString(view, offset, 'RIFF'); offset += 4;
        view.setUint32(offset, 36 + numSamples * numChannels * 2, true); offset += 4;
        writeString(view, offset, 'WAVE'); offset += 4;
        writeString(view, offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2;
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4;
        view.setUint16(offset, numChannels * 2, true); offset += 2;
        view.setUint16(offset, 16, true); offset += 2;
        writeString(view, offset, 'data'); offset += 4;
        view.setUint32(offset, numSamples * numChannels * 2, true); offset += 4;

        for (let i = 0; i < numSamples; i++) {
            for (let c = 0; c < numChannels; c++) {
                const sample = audioBuffer.getChannelData(c)[i];
                const intSample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF, true);
                offset += 2;
            }
        }

        audioCtx.close();
        return new Blob([buffer], { type: 'audio/wav' });
    }
}

// Global instance
const speechRecorder = new SpeechRecorder();

// Initialize speech buttons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.speech-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const fieldId = btn.getAttribute('data-field');
            speechRecorder.toggleRecording(fieldId, btn);
        });
    });
});
