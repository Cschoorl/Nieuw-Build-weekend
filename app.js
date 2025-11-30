// Character counters
const charCounters = {
    coreIdea: { max: 150 },
    targetAudience: { max: 200 },
    problemStatement: { max: 300 },
    competitiveAdvantage: { max: 300 }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeCharCounters();
    setupFormSubmission();
});

// Setup character counters
function initializeCharCounters() {
    Object.keys(charCounters).forEach(key => {
        const input = document.getElementById(key);
        const counter = document.getElementById(`${key}Counter`);
        
        if (input && counter) {
            input.addEventListener('input', () => {
                const length = input.value.length;
                counter.textContent = length;
                counter.style.color = length >= charCounters[key].max * 0.9 ? '#E63B2E' : '#666';
            });
        }
    });
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
            alert(error.message || 'Something went wrong');
        }
    });
}

// Collect form data
function collectFormData() {
    return {
        projectTitle: document.getElementById('projectTitle').value.trim(),
        coreIdea: document.getElementById('coreIdea').value.trim(),
        targetAudience: document.getElementById('targetAudience').value.trim(),
        problemStatement: document.getElementById('problemStatement').value.trim(),
        businessModel: document.getElementById('businessModel').value.trim(),
        competitiveAdvantage: document.getElementById('competitiveAdvantage').value.trim(),
        marketSize: document.getElementById('marketSize').value.trim() || '',
        githubLink: document.getElementById('githubLink').value.trim() || '',
        demoVideoLink: document.getElementById('demoVideoLink').value.trim() || '',
        teamExperience: document.getElementById('teamExperience').value.trim() || ''
    };
}

// Validate form data
function validateFormData(data) {
    const required = ['projectTitle', 'coreIdea', 'targetAudience', 'problemStatement', 'businessModel', 'competitiveAdvantage'];
    for (const field of required) {
        if (!data[field]) {
            alert(`Please fill in: ${field}`);
            return false;
        }
    }
    return true;
}

// Submit to AI backend
async function submitToAI(formData) {
    const response = await fetch('http://localhost:3000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Evaluation failed');
    }
    
    return await response.json();
}

// Show loading state
function showLoading() {
    document.getElementById('submissionForm').classList.add('hidden');
    document.getElementById('loadingState').classList.remove('hidden');
    animateLoadingSteps();
}

// Hide loading state
function hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
}

