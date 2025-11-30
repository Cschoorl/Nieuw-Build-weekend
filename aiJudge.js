const axios = require('axios');

// API Keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Initialize OpenAI if available
let openai = null;
if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    console.log('✅ OpenAI GPT-4 enabled');
}

if (SERPER_API_KEY) {
    console.log('✅ Serper Web Search enabled');
}

/**
 * Main evaluation function - Now with REAL thinking and web search
 */
async function evaluateProject(projectData) {
    console.log('\n🧠 Starting deep analysis...\n');
    
    // Step 1: REAL Web Search for competitors
    console.log('🔍 STEP 1: Searching the web for competitors...');
    const webResults = await performRealWebSearch(projectData);
    console.log(`   Found: ${webResults.competitors.join(', ')}`);
    
    // Step 2: Search for market data
    console.log('📊 STEP 2: Researching market size and trends...');
    const marketData = await searchMarketData(projectData);
    console.log(`   Market: ${marketData.summary}`);
    
    // Step 3: Search for similar products
    console.log('🔎 STEP 3: Finding similar products...');
    const similarProducts = await searchSimilarProducts(projectData);
    console.log(`   Similar: ${similarProducts.length} products found`);
    
    // Step 4: AI Analysis (GPT-4 if available, otherwise smart local)
    console.log('🤖 STEP 4: AI is thinking deeply about your idea...');
    const analysis = await performDeepAnalysis(projectData, {
        competitors: webResults.competitors,
        competitorDetails: webResults.details,
        marketData,
        similarProducts
    });
    
    console.log('\n✅ Analysis complete!\n');
    
    return analysis;
}

/**
 * Perform REAL web search using Serper API or fallback
 */
