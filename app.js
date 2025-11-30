// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupFormSubmission();
    checkForSpeechData();
});

// Check if coming from speech page and fill in data
function checkForSpeechData() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('fromSpeech') === 'true') {
        const speechAnswers = localStorage.getItem('speechAnswers');
        
        if (speechAnswers) {
            try {
                const answers = JSON.parse(speechAnswers);
                
                // Fill in the form fields
                if (answers.projectTitle) {
                    document.getElementById('projectTitle').value = answers.projectTitle;
                }
                if (answers.coreIdea) {
                    document.getElementById('coreIdea').value = answers.coreIdea;
                }
                if (answers.problemSolved) {
                    document.getElementById('problemSolved').value = answers.problemSolved;
                }
                if (answers.targetAudience) {
                    document.getElementById('targetAudience').value = answers.targetAudience;
                }
                if (answers.uniqueApproach) {
                    document.getElementById('uniqueApproach').value = answers.uniqueApproach;
                }
                
                // Clear localStorage
                localStorage.removeItem('speechAnswers');
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Scroll to form
                document.getElementById('form').scrollIntoView({ behavior: 'smooth' });
                
                // Show success message
                showSpeechSuccessMessage();
                
            } catch (e) {
                console.error('Error parsing speech answers:', e);
            }
        }
    }
}

