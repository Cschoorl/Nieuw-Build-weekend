const axios = require('axios');

// Research system prompt
const RESEARCH_SYSTEM_PROMPT = `You are a Research Agent for VibeClub's AI Judge System. Your job is to conduct web research to evaluate hackathon project submissions.

YOUR ROLE
You analyze web search results to understand:
- What competitors exist in this space
- What the actual market size is
- What industry trends are happening
- How novel/differentiated this idea really is

HOW TO SCORE BASED ON RESEARCH

For Innovation Score:
- No competitors found? +25 points
- Competitors exist but this is differentiated? +20 points
- Uses AI/ML differently than competitors? +18 points
- Some differentiation? +12 points
- Copycat idea? +5 points

For Market Potential Score:
- TAM > $1B from research? +25 points
- TAM $100M-$1B? +20 points
- TAM $10M-$100M? +15 points
- Clear monetization model (+20)
- No or few competitors (+20)
- Market growing 20%+ annually (+10)

IMPORTANT RULES
- Be specific: Use actual company names, products, market figures FROM THE SEARCH RESULTS
- Be honest: If market is crowded, say it
- Be thorough: Analyze ALL search results carefully
- Only use data you actually found - never make things up`;

// Main handler
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const projectData = req.body;

        // Validate required fields
        const requiredFields = ['projectTitle', 'coreIdea', 'targetAudience'];
        const missingFields = requiredFields.filter(field => !projectData[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields
            });
        }

        // Run evaluation
        const agent = new VibeClubAgent();
        const result = await agent.evaluate(projectData);
        
        return res.status(200).json(result);

    } catch (error) {
        console.error('Evaluation error:', error);
        return res.status(500).json({
            error: 'Evaluation failed',
            message: error.message
        });
    }
};

// VibeClub Agent Class
class VibeClubAgent {
    constructor() {
        this.serperKey = process.env.SERPER_API_KEY;
        this.openaiKey = process.env.OPENAI_API_KEY;
        this.allResults = [];
        this.searchLog = [];
    }

    async evaluate(projectData) {
        this.allResults = [];
        this.searchLog = [];
        
        const idea = projectData.coreIdea;
        const problem = projectData.problemSolved || idea;
        const uniqueness = projectData.uniqueApproach || '';
        const audience = projectData.targetAudience;
        const industry = this.detectIndustry(idea);
        const keywords = this.extractKeywords(idea);
        const problemKeywords = this.extractKeywords(problem);

        // FASE 1: COMPETITOR SEARCH
        await this.powerSearch([
            `${idea} competitors`,
            `${idea} alternatives 2024`,
            `best ${keywords} tools apps`,
            `${keywords} vs comparison`
        ], 'competitors');

        // FASE 2: EXACT MATCH SEARCH
        await this.powerSearch([
            `"${projectData.projectTitle}" startup`,
            `"${idea}"`,
            `${keywords} app startup product`
        ], 'exact_match');

        // FASE 3: MARKET SIZE SEARCH
        await this.powerSearch([
            `${industry} market size 2024`,
            `${industry} TAM SAM SOM`,
            `${audience} market opportunity billion`,
            `${industry} industry revenue 2024`
        ], 'market_size');

        // FASE 4: TREND SEARCH
        await this.powerSearch([
            `${industry} trends 2024 2025`,
            `${industry} growth forecast`,
            `${industry} future outlook emerging`
        ], 'trends');

        // FASE 5: STARTUP DATABASE SEARCH
        await this.powerSearch([
            `site:producthunt.com ${keywords}`,
            `site:github.com ${keywords}`,
            `${keywords} YC startup funding`
        ], 'startups');

        // FASE 6: PROBLEM VALIDATION
        await this.powerSearch([
            `${audience} problems challenges pain points`,
            `why ${keywords} important needed`,
            `${problemKeywords} solution market need`
        ], 'problem');
        
        // FASE 7: UNIQUENESS CHECK
        if (uniqueness) {
            await this.powerSearch([
                `${uniqueness} ${keywords}`,
                `${uniqueness} technology innovation`
            ], 'uniqueness');
        }

        // Compile results
        const compiledResults = this.compileResults();
        
        // GPT-4 Analysis
        const analysis = await this.deepAnalysis(projectData, compiledResults, industry);
        
        // Build final result
        return this.buildResult(projectData, analysis, compiledResults, industry);
    }