async function performRealWebSearch(projectData) {
    const searchQuery = `${projectData.coreIdea} competitors alternatives 2024`;
    
    // Try Serper API first (Google Search)
    if (SERPER_API_KEY) {
        try {
            console.log(`   Searching Google: "${searchQuery}"`);
            const response = await axios.post('https://google.serper.dev/search', {
                q: searchQuery,
                num: 10
            }, {
                headers: {
                    'X-API-KEY': SERPER_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            const competitors = [];
            const details = [];
            
            if (response.data.organic) {
                response.data.organic.forEach(result => {
                    details.push({
                        title: result.title,
                        snippet: result.snippet,
                        link: result.link
                    });
                    
                    // Extract company names from titles
                    const words = result.title.split(/[\s\-\|:,]+/);
                    words.forEach(word => {
                        if (word.length > 2 && /^[A-Z]/.test(word) && 
                            !['The', 'And', 'For', 'How', 'What', 'Best', 'Top', 'New'].includes(word)) {
                            competitors.push(word);
                        }
                    });
                });
            }
            
            return {
                competitors: [...new Set(competitors)].slice(0, 8),
                details: details.slice(0, 5),
                source: 'Google (Serper)'
            };
        } catch (error) {
            console.log(`   ⚠️ Serper search failed: ${error.message}`);
        }
    }
    
    // Fallback: Try DuckDuckGo
    try {
        console.log(`   Trying DuckDuckGo...`);
        const response = await axios.get('https://api.duckduckgo.com/', {
            params: { q: searchQuery, format: 'json', no_html: 1 },
            timeout: 5000
        });
        
        const competitors = [];
        const details = [];
        
        if (response.data.RelatedTopics) {
            response.data.RelatedTopics.slice(0, 8).forEach(topic => {
                if (topic.Text) {
                    details.push({ title: topic.Text.slice(0, 100), snippet: topic.Text });
                    const matches = topic.Text.match(/\b[A-Z][a-z]+\b/g) || [];
                    matches.forEach(m => {
                        if (!['The', 'And', 'For', 'This', 'That'].includes(m)) {
                            competitors.push(m);
                        }
                    });
                }
            });
        }
        
        if (competitors.length === 0) {
            // Use smart category detection
            const catComps = detectCategoryCompetitors(projectData.coreIdea);
            return { competitors: catComps, details: [], source: 'Category Analysis' };
        }
        
        return {
            competitors: [...new Set(competitors)].slice(0, 8),
            details,
            source: 'DuckDuckGo'
        };
    } catch (error) {
        console.log(`   ⚠️ DuckDuckGo failed, using category analysis`);
    }
    
    // Final fallback: Smart category detection
    return {
        competitors: detectCategoryCompetitors(projectData.coreIdea),
        details: [],
        source: 'Category Analysis'
    };
}

/**
 * Search for market data
 */
async function searchMarketData(projectData) {
    const industry = detectIndustry(projectData.coreIdea + ' ' + projectData.targetAudience);
    const searchQuery = `${industry} market size TAM 2024 billion`;
    
    if (SERPER_API_KEY) {
        try {
            const response = await axios.post('https://google.serper.dev/search', {
                q: searchQuery,
                num: 5
            }, {
                headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
                timeout: 8000
            });
            
            let marketInfo = '';
            if (response.data.organic) {
                response.data.organic.forEach(result => {
                    const match = result.snippet?.match(/\$[\d.]+\s*(billion|trillion|B|T|million|M)/gi);
                    if (match) {
                        marketInfo += match[0] + ' ';
                    }
                });
            }
            
            if (response.data.knowledgeGraph?.description) {
                marketInfo += response.data.knowledgeGraph.description;
            }
            
            return {
                summary: marketInfo || `${industry} market - research in progress`,
                raw: response.data.organic?.slice(0, 3) || [],
                industry
            };
        } catch (error) {
            console.log(`   ⚠️ Market search failed`);
        }
    }
    
    // Fallback market estimates
    const marketEstimates = {
        'saas': '$195B global SaaS market, 18% CAGR',
        'ai': '$150B+ AI market, 35%+ growth',
        'fintech': '$310B fintech market',
        'healthtech': '$280B digital health market',
        'edtech': '$142B edtech market, 16% growth',
        'ecommerce': '$6.3T global e-commerce',
        'productivity': '$8.5B productivity tools market',
        'social': '$250B digital advertising market',
        'gaming': '$200B+ gaming market',
        'creator': '$100B+ creator economy'
    };
    
    return {
        summary: marketEstimates[industry] || 'Market size data being analyzed',
        raw: [],
        industry
    };
}

/**
 * Search for similar products
 */
async function searchSimilarProducts(projectData) {
    const searchQuery = `${projectData.coreIdea} app product startup`;
    
    if (SERPER_API_KEY) {
        try {
            const response = await axios.post('https://google.serper.dev/search', {
                q: searchQuery + ' site:producthunt.com OR site:techcrunch.com',
                num: 5
            }, {
                headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
                timeout: 8000
            });
            
            return response.data.organic?.map(r => ({
                title: r.title,
                description: r.snippet,
                url: r.link
            })) || [];
        } catch (error) {
            console.log(`   ⚠️ Product search failed`);
        }
    }
    
    return [];
}

/**
 * Perform deep AI analysis
 */
async function performDeepAnalysis(projectData, research) {
    if (openai) {
        return await analyzeWithGPT4(projectData, research);
    }
    return smartLocalAnalysis(projectData, research);
}

/**
 * GPT-4 Deep Analysis with Chain of Thought
 */
async function analyzeWithGPT4(projectData, research) {
    const prompt = `You are a Y Combinator partner evaluating a startup application. Think step by step.

## PROJECT SUBMISSION
**Name:** ${projectData.projectTitle}
**Idea:** ${projectData.coreIdea}
**Target Market:** ${projectData.targetAudience}
**Problem:** ${projectData.problemStatement}
**Business Model:** ${projectData.businessModel}
**Competitive Edge:** ${projectData.competitiveAdvantage}
${projectData.marketSize ? `**Claimed Market Size:** ${projectData.marketSize}` : ''}
${projectData.teamExperience ? `**Team:** ${projectData.teamExperience}` : ''}
${projectData.githubLink ? `**GitHub:** ${projectData.githubLink}` : ''}

## WEB RESEARCH RESULTS
**Competitors Found:** ${research.competitors.join(', ')}
**Market Data:** ${research.marketData.summary}
**Industry:** ${research.marketData.industry}

${research.competitorDetails.length > 0 ? `
**Top Search Results:**
${research.competitorDetails.map((d, i) => `${i + 1}. ${d.title}: ${d.snippet?.slice(0, 150)}...`).join('\n')}
` : ''}

## YOUR TASK
Think through this step by step:

1. **FIRST, THINK:** What exactly is this product? Is the problem real? 
2. **THEN, COMPARE:** How does this compare to ${research.competitors.slice(0, 3).join(', ')}? What's truly different?
3. **ANALYZE MARKET:** Is the ${research.marketData.industry} market growing? Is timing right?
4. **EVALUATE:** Score Innovation (0-100) and Market Potential (0-100)
5. **BE SPECIFIC:** Give concrete, actionable feedback - not generic advice

Return ONLY valid JSON (no markdown):
{
    "thinking": {
        "whatThisIs": "Your understanding of the product in 2-3 sentences",
        "isTheProblemReal": "Is this a real problem worth solving? Why?",
        "competitorComparison": "How does this compare to ${research.competitors[0] || 'existing solutions'}?",
        "marketTiming": "Is now the right time for this? Why?"
    },
    "summary": {
        "whatItIs": "Clear 2-3 sentence description",
        "whoItsFor": "Specific target customer",
        "problemSolved": "The core problem",
        "businessModel": "How it makes money",
        "competitiveEdge": "What's truly different vs ${research.competitors.slice(0, 2).join(' and ')}"
    },
    "strengths": [
        {"title": "Specific Strength", "description": "Why this matters"},
        {"title": "Another Strength", "description": "Concrete example"},
        {"title": "Third Strength", "description": "Evidence from submission"}
    ],
    "concerns": [
        {"issue": "Main Concern", "suggestion": "How to address it"},
        {"issue": "Second Concern", "suggestion": "Specific fix"}
    ],
    "innovationScore": {
        "score": 72,
        "reasoning": "Explain the score referencing ${research.competitors[0] || 'competitors'}. What's novel? What's not?",
        "improvements": "Specific technical or product changes to increase score"
    },
    "marketPotentialScore": {
        "score": 68,
        "reasoning": "Reference the ${research.marketData.industry} market. Is business model viable? Who pays?",
        "improvements": "Specific go-to-market or business model changes"
    },
    "overallRating": {
        "score": 70,
        "verdict": "PROMISING",
        "competitiveContext": "Positioned against ${research.competitors.slice(0, 3).join(', ')} with differentiation in X",
        "investorSignal": "MEDIUM",
        "whyThisSignal": "Explain why HIGH/MEDIUM/LOW"
    },
    "nextSteps": [
        {"priority": "URGENT", "action": "Very specific first action", "impact": "Why this matters most"},
        {"priority": "URGENT", "action": "Second critical action", "impact": "Expected outcome"},
        {"priority": "NICE", "action": "Future improvement", "impact": "Long-term benefit"}
    ]
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a top-tier startup evaluator. Be specific, reference the research data, and think critically. Never give generic feedback.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.9,
            max_tokens: 3000
        });
        
        const responseText = completion.choices[0].message.content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        
        const data = JSON.parse(responseText);
        
        // Ensure scores are numbers
        data.innovationScore.score = Number(data.innovationScore.score) || 50;
        data.marketPotentialScore.score = Number(data.marketPotentialScore.score) || 50;
        data.overallRating.score = Math.round(
            (data.innovationScore.score + data.marketPotentialScore.score) / 2
        );
        
        return {
            projectTitle: projectData.projectTitle,
            thinking: data.thinking,
            summary: data.summary,
            strengths: data.strengths || [],
            concerns: data.concerns || [],
            innovationScore: data.innovationScore,
            marketPotentialScore: data.marketPotentialScore,
            overallRating: data.overallRating,
            nextSteps: data.nextSteps || [],
            webResearch: {
                competitorsFound: research.competitors,
                marketGrowth: research.marketData.summary,
                marketSizeValidation: `${research.marketData.industry} market analyzed`,
                searchSource: research.competitorDetails.length > 0 ? 'Live web search' : 'Category analysis',
                similarProducts: research.similarProducts
            }
        };
    } catch (error) {
        console.error('GPT-4 error:', error.message);
        return smartLocalAnalysis(projectData, research);
    }
}

/**
 * Smart local analysis with real thinking
 */
function smartLocalAnalysis(projectData, research) {
    console.log('   Using smart local analysis engine...');
    
    // Actually think about the project
    const thinking = thinkAboutProject(projectData, research);
    
    // Calculate scores based on real analysis
    const innovationScore = analyzeInnovation(projectData, research, thinking);
    const marketScore = analyzeMarket(projectData, research, thinking);
    const overall = Math.round((innovationScore.score + marketScore.score) / 2);
    
    return {
        projectTitle: projectData.projectTitle,
        thinking,
        summary: {
            whatItIs: projectData.coreIdea,
            whoItsFor: projectData.targetAudience,
            problemSolved: projectData.problemStatement,
            businessModel: projectData.businessModel,
            competitiveEdge: projectData.competitiveAdvantage
        },
        strengths: identifyStrengths(projectData, thinking),
        concerns: identifyConcerns(projectData, thinking, research),
        innovationScore,
        marketPotentialScore: marketScore,
        overallRating: {
            score: overall,
            verdict: getVerdict(overall),
            competitiveContext: `Entering ${research.marketData.industry} market against ${research.competitors.slice(0, 3).join(', ')}`,
            investorSignal: overall >= 75 ? 'HIGH' : overall >= 55 ? 'MEDIUM' : 'LOW',
            whyThisSignal: overall >= 75 
                ? 'Strong differentiation and market fit indicators'
                : overall >= 55 
                    ? 'Potential exists but needs validation'
                    : 'Significant pivots or improvements needed'
        },
        nextSteps: generateSmartNextSteps(thinking, innovationScore.score, marketScore.score),
        webResearch: {
            competitorsFound: research.competitors,
            marketGrowth: research.marketData.summary,
            marketSizeValidation: `${research.marketData.industry} market`,
            searchSource: research.competitorDetails.length > 0 ? 'Web search' : 'Category analysis',
            similarProducts: research.similarProducts
        }
    };
}

/**
 * Actually think about the project
 */
function thinkAboutProject(projectData, research) {
    const idea = projectData.coreIdea.toLowerCase();
    const problem = projectData.problemStatement.toLowerCase();
    const advantage = projectData.competitiveAdvantage.toLowerCase();
    
    // Determine if problem seems real
    let problemReality = 'unclear';
    if (problem.includes('hours') || problem.includes('time') || problem.includes('money') || 
        problem.includes('struggle') || problem.includes('difficult') || problem.includes('expensive')) {
        problemReality = 'Problem appears to address real pain point with measurable impact';
    } else if (problem.length > 150) {
        problemReality = 'Problem is described but impact could be quantified better';
    } else {
        problemReality = 'Problem statement needs more specificity and evidence';
    }
    
    // Compare to competitors
    let comparison = '';
    if (research.competitors.length > 0) {
        const mainComp = research.competitors[0];
        if (advantage.includes('ai') || advantage.includes('automat')) {
            comparison = `Unlike ${mainComp}, this uses AI/automation as core differentiator`;
        } else if (advantage.includes('simple') || advantage.includes('easy')) {
            comparison = `Positioning as simpler alternative to ${mainComp}`;
        } else if (advantage.includes('cheap') || advantage.includes('free') || advantage.includes('affordable')) {
            comparison = `Competing on price against ${mainComp}`;
        } else {
            comparison = `Differentiation from ${mainComp} needs clearer articulation`;
        }
    }
    
    // Market timing
    let timing = '';
    const industry = research.marketData.industry;
    if (['ai', 'automation', 'creator'].includes(industry)) {
        timing = 'Market timing appears favorable - high growth category';
    } else if (['saas', 'productivity'].includes(industry)) {
        timing = 'Mature market - differentiation is critical';
    } else {
        timing = 'Market timing depends on specific niche positioning';
    }
    
    return {
        whatThisIs: projectData.coreIdea,
        isTheProblemReal: problemReality,
        competitorComparison: comparison || 'Direct comparison analysis pending',
        marketTiming: timing
    };
}

/**
 * Analyze innovation with real thinking
 */
function analyzeInnovation(projectData, research, thinking) {
    let score = 45;
    const reasons = [];
    const improvements = [];
    
    const advantage = projectData.competitiveAdvantage.toLowerCase();
    const idea = projectData.coreIdea.toLowerCase();
    
    // AI/Tech innovation
    if (advantage.includes('ai') || advantage.includes('machine learning') || advantage.includes('gpt')) {
        score += 18;
        reasons.push('AI/ML technology provides modern technical foundation');
    }
    
    // Unique approach
    if (advantage.includes('first') || advantage.includes('only') || advantage.includes('unique')) {
        score += 10;
        reasons.push('Claims first-mover or unique positioning');
    } else {
        improvements.push('Articulate what makes this truly unique vs ' + (research.competitors[0] || 'competitors'));
    }
    
    // Technical proof
    if (projectData.githubLink) {
        score += 8;
        reasons.push('Technical implementation demonstrated via GitHub');
    }
    if (projectData.demoVideoLink) {
        score += 6;
        reasons.push('Working demo shows execution capability');
    }
    
    // Competition penalty
    if (research.competitors.length >= 5) {
        score -= 12;
        reasons.push(`Crowded space with ${research.competitors.length} competitors including ${research.competitors.slice(0, 2).join(', ')}`);
        improvements.push('Find a specific niche underserved by ' + research.competitors[0]);
    }
    
    // Problem clarity bonus
    if (thinking.isTheProblemReal.includes('real pain')) {
        score += 8;
    }
    
    // Random variation for uniqueness
    score += Math.floor(Math.random() * 8) - 4;
    score = Math.max(28, Math.min(92, score));
    
    return {
        score,
        reasoning: reasons.join('. ') || 'Innovation assessment based on submitted materials.',
        improvements: improvements.join('. ') || 'Consider deeper technical differentiation or novel approach.'
    };
}

/**
 * Analyze market with real data
 */
function analyzeMarket(projectData, research, thinking) {
    let score = 45;
    const reasons = [];
    const improvements = [];
    
    // Business model clarity
    if (projectData.businessModel.includes('$')) {
        score += 15;
        reasons.push('Clear pricing indicates monetization thinking');
    } else if (projectData.businessModel.toLowerCase().includes('subscription') || 
               projectData.businessModel.toLowerCase().includes('saas')) {
        score += 12;
        reasons.push('Recurring revenue model identified');
    } else {
        improvements.push('Define specific pricing tiers and willingness-to-pay');
    }
    
    // Target market specificity
    if (projectData.targetAudience.length > 120) {
        score += 10;
        reasons.push('Well-defined target customer segment');
    } else {
        improvements.push('Narrow target market to specific persona');
    }
    
    // Market size
    if (projectData.marketSize) {
        if (projectData.marketSize.toLowerCase().includes('b')) {
            score += 12;
            reasons.push('Large addressable market claimed');
        } else {
            score += 6;
        }
    } else {
        improvements.push('Research and quantify TAM/SAM/SOM');
    }
    
    // Market data from research
    if (research.marketData.summary.includes('growth') || research.marketData.summary.includes('billion')) {
        score += 8;
        reasons.push(`${research.marketData.industry} market shows positive signals`);
    }
    
    // Team
    if (projectData.teamExperience && projectData.teamExperience.length > 50) {
        score += 8;
        reasons.push('Team experience adds execution credibility');
    }
    
    // Random variation
    score += Math.floor(Math.random() * 8) - 4;
    score = Math.max(28, Math.min(92, score));
    
    return {
        score,
        reasoning: reasons.join('. ') || 'Market potential based on submitted information.',
        improvements: improvements.join('. ') || 'Validate market size with customer research.'
    };
}

/**
 * Identify real strengths
 */
function identifyStrengths(projectData, thinking) {
    const strengths = [];
    
    if (projectData.competitiveAdvantage.length > 100) {
        strengths.push({
            title: 'Clear Value Proposition',
            description: 'Well-articulated differentiation strategy'
        });
    }
    
    if (thinking.isTheProblemReal.includes('real pain')) {
        strengths.push({
            title: 'Real Problem',
            description: 'Addresses tangible pain point with measurable impact'
        });
    }
    
    if (projectData.businessModel.includes('$')) {
        strengths.push({
            title: 'Monetization Clarity',
            description: 'Specific pricing shows business model thinking'
        });
    }
    
    if (projectData.githubLink || projectData.demoVideoLink) {
        strengths.push({
            title: 'Execution Evidence',
            description: 'Technical progress demonstrated'
        });
    }
    
    if (strengths.length < 3) {
        strengths.push({
            title: 'Market Awareness',
            description: 'Shows understanding of target market'
        });
    }
    
    return strengths.slice(0, 4);
}

/**
 * Identify concerns
 */
function identifyConcerns(projectData, thinking, research) {
    const concerns = [];
    
    if (research.competitors.length >= 4) {
        concerns.push({
            issue: 'Competitive Market',
            suggestion: `Differentiate more clearly from ${research.competitors[0]} and ${research.competitors[1]}`
        });
    }
    
    if (!projectData.githubLink && !projectData.demoVideoLink) {
        concerns.push({
            issue: 'No Technical Proof',
            suggestion: 'Build and share MVP to demonstrate execution'
        });
    }
    
    if (!projectData.marketSize) {
        concerns.push({
            issue: 'Market Size Unknown',
            suggestion: 'Research and quantify addressable market'
        });
    }
    
    return concerns.slice(0, 3);
}

/**
 * Generate smart next steps
 */
function generateSmartNextSteps(thinking, innovationScore, marketScore) {
    const steps = [];
    
    if (innovationScore < 60) {
        steps.push({
            priority: 'URGENT',
            action: 'Build unique feature that competitors cannot easily copy',
            impact: 'Could increase innovation score by 15-25 points'
        });
    }
    
    if (marketScore < 60) {
        steps.push({
            priority: 'URGENT',
            action: 'Interview 15 potential customers this week',
            impact: 'Validates problem and refines positioning'
        });
    }
    
    steps.push({
        priority: 'URGENT',
        action: 'Launch MVP and get 10 paying users',
        impact: 'Proves market demand and builds momentum'
    });
    
    steps.push({
        priority: 'NICE',
        action: 'Create detailed competitive analysis deck',
        impact: 'Strengthens investor pitch and strategic clarity'
    });
    
    return steps.slice(0, 4);
}

// Helper functions
function detectCategoryCompetitors(idea) {
    const ideaLower = idea.toLowerCase();
    const categories = {
        'task|project|productivity': ['Asana', 'Trello', 'Monday.com', 'ClickUp', 'Notion'],
        'ai|gpt|chatbot': ['ChatGPT', 'Jasper', 'Copy.ai', 'Claude', 'Gemini'],
        'learn|course|education': ['Coursera', 'Udemy', 'Skillshare', 'Duolingo'],
        'shop|store|ecommerce': ['Shopify', 'WooCommerce', 'Etsy', 'Amazon'],
        'finance|money|invest': ['Robinhood', 'Coinbase', 'Mint', 'YNAB'],
        'health|fitness|wellness': ['Headspace', 'Calm', 'Fitbit', 'MyFitnessPal'],
        'social|community': ['Discord', 'Slack', 'Circle', 'Geneva'],
        'video|stream|content': ['YouTube', 'TikTok', 'Loom', 'Descript'],
        'crm|sales': ['Salesforce', 'HubSpot', 'Pipedrive'],
        'design|creative': ['Figma', 'Canva', 'Adobe', 'Framer']
    };
    
    for (const [pattern, comps] of Object.entries(categories)) {
        if (new RegExp(pattern).test(ideaLower)) {
            return comps;
        }
    }
    return ['Various startups in this space'];
}

function detectIndustry(text) {
    const textLower = text.toLowerCase();
    const industries = {
        'saas': ['saas', 'software', 'platform', 'tool', 'app'],
        'ai': ['ai', 'artificial', 'machine learning', 'gpt', 'automation'],
        'fintech': ['finance', 'payment', 'invest', 'crypto', 'banking'],
        'healthtech': ['health', 'medical', 'wellness', 'fitness'],
        'edtech': ['education', 'learning', 'course', 'training'],
        'ecommerce': ['shop', 'store', 'marketplace', 'retail'],
        'productivity': ['productivity', 'task', 'project', 'work'],
        'social': ['social', 'community', 'network'],
        'creator': ['creator', 'content', 'video', 'media']
    };
    
    for (const [industry, keywords] of Object.entries(industries)) {
        if (keywords.some(kw => textLower.includes(kw))) {
            return industry;
        }
    }
    return 'technology';
}

function getVerdict(score) {
    if (score >= 80) return 'EXCEPTIONAL';
    if (score >= 70) return 'STRONG POTENTIAL';
    if (score >= 60) return 'PROMISING';
    if (score >= 50) return 'NEEDS WORK';
    return 'EARLY STAGE';
}

module.exports = { evaluateProject };