// Animate loading steps
function animateLoadingSteps() {
    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
    let currentStep = 0;
    
    const interval = setInterval(() => {
        if (currentStep > 0) {
            const prevStep = document.getElementById(steps[currentStep - 1]);
            prevStep.classList.remove('active');
            prevStep.classList.add('completed');
            prevStep.querySelector('.step-icon').textContent = '●';
        }
        
        if (currentStep < steps.length) {
            const step = document.getElementById(steps[currentStep]);
            step.classList.add('active');
            step.querySelector('.step-icon').textContent = '◐';
            currentStep++;
        } else {
            clearInterval(interval);
        }
    }, 800);
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
            <div class="result-hero-label">AI JUDGE VERDICT</div>
            <h1 class="result-hero-title">${escapeHtml(data.projectTitle)}</h1>
            <div class="result-hero-verdict ${overallLevel}">${data.overallRating.verdict}</div>
        </div>

        <!-- AI Thinking Section (if available) -->
        ${data.thinking ? `
        <div class="thinking-section">
            <div class="section-header">
                <span class="section-icon">🧠</span>
                <h2>AI THINKING PROCESS</h2>
            </div>
            <div class="thinking-grid">
                <div class="thinking-card">
                    <div class="thinking-label">UNDERSTANDING</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.whatThisIs)}</div>
                </div>
                <div class="thinking-card">
                    <div class="thinking-label">IS THE PROBLEM REAL?</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.isTheProblemReal)}</div>
                </div>
                <div class="thinking-card">
                    <div class="thinking-label">VS COMPETITORS</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.competitorComparison)}</div>
                </div>
                <div class="thinking-card">
                    <div class="thinking-label">MARKET TIMING</div>
                    <div class="thinking-text">${escapeHtml(data.thinking.marketTiming)}</div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Score Grid -->
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
                <div class="score-sublabel">out of 100</div>
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
                <div class="score-sublabel">out of 100</div>
            </div>

            <div class="score-card-new featured">
                <div class="score-header">
                    <span class="score-icon">⭐</span>
                    <span class="score-label">OVERALL</span>
                </div>
                <div class="score-number ${overallLevel}">${data.overallRating.score}</div>
                <div class="score-bar">
                    <div class="score-bar-fill ${overallLevel}" data-width="${data.overallRating.score}"></div>
                </div>
                <div class="score-sublabel">out of 100</div>
            </div>
        </div>

        <!-- Investor Signal -->
        <div class="investor-box ${data.overallRating.investorSignal.toLowerCase()}">
            <div class="investor-label">INVESTOR INTEREST</div>
            <div class="investor-value">${data.overallRating.investorSignal}</div>
            <div class="investor-context">${escapeHtml(data.overallRating.competitiveContext)}</div>
            ${data.overallRating.whyThisSignal ? `
            <div class="investor-why">${escapeHtml(data.overallRating.whyThisSignal)}</div>
            ` : ''}
        </div>

        <!-- Two Column Layout -->
        <div class="results-grid">
            <!-- Left Column -->
            <div class="results-column">
                <!-- Score Breakdown -->
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">📊</span>
                        <h2>SCORE BREAKDOWN</h2>
                    </div>
                    
                    <div class="analysis-card">
                        <div class="analysis-title"><span>🔬</span> Innovation Analysis</div>
                        <div class="analysis-score">${data.innovationScore.score}/100</div>
                        <div class="analysis-text">${escapeHtml(data.innovationScore.reasoning)}</div>
                        <div class="analysis-improve">
                            <strong>→ TO IMPROVE:</strong>
                            ${escapeHtml(data.innovationScore.improvements)}
                        </div>
                    </div>

                    <div class="analysis-card">
                        <div class="analysis-title"><span>💰</span> Market Analysis</div>
                        <div class="analysis-score">${data.marketPotentialScore.score}/100</div>
                        <div class="analysis-text">${escapeHtml(data.marketPotentialScore.reasoning)}</div>
                        <div class="analysis-improve">
                            <strong>→ TO IMPROVE:</strong>
                            ${escapeHtml(data.marketPotentialScore.improvements)}
                        </div>
                    </div>
                </div>

                <!-- Strengths -->
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">💪</span>
                        <h2>STRENGTHS</h2>
                    </div>
                    <div class="strengths-list">
                        ${data.strengths.map(s => `
                            <div class="strength-row">
                                <span class="strength-check">✓</span>
                                <div class="strength-content">
                                    <div class="strength-title">${escapeHtml(s.title)}</div>
                                    <div class="strength-desc">${escapeHtml(s.description)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Concerns (if any) -->
                ${data.concerns && data.concerns.length > 0 ? `
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">⚠️</span>
                        <h2>CONCERNS</h2>
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

            <!-- Right Column -->
            <div class="results-column">
                <!-- Project Summary -->
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">📝</span>
                        <h2>PROJECT SUMMARY</h2>
                    </div>
                    <div class="summary-list">
                        <div class="summary-row">
                            <div class="summary-label">WHAT IT IS</div>
                            <div class="summary-value">${escapeHtml(data.summary.whatItIs)}</div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-label">TARGET MARKET</div>
                            <div class="summary-value">${escapeHtml(data.summary.whoItsFor)}</div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-label">PROBLEM</div>
                            <div class="summary-value">${escapeHtml(data.summary.problemSolved)}</div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-label">REVENUE MODEL</div>
                            <div class="summary-value">${escapeHtml(data.summary.businessModel)}</div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-label">COMPETITIVE EDGE</div>
                            <div class="summary-value">${escapeHtml(data.summary.competitiveEdge)}</div>
                        </div>
                    </div>
                </div>

                <!-- Market Intel -->
                ${data.webResearch ? `
                <div class="result-section">
                    <div class="section-header">
                        <span class="section-icon">🔍</span>
                        <h2>MARKET RESEARCH</h2>
                    </div>
                    
                    ${data.webResearch.searchSource ? `
                    <div class="research-source">
                        Source: ${escapeHtml(data.webResearch.searchSource)}
                    </div>
                    ` : ''}
                    
                    ${data.webResearch.competitorsFound && data.webResearch.competitorsFound.length > 0 ? `
                    <div class="intel-row">
                        <div class="intel-label">COMPETITORS FOUND</div>
                        <div class="competitors-tags">
                            ${data.webResearch.competitorsFound.map(c => `
                                <span class="competitor-chip">${escapeHtml(c)}</span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.webResearch.marketGrowth ? `
                    <div class="intel-row">
                        <div class="intel-label">MARKET DATA</div>
                        <div class="intel-value">${escapeHtml(data.webResearch.marketGrowth)}</div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Next Steps -->
        <div class="result-section full-width">
            <div class="section-header">
                <span class="section-icon">🚀</span>
                <h2>NEXT STEPS</h2>
            </div>
            <div class="steps-grid">
                ${data.nextSteps.map((step, index) => `
                    <div class="step-card ${step.priority.toLowerCase()}">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-content">
                            <div class="step-priority ${step.priority.toLowerCase()}">${step.priority}</div>
                            <div class="step-action">${escapeHtml(step.action)}</div>
                            <div class="step-impact">${escapeHtml(step.impact)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Submit Again -->
        <div class="result-actions">
            <button class="btn-submit" onclick="location.reload()">
                SUBMIT ANOTHER PROJECT
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