    async powerSearch(queries, category) {
        for (const query of queries) {
            await this.executeSearch(query, category);
        }
    }

    async executeSearch(query, category) {
        const results = await this.search(query);
        
        this.searchLog.push({
            query,
            category,
            resultsCount: results.length,
            timestamp: new Date().toISOString()
        });
        
        results.forEach(r => {
            r.category = category;
            r.query = query;
            this.allResults.push(r);
        });
        
        await this.sleep(100);
    }

    async search(query) {
        const results = [];

        // Try Serper (Google) first
        if (this.serperKey) {
            try {
                const response = await axios.post('https://google.serper.dev/search', 
                    { q: query, num: 10, gl: 'us', hl: 'en' },
                    {
                        headers: { 
                            'X-API-KEY': this.serperKey, 
                            'Content-Type': 'application/json' 
                        },
                        timeout: 10000
                    }
                );

                if (response.data.organic) {
                    response.data.organic.forEach(r => {
                        results.push({
                            title: r.title,
                            snippet: r.snippet || '',
                            url: r.link,
                            source: 'google'
                        });
                    });
                }
                
                if (response.data.knowledgeGraph) {
                    results.push({
                        title: response.data.knowledgeGraph.title || 'Knowledge Graph',
                        snippet: response.data.knowledgeGraph.description || '',
                        url: response.data.knowledgeGraph.website || '',
                        source: 'google_kg'
                    });
                }
                
                return results;
            } catch (e) {
                console.log('Google search error:', e.message);
            }
        }

        // Fallback: DuckDuckGo
        try {
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
                timeout: 8000
            });

            if (response.data.AbstractText) {
                results.push({
                    title: response.data.Heading || 'DuckDuckGo Abstract',
                    snippet: response.data.AbstractText,
                    url: response.data.AbstractURL || '',
                    source: 'duckduckgo_abstract'
                });
            }