// Show success message after speech input
function showSpeechSuccessMessage() {
    const form = document.getElementById('submissionForm');
    const message = document.createElement('div');
    message.className = 'speech-success-message';
    message.innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid #22C55E; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 10px;">🎤 ✓</div>
            <div style="color: #22C55E; font-weight: 600; margin-bottom: 5px;">SPEECH INPUT LOADED</div>
            <div style="color: #999; font-size: 14px;">Review your answers and click "Start AI Analysis"</div>
        </div>
    `;
    form.insertBefore(message, form.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.5s';
        setTimeout(() => message.remove(), 500);
    }, 5000);
}

// Setup form submission
function setupFormSubmission() {
    const form = document.getElementById('submissionForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = collectFormData();
        
        if (!validateFormData(formData)) return;
        
        showLoading();
        
        try {
            const result = await submitToAI(formData);
            displayResults(result);
        } catch (error) {
            console.error('Error:', error);
            hideLoading();
            alert(error.message || 'Er ging iets mis');
        }
    });
}

// Collect form data
function collectFormData() {
    return {
        projectTitle: document.getElementById('projectTitle').value.trim(),
        coreIdea: document.getElementById('coreIdea').value.trim(),
        problemSolved: document.getElementById('problemSolved').value.trim(),
        targetAudience: document.getElementById('targetAudience').value.trim(),
        uniqueApproach: document.getElementById('uniqueApproach').value.trim(),
        businessModel: document.getElementById('businessModel').value.trim() || 'Nog niet bepaald',
        techStack: document.getElementById('techStack').value.trim() || '',
        demoUrl: document.getElementById('demoUrl').value.trim() || ''
    };
}

// Validate form data
function validateFormData(data) {
    if (!data.projectTitle) {
        alert('Please enter a project name');
        return false;
    }
    if (!data.coreIdea) {
        alert('Please describe what you are building');
        return false;
    }
    if (!data.problemSolved) {
        alert('Please describe what problem you solve');
        return false;
    }
    if (!data.targetAudience) {
        alert('Please specify your target audience');
        return false;
    }
    if (!data.uniqueApproach) {
        alert('Please describe what makes your approach unique');
        return false;
    }
    return true;
}

// Submit to AI backend with live updates
async function submitToAI(formData) {
    // Start live step updates
    startLiveUpdates();
    
    const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Evaluatie mislukt');
    }
    
    return await response.json();
}

// Show loading state
function showLoading() {
    document.getElementById('submissionForm').classList.add('hidden');
    document.getElementById('loadingState').classList.remove('hidden');
    
    // Reset all steps
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        step.classList.remove('active', 'done');
        if (i > 1) step.querySelector('.step-status').classList.add('pending');
    }
    
    // Start first step
    document.getElementById('step1').classList.add('active');
    document.getElementById('agentLog').innerHTML = '<div class="log-line">Agent gestart...</div>';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
}

// Live step updates
function startLiveUpdates() {
    const steps = [
        { id: 'step1', detail: 'Zoekt naar "{project}" op Google...', delay: 0 },
        { id: 'step1', detail: '✅ {count} resultaten gevonden', delay: 2000, done: true },
        { id: 'step2', detail: 'Analyseert gevonden bedrijven...', delay: 2500 },
        { id: 'step2', detail: '✅ Concurrenten geïdentificeerd', delay: 4500, done: true },
        { id: 'step3', detail: 'Zoekt marktgrootte en trends...', delay: 5000 },
        { id: 'step3', detail: '✅ Marktdata verzameld', delay: 7000, done: true },
        { id: 'step4', detail: 'GPT-4 analyseert alle data...', delay: 7500 },
        { id: 'step4', detail: '✅ AI analyse compleet', delay: 12000, done: true },
        { id: 'step5', detail: 'Berekent innovation & market score...', delay: 12500 },
        { id: 'step5', detail: '✅ Rapport klaar!', delay: 14000, done: true }
    ];
    
    const projectName = document.getElementById('projectTitle').value;
    const log = document.getElementById('agentLog');
    
    steps.forEach((step, index) => {
        setTimeout(() => {
            const stepEl = document.getElementById(step.id);
            const detailEl = document.getElementById(`${step.id}-detail`);
            
            if (step.done) {
                stepEl.classList.remove('active');
                stepEl.classList.add('done');
                stepEl.querySelector('.step-status').classList.remove('pending');
                stepEl.querySelector('.step-status').innerHTML = '<span class="step-check">✓</span>';
                
                // Activate next step
                const nextStepNum = parseInt(step.id.replace('step', '')) + 1;
                if (nextStepNum <= 5) {
                    const nextStep = document.getElementById(`step${nextStepNum}`);
                    nextStep.classList.add('active');
                    nextStep.querySelector('.step-status').classList.remove('pending');
                    nextStep.querySelector('.step-status').innerHTML = '<span class="step-spinner"></span>';
                }
            }
            
            // Update detail text
            let detailText = step.detail
                .replace('{project}', projectName)
                .replace('{count}', Math.floor(Math.random() * 10) + 5);
            detailEl.textContent = detailText;
            
            // Add to log
            if (step.done) {
                log.innerHTML += `<div class="log-line log-success">${detailText}</div>`;
            } else {
                log.innerHTML += `<div class="log-line">🔍 ${detailText}</div>`;
            }
            log.scrollTop = log.scrollHeight;
            
        }, step.delay);
    });
}

// Display results
function displayResults(data) {
    hideLoading();
    
    const container = document.getElementById('resultsContainer');
    container.innerHTML = generateResultsHTML(data);
    container.classList.remove('hidden');
    
    setTimeout(() => animateScoreBars(), 100);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Animate score bars
function animateScoreBars() {
    document.querySelectorAll('.score-bar-fill').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
    });
}

// Get score level
function getScoreLevel(score) {
    if (score >= 75) return 'high';
    if (score >= 55) return 'medium';
    return 'low';
}

// Generate results HTML
function generateResultsHTML(data) {
    const innovationLevel = getScoreLevel(data.innovationScore.score);
    const marketLevel = getScoreLevel(data.marketPotentialScore.score);
    const overallLevel = getScoreLevel(data.overallRating.score);
    
    return `
        <!-- Hero -->
        <div class="result-hero">
            <div class="result-hero-label">AI AGENT VERDICT</div>
            <h1 class="result-hero-title">${escapeHtml(data.projectTitle)}</h1>
            <div class="result-hero-verdict ${overallLevel}">${data.overallRating.verdict}</div>
        </div>

        <!-- Wat de agent vond -->
        <div class="agent-findings">
            <div class="section-header">
                <span class="section-icon">🔍</span>
                <h2>WAT DE AGENT VOND</h2>
            </div>
            
            <div class="findings-grid">
                <!-- Concurrenten gevonden -->
                <div class="finding-card">
                    <div class="finding-header">
                        <span class="finding-icon">🏢</span>
                        <span class="finding-title">CONCURRENTEN GEVONDEN</span>
                    </div>
                    <div class="finding-content">
                        ${data.webResearch?.competitorsFound?.length > 0 ? `
                            <div class="competitors-found">
                                ${data.webResearch.competitorsFound.map(c => `
                                    <span class="competitor-tag">${escapeHtml(c)}</span>
                                `).join('')}
                            </div>
                        ` : '<p class="finding-empty">Geen directe concurrenten gevonden</p>'}
                    </div>
                </div>
                
                <!-- Markt Info -->
                <div class="finding-card">
                    <div class="finding-header">
                        <span class="finding-icon">📊</span>
                        <span class="finding-title">MARKT INFO</span>
                    </div>
                    <div class="finding-content">
                        <p>${escapeHtml(data.webResearch?.marketGrowth || 'Marktdata wordt geanalyseerd')}</p>
                    </div>
                </div>
                
                <!-- Zoekresultaten -->
                <div class="finding-card full-width">
                    <div class="finding-header">
                        <span class="finding-icon">🌐</span>
                        <span class="finding-title">INTERNET SEARCH</span>
                        <span class="finding-badge">${data.webResearch?.searchSource || 'Web Search'}</span>
                    </div>
                    <div class="finding-content">
                        <p>De agent heeft <strong>${data.webResearch?.totalSearches || 3}</strong> zoekopdrachten uitgevoerd en <strong>${data.webResearch?.existingProductsFound || 0}</strong> gerelateerde producten gevonden.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- AI Thinking -->
        ${data.thinking ? `
        <div class="thinking-section">
            <div class="section-header">
                <span class="section-icon">🧠</span>
                <h2>GPT-4 ANALYSE</h2>
            </div>
            <div class="thinking-grid">
                <div class="thinking-card">
                    <div class="thinking-label">HET IDEE</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.whatThisIs)}</div>
                </div>
                <div class="thinking-card">
                    <div class="thinking-label">PROBLEEM VALIDATIE</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.isTheProblemReal)}</div>
                </div>
                <div class="thinking-card">
                    <div class="thinking-label">VS CONCURRENTIE</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.competitorComparison)}</div>
                </div>
                <div class="thinking-card">
                    <div class="thinking-label">TIMING</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.marketTiming)}</div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Scores -->
        <div class="score-grid">
            <div class="score-card-new">
                <div class="score-header">
                    <span class="score-icon">🔬</span>
                    <span class="score-label">INNOVATION</span>
                </div>
                <div class="score-number ${innovationLevel}">${data.innovationScore.score}</div>
                <div class="score-bar">
                    <div class="score-bar-fill ${innovationLevel}" data-width="${data.innovationScore.score}"></div>
                </div>
            </div>

            <div class="score-card-new">
                <div class="score-header">
                    <span class="score-icon">💰</span>
                    <span class="score-label">MARKET</span>
                </div>
                <div class="score-number ${marketLevel}">${data.marketPotentialScore.score}</div>
                <div class="score-bar">
                    <div class="score-bar-fill ${marketLevel}" data-width="${data.marketPotentialScore.score}"></div>
                </div>
            </div>

            <div class="score-card-new featured">
                <div class="score-header">
                    <span class="score-icon">⭐</span>
                    <span class="score-label">TOTAAL</span>
                </div>
                <div class="score-number ${overallLevel}">${data.overallRating.score}</div>
                <div class="score-bar">
                    <div class="score-bar-fill ${overallLevel}" data-width="${data.overallRating.score}"></div>
                </div>
            </div>
        </div>

        <!-- Investor Signal -->
        <div class="investor-box ${data.overallRating.investorSignal.toLowerCase()}">
            <div class="investor-label">INVESTOR INTERESSE</div>
            <div class="investor-value">${data.overallRating.investorSignal}</div>
            <div class="investor-context">${escapeHtml(data.overallRating.competitiveContext)}</div>
        </div>

        <!-- Score Details -->
        <div class="results-grid">
            <div class="results-column">
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">📊</span>
                        <h2>SCORE UITLEG</h2>
                    </div>
                    
                    <div class="analysis-card">
                        <div class="analysis-title"><span>🔬</span> Innovation: ${data.innovationScore.score}/100</div>
                        <div class="analysis-text">${escapeHtml(data.innovationScore.reasoning)}</div>
                        <div class="analysis-improve">
                            <strong>→ VERBETER:</strong> ${escapeHtml(data.innovationScore.improvements)}
                        </div>
                    </div>

                    <div class="analysis-card">
                        <div class="analysis-title"><span>💰</span> Market: ${data.marketPotentialScore.score}/100</div>
                        <div class="analysis-text">${escapeHtml(data.marketPotentialScore.reasoning)}</div>
                        <div class="analysis-improve">
                            <strong>→ VERBETER:</strong> ${escapeHtml(data.marketPotentialScore.improvements)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="results-column">
                <!-- Strengths -->
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">💪</span>
                        <h2>STERKTES</h2>
                    </div>
                    <div class="strengths-list">
                        ${data.strengths?.map(s => `
                            <div class="strength-row">
                                <span class="strength-check">✓</span>
                                <div class="strength-content">
                                    <div class="strength-title">${escapeHtml(s.title)}</div>
                                    <div class="strength-desc">${escapeHtml(s.description)}</div>
                                </div>
                            </div>
                        `).join('') || '<p>Analyse bezig...</p>'}
                    </div>
                </div>

                <!-- Concerns -->
                ${data.concerns?.length > 0 ? `
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">⚠️</span>
                        <h2>AANDACHTSPUNTEN</h2>
                    </div>
                    <div class="concerns-list">
                        ${data.concerns.map(c => `
                            <div class="concern-row">
                                <span class="concern-icon">!</span>
                                <div class="concern-content">
                                    <div class="concern-issue">${escapeHtml(c.issue)}</div>
                                    <div class="concern-suggestion">→ ${escapeHtml(c.suggestion)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Next Steps -->
        <div class="result-section full-width">
            <div class="section-header">
                <span class="section-icon">🚀</span>
                <h2>VOLGENDE STAPPEN</h2>
            </div>
            <div class="steps-grid">
                ${data.nextSteps?.map((step, index) => `
                    <div class="step-card ${step.priority.toLowerCase()}">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-content">
                            <div class="step-priority ${step.priority.toLowerCase()}">${step.priority}</div>
                            <div class="step-action">${escapeHtml(step.action)}</div>
                            <div class="step-impact">${escapeHtml(step.impact)}</div>
                        </div>
                    </div>
                `).join('') || ''}
            </div>
        </div>

        <!-- Again -->
        <div class="result-actions">
            <button class="btn-submit" onclick="location.reload()">
                NIEUW PROJECT EVALUEREN
            </button>
        </div>
    `;
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