            if (response.data.RelatedTopics) {
                response.data.RelatedTopics.slice(0, 8).forEach(topic => {
                    if (topic.Text) {
                        results.push({
                            title: topic.Text.slice(0, 80),
                            snippet: topic.Text,
                            url: topic.FirstURL || '',
                            source: 'duckduckgo'
                        });
                    }
                });
            }
        } catch (e) {
            console.log('DuckDuckGo error');
        }

        return results;
    }

    compileResults() {
        const compiled = {
            competitors: { results: [], companies: new Set(), count: 0 },
            exactMatch: { results: [], found: false },
            marketSize: { results: [], numbers: [], growth: [] },
            trends: { results: [], keywords: [] },
            startups: { results: [], productHunt: [], github: [] },
            problem: { results: [], validated: false },
            uniqueness: { results: [], validated: false }
        };

        this.allResults.forEach(r => {
            const text = `${r.title} ${r.snippet}`.toLowerCase();
            
            switch(r.category) {
                case 'competitors':
                    compiled.competitors.results.push(r);
                    const companies = this.extractCompanyNames(r.title);
                    companies.forEach(c => compiled.competitors.companies.add(c));
                    break;
                case 'exact_match':
                    compiled.exactMatch.results.push(r);
                    if (text.length > 50) compiled.exactMatch.found = true;
                    break;
                case 'market_size':
                    compiled.marketSize.results.push(r);
                    const numbers = text.match(/\$[\d,.]+\s*(billion|million|B|M|trillion|T)/gi);
                    if (numbers) compiled.marketSize.numbers.push(...numbers);
                    const growth = text.match(/(\d+(?:\.\d+)?)\s*%/g);
                    if (growth) compiled.marketSize.growth.push(...growth);
                    break;
                case 'trends':
                    compiled.trends.results.push(r);
                    ['growing', 'declining', 'emerging', 'booming', 'shrinking', 'expanding'].forEach(kw => {
                        if (text.includes(kw)) compiled.trends.keywords.push(kw);
                    });
                    break;
                case 'startups':
                    compiled.startups.results.push(r);
                    if (r.url?.includes('producthunt')) compiled.startups.productHunt.push(r);
                    if (r.url?.includes('github')) compiled.startups.github.push(r);
                    break;
                case 'problem':
                    compiled.problem.results.push(r);
                    if (r.snippet?.length > 100) compiled.problem.validated = true;
                    break;
                case 'uniqueness':
                    compiled.uniqueness.results.push(r);
                    if (compiled.uniqueness.results.length < 3) compiled.uniqueness.validated = true;
                    break;
            }
        });

        compiled.competitors.count = compiled.competitors.companies.size;
        return compiled;
    }

    extractCompanyNames(text) {
        const names = [];
        const words = text.split(/[\s\-\|:,\/]+/);
        const exclude = ['The', 'And', 'For', 'How', 'What', 'Best', 'Top', 'New', 'Your', 
                       'Why', 'Are', 'This', 'That', 'With', 'From', 'Can', 'Will', 'All',
                       'Get', 'Find', 'See', 'Our', 'Most', 'More', 'One', 'Way', 'Use'];
        
        words.forEach(word => {
            if (word.length > 2 && word.length < 20 && /^[A-Z]/.test(word)) {
                const clean = word.replace(/[^a-zA-Z0-9]/g, '');
                if (!exclude.includes(clean) && clean.length > 2) {
                    names.push(clean);
                }
            }
        });
        
        return names;
    }

    async deepAnalysis(projectData, compiled, industry) {
        if (!this.openaiKey || !this.openaiKey.startsWith('sk-')) {
            return this.localAnalysis(projectData, compiled, industry);
        }

        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: this.openaiKey });

        const context = this.buildSearchContext(compiled, industry);

        const prompt = `Analyze this startup project based on REAL search results:

=== PROJECT INFO ===
Name: ${projectData.projectTitle}
What it does: ${projectData.coreIdea}
Problem solved: ${projectData.problemSolved || 'Not specified'}
Target audience: ${projectData.targetAudience}
Unique approach: ${projectData.uniqueApproach || 'Not specified'}
Business Model: ${projectData.businessModel || 'TBD'}

=== SEARCH RESULTS (${this.allResults.length} total) ===
${context}

=== ANALYSIS TASK ===
Return JSON with:
{
    "researchSummary": {
        "totalResultsAnalyzed": ${this.allResults.length},
        "competitorsFound": ["List REAL company names from search results"],
        "competitorDetails": [{"name": "Company", "whatTheyDo": "From search", "threat": "high/medium/low"}],
        "marketSizeFound": "Exact numbers from results or 'not found'",
        "marketGrowthRate": "Percentage from results or 'not found'",
        "trendSignals": ["Found trend keywords"],
        "similarOnProductHunt": ${compiled.startups.productHunt.length},
        "similarOnGithub": ${compiled.startups.github.length},
        "problemValidated": ${compiled.problem.validated}
    },
    "thinking": {
        "whatThisIs": "Project description",
        "isTheProblemReal": "Yes/No + explanation based on search",
        "competitorComparison": "Comparison with found competitors",
        "marketTiming": "Is timing good? Based on trends"
    },
    "innovationScore": {"score": 65, "reasoning": "Detailed explanation", "improvements": "Suggestions"},
    "marketScore": {"score": 60, "reasoning": "Detailed explanation", "improvements": "Suggestions"},
    "strengths": [{"title": "Strength", "description": "Based on research"}],
    "concerns": [{"issue": "Concern", "suggestion": "Solution"}],
    "nextSteps": [{"priority": "URGENT", "action": "Action", "impact": "Impact"}],
    "verdict": "EXCEPTIONAL/STRONG POTENTIAL/PROMISING/NEEDS WORK/EARLY STAGE",
    "investorSignal": "HIGH/MEDIUM/LOW",
    "recommendation": "2-3 sentence conclusion"
}

IMPORTANT: Use ONLY information from search results. Be specific with names and numbers.`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            });

            const text = completion.choices[0].message.content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            
            return JSON.parse(text);
            
        } catch (error) {
            console.error('GPT-4 error:', error.message);
            return this.localAnalysis(projectData, compiled, industry);
        }
    }

    buildSearchContext(compiled, industry) {
        let context = '';
        
        context += `\n--- COMPETITORS (${compiled.competitors.results.length} results) ---\n`;
        context += `Found companies: ${Array.from(compiled.competitors.companies).slice(0, 15).join(', ')}\n`;
        compiled.competitors.results.slice(0, 8).forEach((r, i) => {
            context += `${i + 1}. ${r.title}\n   ${r.snippet?.slice(0, 200)}\n`;
        });
        
        context += `\n--- MARKET SIZE (${compiled.marketSize.results.length} results) ---\n`;
        context += `Found numbers: ${compiled.marketSize.numbers.slice(0, 5).join(', ') || 'none'}\n`;
        context += `Growth rates: ${compiled.marketSize.growth.slice(0, 5).join(', ') || 'none'}\n`;
        compiled.marketSize.results.slice(0, 5).forEach((r, i) => {
            context += `${i + 1}. ${r.title}\n   ${r.snippet?.slice(0, 200)}\n`;
        });
        
        context += `\n--- TRENDS (${compiled.trends.results.length} results) ---\n`;
        context += `Trend signals: ${compiled.trends.keywords.join(', ') || 'none'}\n`;
        
        context += `\n--- STARTUP DATABASES ---\n`;
        context += `ProductHunt matches: ${compiled.startups.productHunt.length}\n`;
        context += `GitHub matches: ${compiled.startups.github.length}\n`;
        
        context += `\n--- PROBLEM VALIDATION ---\n`;
        context += `Problem validated: ${compiled.problem.validated ? 'YES' : 'UNCERTAIN'}\n`;
        
        return context;
    }

    localAnalysis(projectData, compiled, industry) {
        const numCompetitors = compiled.competitors.companies.size;
        const hasMarketData = compiled.marketSize.numbers.length > 0;
        const isGrowing = compiled.trends.keywords.some(k => ['growing', 'booming', 'expanding', 'emerging'].includes(k));
        const hasSimilar = compiled.startups.productHunt.length + compiled.startups.github.length;
        
        let innovationScore = 50;
        let marketScore = 50;
        
        if (numCompetitors === 0) innovationScore += 25;
        else if (numCompetitors < 3) innovationScore += 20;
        else if (numCompetitors < 6) innovationScore += 12;
        else innovationScore += 5;
        
        if (hasSimilar < 3) innovationScore += 10;
        if (projectData.coreIdea?.toLowerCase().includes('ai')) innovationScore += 18;
        
        if (hasMarketData) {
            const hasLargeMarket = compiled.marketSize.numbers.some(n => 
                n.toLowerCase().includes('billion') || n.toLowerCase().includes('b')
            );
            marketScore += hasLargeMarket ? 25 : 15;
        }
        if (isGrowing) marketScore += 10;
        if (numCompetitors < 5) marketScore += 15;
        if (projectData.businessModel?.includes('$')) marketScore += 20;
        
        innovationScore = Math.max(25, Math.min(90, innovationScore));
        marketScore = Math.max(25, Math.min(90, marketScore));
        
        return {
            researchSummary: {
                totalResultsAnalyzed: this.allResults.length,
                competitorsFound: Array.from(compiled.competitors.companies).slice(0, 10),
                marketSizeFound: compiled.marketSize.numbers[0] || 'Not found',
                marketGrowthRate: compiled.marketSize.growth[0] || 'Not found',
                trendSignals: compiled.trends.keywords,
                similarOnProductHunt: compiled.startups.productHunt.length,
                similarOnGithub: compiled.startups.github.length,
                problemValidated: compiled.problem.validated
            },
            thinking: {
                whatThisIs: projectData.coreIdea,
                isTheProblemReal: compiled.problem.validated ? 'Yes, problem seems real' : 'Needs validation',
                competitorComparison: `${numCompetitors} competitors found`,
                marketTiming: isGrowing ? 'Favorable - market growing' : 'Neutral'
            },
            innovationScore: { score: innovationScore, reasoning: `${numCompetitors} competitors found`, improvements: 'Strengthen differentiation' },
            marketScore: { score: marketScore, reasoning: `Market ${isGrowing ? 'growing' : 'stable'}`, improvements: 'Validate with customers' },
            strengths: [{ title: 'Research done', description: `${this.allResults.length} data points analyzed` }],
            concerns: numCompetitors > 5 ? [{ issue: 'Crowded market', suggestion: 'Focus on niche' }] : [],
            nextSteps: [
                { priority: 'URGENT', action: 'Interview customers', impact: 'Validates demand' },
                { priority: 'URGENT', action: 'Build MVP', impact: 'Proves execution' }
            ],
            verdict: innovationScore + marketScore >= 140 ? 'STRONG POTENTIAL' : 'PROMISING',
            investorSignal: innovationScore + marketScore >= 140 ? 'MEDIUM' : 'LOW',
            recommendation: `Project based on ${this.allResults.length} search results. ${numCompetitors} competitors found.`
        };
    }

    buildResult(projectData, analysis, compiled, industry) {
        const innovationScore = analysis.innovationScore?.score || 50;
        const marketScore = analysis.marketScore?.score || 50;
        const overallScore = Math.round((innovationScore + marketScore) / 2);
        
        return {
            projectTitle: projectData.projectTitle,
            researchSummary: analysis.researchSummary || null,
            thinking: analysis.thinking,
            summary: {
                whatItIs: projectData.coreIdea,
                whoItsFor: projectData.targetAudience,
                problemSolved: projectData.coreIdea,
                businessModel: projectData.businessModel || 'TBD',
                competitiveEdge: analysis.thinking?.competitorComparison || 'See research'
            },
            strengths: analysis.strengths || [],
            concerns: analysis.concerns || [],
            innovationScore: {
                score: innovationScore,
                reasoning: analysis.innovationScore?.reasoning || 'See breakdown',
                improvements: analysis.innovationScore?.improvements || 'See recommendations'
            },
            marketPotentialScore: {
                score: marketScore,
                reasoning: analysis.marketScore?.reasoning || 'See breakdown',
                improvements: analysis.marketScore?.improvements || 'See recommendations'
            },
            overallRating: {
                score: overallScore,
                verdict: analysis.verdict || this.getVerdict(overallScore),
                competitiveContext: `${compiled.competitors.companies.size} competitors found in ${industry}`,
                investorSignal: analysis.investorSignal || 'MEDIUM'
            },
            nextSteps: analysis.nextSteps || [],
            webResearch: {
                competitorsFound: analysis.researchSummary?.competitorsFound || Array.from(compiled.competitors.companies).slice(0, 10),
                marketGrowth: `${compiled.marketSize.numbers[0] || 'See results'} - ${compiled.trends.keywords.join(', ') || 'neutral'}`,
                existingProductsFound: compiled.exactMatch.results.length,
                totalSearches: this.searchLog.length,
                searchSource: this.serperKey ? 'Google (Serper)' : 'DuckDuckGo'
            }
        };
    }

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    extractKeywords(text) {
        const stop = ['the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'with', 'that', 'this', 'is', 'are'];
        return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
            .filter(w => w.length > 3 && !stop.includes(w)).slice(0, 4).join(' ');
    }
    
    detectIndustry(text) {
        const t = text.toLowerCase();
        if (/ai|gpt|machine|automat|intelligent/.test(t)) return 'AI/ML';
        if (/financ|pay|bank|crypto|invest|money/.test(t)) return 'Fintech';
        if (/health|fit|medic|wellness|doctor/.test(t)) return 'Healthtech';
        if (/learn|education|course|train|student/.test(t)) return 'Edtech';
        if (/shop|store|ecommerce|retail|sell/.test(t)) return 'E-commerce';
        if (/task|project|productiv|work|team/.test(t)) return 'Productivity';
        return 'SaaS/Technology';
    }
    
    getVerdict(score) {
        if (score >= 80) return 'EXCEPTIONAL';
        if (score >= 70) return 'STRONG POTENTIAL';
        if (score >= 60) return 'PROMISING';
        if (score >= 50) return 'NEEDS WORK';
        return 'EARLY STAGE';
    }
}



