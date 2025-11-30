const axios = require('axios');

/**
 * VibeClub POWER SEARCH Agent
 * Zoekt DIEP en BREED - meerdere queries, meerdere bronnen
 */

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

class VibeClubAgent {
    constructor() {
        this.serperKey = process.env.SERPER_API_KEY;
        this.openaiKey = process.env.OPENAI_API_KEY;
        this.allResults = [];
        this.searchLog = [];
        
        if (this.openaiKey && this.openaiKey.startsWith('sk-')) {
            const OpenAI = require('openai');
            this.openai = new OpenAI({ apiKey: this.openaiKey });
        }
    }

    /**
     * POWER SEARCH - Voert 10+ zoekqueries uit voor maximale dekking
     */
    async evaluate(projectData) {
        console.log('\n🔥 POWER SEARCH AGENT GESTART\n');
        console.log('═'.repeat(60));
        
        this.allResults = [];
        this.searchLog = [];
        
        const idea = projectData.coreIdea;
        const problem = projectData.problemSolved || idea;
        const uniqueness = projectData.uniqueApproach || '';
        const audience = projectData.targetAudience;
        const industry = this.detectIndustry(idea);
        const keywords = this.extractKeywords(idea);
        const problemKeywords = this.extractKeywords(problem);
        
        console.log(`\n📋 Project: ${projectData.projectTitle}`);
        console.log(`💡 Idee: ${idea.slice(0, 80)}...`);
        console.log(`❓ Probleem: ${problem.slice(0, 80)}...`);
        console.log(`🏷️ Industrie: ${industry}`);
        console.log(`🔑 Keywords: ${keywords}\n`);

        // ========================================
        // FASE 1: COMPETITOR SEARCH (4 queries)
        // ========================================
        console.log('━'.repeat(60));
        console.log('🔍 FASE 1: COMPETITOR RESEARCH');
        console.log('━'.repeat(60));
        
        await this.powerSearch([
            `${idea} competitors`,
            `${idea} alternatives 2024`,
            `best ${keywords} tools apps`,
            `${keywords} vs comparison`
        ], 'competitors');

        // ========================================
        // FASE 2: EXACT MATCH SEARCH (3 queries)
        // ========================================
        console.log('\n━'.repeat(60));
        console.log('🔍 FASE 2: EXACT PRODUCT SEARCH');
        console.log('━'.repeat(60));
        
        await this.powerSearch([
            `"${projectData.projectTitle}" startup`,
            `"${idea}"`,
            `${keywords} app startup product`
        ], 'exact_match');

        // ========================================
        // FASE 3: MARKET SIZE SEARCH (4 queries)
        // ========================================
        console.log('\n━'.repeat(60));
        console.log('🔍 FASE 3: MARKET SIZE RESEARCH');
        console.log('━'.repeat(60));
        
        await this.powerSearch([
            `${industry} market size 2024`,
            `${industry} TAM SAM SOM`,
            `${audience} market opportunity billion`,
            `${industry} industry revenue 2024`
        ], 'market_size');

        // ========================================
        // FASE 4: TREND SEARCH (3 queries)
        // ========================================
        console.log('\n━'.repeat(60));
        console.log('🔍 FASE 4: TREND RESEARCH');
        console.log('━'.repeat(60));
        
        await this.powerSearch([
            `${industry} trends 2024 2025`,
            `${industry} growth forecast`,
            `${industry} future outlook emerging`
        ], 'trends');

        // ========================================
        // FASE 5: PRODUCTHUNT & GITHUB SEARCH (3 queries)
        // ========================================
        console.log('\n━'.repeat(60));
        console.log('🔍 FASE 5: STARTUP DATABASE SEARCH');
        console.log('━'.repeat(60));
        
        await this.powerSearch([
            `site:producthunt.com ${keywords}`,
            `site:github.com ${keywords}`,
            `${keywords} YC startup funding`
        ], 'startups');

        // ========================================
        // FASE 6: PROBLEM VALIDATION (3 queries)
        // ========================================
        console.log('\n━'.repeat(60));
        console.log('🔍 FASE 6: PROBLEM VALIDATION');
        console.log('━'.repeat(60));
        
        await this.powerSearch([
            `${audience} problems challenges pain points`,
            `why ${keywords} important needed`,
            `${problemKeywords} solution market need`
        ], 'problem');
        
        // ========================================
        // FASE 7: UNIQUENESS CHECK (2 queries)
        // ========================================
        if (uniqueness) {
            console.log('\n━'.repeat(60));
            console.log('🔍 FASE 7: UNIQUENESS VALIDATION');
            console.log('━'.repeat(60));
            
            await this.powerSearch([
                `${uniqueness} ${keywords}`,
                `${uniqueness} technology innovation`
            ], 'uniqueness');
        }

        // ========================================
        // ANALYSE
        // ========================================
        console.log('\n━'.repeat(60));
        console.log('🧠 FASE 7: GPT-4 DEEP ANALYSIS');
        console.log('━'.repeat(60));
        
        // Compile all results
        const compiledResults = this.compileResults();
        
        console.log(`\n📊 SEARCH STATISTIEKEN:`);
        console.log(`   Totaal queries: ${this.searchLog.length}`);
        console.log(`   Totaal resultaten: ${this.allResults.length}`);
        console.log(`   Unieke bronnen: ${new Set(this.allResults.map(r => r.url)).size}`);
        
        // GPT-4 Analysis
        const analysis = await this.deepAnalysis(projectData, compiledResults, industry);
        
        // Build final result
        return this.buildResult(projectData, analysis, compiledResults, industry);
    }

    /**
     * Power Search - voert meerdere queries parallel uit
     */
    async powerSearch(queries, category) {
        for (const query of queries) {
            await this.executeSearch(query, category);
        }
    }

    /**
     * Execute single search met logging
     */
    async executeSearch(query, category) {
        console.log(`\n   🔎 "${query.slice(0, 50)}..."`);
        
        const results = await this.search(query);
        
        this.searchLog.push({
            query,
            category,
            resultsCount: results.length,
            timestamp: new Date().toISOString()
        });
        
        // Tag results met category
        results.forEach(r => {
            r.category = category;
            r.query = query;
            this.allResults.push(r);
        });
        
        console.log(`      ✅ ${results.length} resultaten`);
        
        // Rate limiting
        await this.sleep(300);
    }

    /**
     * Core search function - tries multiple providers
     */
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
                
                // Also get knowledge graph if available
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
                console.log(`      ⚠️ Google error: ${e.message.slice(0, 50)}`);
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
                    // Handle nested topics
                    if (topic.Topics) {
                        topic.Topics.slice(0, 3).forEach(sub => {
                            if (sub.Text) {
                                results.push({
                                    title: sub.Text.slice(0, 80),
                                    snippet: sub.Text,
                                    url: sub.FirstURL || '',
                                    source: 'duckduckgo_sub'
                                });
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.log(`      ⚠️ DuckDuckGo error`);
        }

        return results;
    }

    /**
     * Compile all results into structured format
     */
    compileResults() {
        const compiled = {
            competitors: {
                results: [],
                companies: new Set(),
                count: 0
            },
            exactMatch: {
                results: [],
                found: false
            },
            marketSize: {
                results: [],
                numbers: [],
                growth: []
            },
            trends: {
                results: [],
                keywords: []
            },
            startups: {
                results: [],
                productHunt: [],
                github: []
            },
            problem: {
                results: [],
                validated: false
            },
            uniqueness: {
                results: [],
                validated: false
            }
        };

        this.allResults.forEach(r => {
            const text = `${r.title} ${r.snippet}`.toLowerCase();
            
            switch(r.category) {
                case 'competitors':
                    compiled.competitors.results.push(r);
                    // Extract company names
                    const companies = this.extractCompanyNames(r.title);
                    companies.forEach(c => compiled.competitors.companies.add(c));
                    break;
                    
                case 'exact_match':
                    compiled.exactMatch.results.push(r);
                    if (text.length > 50) compiled.exactMatch.found = true;
                    break;
                    
                case 'market_size':
                    compiled.marketSize.results.push(r);
                    // Extract numbers
                    const numbers = text.match(/\$[\d,.]+\s*(billion|million|B|M|trillion|T)/gi);
                    if (numbers) compiled.marketSize.numbers.push(...numbers);
                    // Extract growth rates
                    const growth = text.match(/(\d+(?:\.\d+)?)\s*%/g);
                    if (growth) compiled.marketSize.growth.push(...growth);
                    break;
                    
                case 'trends':
                    compiled.trends.results.push(r);
                    // Extract trend keywords
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
                    // Als er weinig resultaten zijn, is het idee unieker
                    if (compiled.uniqueness.results.length < 3) compiled.uniqueness.validated = true;
                    break;
            }
        });

        compiled.competitors.count = compiled.competitors.companies.size;
        
        return compiled;
    }

    /**
     * Extract company names from text
     */
    extractCompanyNames(text) {
        const names = [];
        const words = text.split(/[\s\-\|:,\/]+/);
        
        words.forEach(word => {
            // Capitalized words that look like company names
            if (word.length > 2 && word.length < 20 && /^[A-Z]/.test(word)) {
                const clean = word.replace(/[^a-zA-Z0-9]/g, '');
                const exclude = ['The', 'And', 'For', 'How', 'What', 'Best', 'Top', 'New', 'Your', 
                               'Why', 'Are', 'This', 'That', 'With', 'From', 'Can', 'Will', 'All',
                               'Get', 'Find', 'See', 'Our', 'Most', 'More', 'One', 'Way', 'Use'];
                if (!exclude.includes(clean) && clean.length > 2) {
                    names.push(clean);
                }
            }
        });
        
        return names;
    }

    /**
     * Deep Analysis met GPT-4
     */
    async deepAnalysis(projectData, compiled, industry) {
        if (!this.openai) {
            return this.localAnalysis(projectData, compiled, industry);
        }

        // Build comprehensive search context
        const context = this.buildSearchContext(compiled, industry);

        const prompt = `Analyseer dit startup project op basis van de ECHTE zoekresultaten:

=== PROJECT INFO ===
Naam: ${projectData.projectTitle}
Wat het doet: ${projectData.coreIdea}
Probleem dat het oplost: ${projectData.problemSolved || 'Niet opgegeven'}
Doelgroep: ${projectData.targetAudience}
Unieke aanpak: ${projectData.uniqueApproach || 'Niet opgegeven'}
Business Model: ${projectData.businessModel || 'Nog niet bepaald'}
Tech Stack: ${projectData.techStack || 'Niet opgegeven'}
Demo URL: ${projectData.demoUrl || 'Geen'}

=== ZOEKRESULTATEN (${this.allResults.length} totaal) ===
${context}

=== ANALYSE OPDRACHT ===
Geef een JSON response met:

{
    "researchSummary": {
        "totalResultsAnalyzed": ${this.allResults.length},
        "competitorsFound": ["Lijst alle ECHTE bedrijfsnamen uit de zoekresultaten"],
        "competitorDetails": [
            {"name": "Bedrijf", "whatTheyDo": "Wat ze doen volgens zoekresultaat", "threat": "high/medium/low"}
        ],
        "marketSizeFound": "Exacte getallen uit zoekresultaten of 'niet gevonden'",
        "marketGrowthRate": "Percentage uit zoekresultaten of 'niet gevonden'",
        "trendSignals": ["Lijst van gevonden trend keywords"],
        "similarOnProductHunt": ${compiled.startups.productHunt.length},
        "similarOnGithub": ${compiled.startups.github.length},
        "problemValidated": ${compiled.problem.validated}
    },
    "thinking": {
        "whatThisIs": "Beschrijving van het project",
        "isTheProblemReal": "Ja/Nee + uitleg gebaseerd op zoekresultaten",
        "competitorComparison": "Vergelijking met gevonden concurrenten (noem namen!)",
        "marketTiming": "Is timing goed? Gebaseerd op trends"
    },
    "scoring": {
        "innovationBreakdown": {
            "noveltyVsCompetitors": {"points": 0, "reason": "Uitleg"},
            "technicalApproach": {"points": 0, "reason": "Uitleg"},
            "differentiation": {"points": 0, "reason": "Uitleg"}
        },
        "marketBreakdown": {
            "marketSize": {"points": 0, "reason": "Gebaseerd op gevonden TAM"},
            "growthRate": {"points": 0, "reason": "Gebaseerd op gevonden %"},
            "competitiveLandscape": {"points": 0, "reason": "Gebaseerd op # concurrenten"},
            "businessModel": {"points": 0, "reason": "Uitleg"}
        }
    },
    "innovationScore": {
        "score": 65,
        "reasoning": "Gedetailleerde uitleg met verwijzing naar zoekresultaten",
        "improvements": "Concrete suggesties"
    },
    "marketScore": {
        "score": 60,
        "reasoning": "Gedetailleerde uitleg met verwijzing naar zoekresultaten",
        "improvements": "Concrete suggesties"
    },
    "strengths": [
        {"title": "Sterkte", "description": "Gebaseerd op research"}
    ],
    "concerns": [
        {"issue": "Zorg", "suggestion": "Oplossing"}
    ],
    "nextSteps": [
        {"priority": "URGENT", "action": "Actie", "impact": "Impact"}
    ],
    "verdict": "EXCEPTIONAL/STRONG POTENTIAL/PROMISING/NEEDS WORK/EARLY STAGE",
    "investorSignal": "HIGH/MEDIUM/LOW",
    "recommendation": "2-3 zinnen conclusie"
}

BELANGRIJK: Gebruik ALLEEN informatie uit de zoekresultaten. Wees specifiek met namen en cijfers.`;

        try {
            console.log('\n   🧠 GPT-4 analyseert alle resultaten...');
            
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o',  // Beste en nieuwste GPT-4 model
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

            console.log('   ✅ GPT-4 analyse compleet');
            
            return JSON.parse(text);
            
        } catch (error) {
            console.error('   ❌ GPT-4 error:', error.message);
            return this.localAnalysis(projectData, compiled, industry);
        }
    }

    /**
     * Build search context for GPT-4
     */
    buildSearchContext(compiled, industry) {
        let context = '';
        
        // Competitors
        context += `\n--- COMPETITORS (${compiled.competitors.results.length} resultaten) ---\n`;
        context += `Gevonden bedrijven: ${Array.from(compiled.competitors.companies).slice(0, 15).join(', ')}\n`;
        compiled.competitors.results.slice(0, 8).forEach((r, i) => {
            context += `${i + 1}. ${r.title}\n   ${r.snippet?.slice(0, 200)}\n`;
        });
        
        // Market Size
        context += `\n--- MARKET SIZE (${compiled.marketSize.results.length} resultaten) ---\n`;
        context += `Gevonden cijfers: ${compiled.marketSize.numbers.slice(0, 5).join(', ') || 'geen'}\n`;
        context += `Groeipercentages: ${compiled.marketSize.growth.slice(0, 5).join(', ') || 'geen'}\n`;
        compiled.marketSize.results.slice(0, 5).forEach((r, i) => {
            context += `${i + 1}. ${r.title}\n   ${r.snippet?.slice(0, 200)}\n`;
        });
        
        // Trends
        context += `\n--- TRENDS (${compiled.trends.results.length} resultaten) ---\n`;
        context += `Trend signalen: ${compiled.trends.keywords.join(', ') || 'geen'}\n`;
        compiled.trends.results.slice(0, 5).forEach((r, i) => {
            context += `${i + 1}. ${r.title}\n   ${r.snippet?.slice(0, 200)}\n`;
        });
        
        // Startups
        context += `\n--- STARTUP DATABASES ---\n`;
        context += `ProductHunt matches: ${compiled.startups.productHunt.length}\n`;
        context += `GitHub matches: ${compiled.startups.github.length}\n`;
        compiled.startups.results.slice(0, 5).forEach((r, i) => {
            context += `${i + 1}. ${r.title} (${r.url?.includes('producthunt') ? 'PH' : r.url?.includes('github') ? 'GH' : 'other'})\n`;
        });
        
        // Problem validation
        context += `\n--- PROBLEM VALIDATION ---\n`;
        context += `Probleem gevalideerd: ${compiled.problem.validated ? 'JA' : 'ONZEKER'}\n`;
        compiled.problem.results.slice(0, 3).forEach((r, i) => {
            context += `${i + 1}. ${r.snippet?.slice(0, 200)}\n`;
        });
        
        return context;
    }

    /**
     * Local analysis fallback
     */
    localAnalysis(projectData, compiled, industry) {
        const numCompetitors = compiled.competitors.companies.size;
        const hasMarketData = compiled.marketSize.numbers.length > 0;
        const isGrowing = compiled.trends.keywords.some(k => ['growing', 'booming', 'expanding', 'emerging'].includes(k));
        const hasSimilar = compiled.startups.productHunt.length + compiled.startups.github.length;
        
        let innovationScore = 50;
        let marketScore = 50;
        
        // Innovation scoring
        if (numCompetitors === 0) innovationScore += 25;
        else if (numCompetitors < 3) innovationScore += 20;
        else if (numCompetitors < 6) innovationScore += 12;
        else innovationScore += 5;
        
        if (hasSimilar < 3) innovationScore += 10;
        if (projectData.coreIdea?.toLowerCase().includes('ai')) innovationScore += 18;
        
        // Market scoring
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
                competitorDetails: Array.from(compiled.competitors.companies).slice(0, 5).map(name => ({
                    name, whatTheyDo: 'Gevonden in zoekresultaten', threat: numCompetitors > 5 ? 'high' : 'medium'
                })),
                marketSizeFound: compiled.marketSize.numbers[0] || 'Niet specifiek gevonden',
                marketGrowthRate: compiled.marketSize.growth[0] || 'Niet gevonden',
                trendSignals: compiled.trends.keywords,
                similarOnProductHunt: compiled.startups.productHunt.length,
                similarOnGithub: compiled.startups.github.length,
                problemValidated: compiled.problem.validated
            },
            thinking: {
                whatThisIs: projectData.coreIdea,
                isTheProblemReal: compiled.problem.validated ? 'Ja, probleem lijkt reëel' : 'Nader te valideren',
                competitorComparison: `${numCompetitors} concurrenten gevonden: ${Array.from(compiled.competitors.companies).slice(0, 4).join(', ')}`,
                marketTiming: isGrowing ? 'Gunstig - markt groeit' : 'Neutraal - nader onderzoek nodig'
            },
            scoring: {
                innovationBreakdown: {
                    noveltyVsCompetitors: { points: numCompetitors < 3 ? 20 : 10, reason: `${numCompetitors} concurrenten` },
                    technicalApproach: { points: projectData.coreIdea?.toLowerCase().includes('ai') ? 18 : 10, reason: 'Tech analyse' },
                    differentiation: { points: 12, reason: 'Basis differentiatie' }
                },
                marketBreakdown: {
                    marketSize: { points: hasMarketData ? 20 : 10, reason: compiled.marketSize.numbers[0] || 'Geen data' },
                    growthRate: { points: isGrowing ? 10 : 5, reason: compiled.marketSize.growth[0] || 'Geen data' },
                    competitiveLandscape: { points: numCompetitors < 5 ? 15 : 5, reason: `${numCompetitors} spelers` },
                    businessModel: { points: projectData.businessModel?.includes('$') ? 20 : 10, reason: 'Model analyse' }
                }
            },
            innovationScore: { score: innovationScore, reasoning: `${numCompetitors} concurrenten, ${hasSimilar} vergelijkbare projecten`, improvements: 'Versterk differentiatie' },
            marketScore: { score: marketScore, reasoning: `${compiled.marketSize.numbers[0] || 'Markt'} met ${isGrowing ? 'groei' : 'stabiele'} trend`, improvements: 'Valideer met klanten' },
            strengths: [
                { title: 'Research gedaan', description: `${this.allResults.length} datapunten geanalyseerd` },
                numCompetitors < 5 ? { title: 'Beperkte concurrentie', description: `${numCompetitors} directe concurrenten` } : null
            ].filter(Boolean),
            concerns: [
                numCompetitors > 5 ? { issue: 'Drukke markt', suggestion: 'Focus op niche' } : null
            ].filter(Boolean),
            nextSteps: [
                { priority: 'URGENT', action: 'Interview klanten', impact: 'Valideert vraag' },
                { priority: 'URGENT', action: 'Bouw MVP', impact: 'Bewijst executie' }
            ],
            verdict: innovationScore + marketScore >= 140 ? 'STRONG POTENTIAL' : 'PROMISING',
            investorSignal: innovationScore + marketScore >= 140 ? 'MEDIUM' : 'LOW',
            recommendation: `Project gebaseerd op ${this.allResults.length} zoekresultaten. ${numCompetitors} concurrenten gevonden.`
        };
    }

    /**
     * Build final result
     */
    buildResult(projectData, analysis, compiled, industry) {
        const innovationScore = analysis.innovationScore?.score || 50;
        const marketScore = analysis.marketScore?.score || 50;
        const overallScore = Math.round((innovationScore + marketScore) / 2);
        
        return {
            projectTitle: projectData.projectTitle,
            
            // Research data
            researchSummary: analysis.researchSummary || null,
            scoring: analysis.scoring || null,
            recommendation: analysis.recommendation || null,
            searchStats: {
                totalQueries: this.searchLog.length,
                totalResults: this.allResults.length,
                uniqueSources: new Set(this.allResults.map(r => r.source)).size,
                searchLog: this.searchLog
            },
            
            thinking: analysis.thinking,
            
            summary: {
                whatItIs: projectData.coreIdea,
                whoItsFor: projectData.targetAudience,
                problemSolved: projectData.coreIdea,
                businessModel: projectData.businessModel || 'Nog te bepalen',
                competitiveEdge: analysis.thinking?.competitorComparison || 'Zie research'
            },
            
            strengths: analysis.strengths || [],
            concerns: analysis.concerns || [],
            
            innovationScore: {
                score: innovationScore,
                reasoning: analysis.innovationScore?.reasoning || 'Zie breakdown',
                improvements: analysis.innovationScore?.improvements || 'Zie aanbevelingen',
                breakdown: analysis.scoring?.innovationBreakdown || null
            },
            
            marketPotentialScore: {
                score: marketScore,
                reasoning: analysis.marketScore?.reasoning || 'Zie breakdown',
                improvements: analysis.marketScore?.improvements || 'Zie aanbevelingen',
                breakdown: analysis.scoring?.marketBreakdown || null
            },
            
            overallRating: {
                score: overallScore,
                verdict: analysis.verdict || this.getVerdict(overallScore),
                competitiveContext: `${compiled.competitors.companies.size} concurrenten gevonden in ${industry}`,
                investorSignal: analysis.investorSignal || 'MEDIUM'
            },
            
            nextSteps: analysis.nextSteps || [],
            
            webResearch: {
                competitorsFound: analysis.researchSummary?.competitorsFound || Array.from(compiled.competitors.companies).slice(0, 10),
                competitorDetails: analysis.researchSummary?.competitorDetails || [],
                marketGrowth: `${compiled.marketSize.numbers[0] || 'Zie resultaten'} - ${compiled.trends.keywords.join(', ') || 'neutraal'}`,
                marketSizeValidation: analysis.researchSummary?.marketSizeFound || compiled.marketSize.numbers[0] || 'Nader onderzoek nodig',
                trendSignals: compiled.trends.keywords,
                existingProductsFound: compiled.exactMatch.results.length,
                productHuntMatches: compiled.startups.productHunt.length,
                githubMatches: compiled.startups.github.length,
                totalSearchQueries: this.searchLog.length,
                totalResultsAnalyzed: this.allResults.length,
                searchSource: this.serperKey ? 'Google (Serper)' : 'DuckDuckGo'
            }
        };
    }

    // Helper methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    extractKeywords(text) {
        const stop = ['the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'with', 'that', 'this', 'is', 'are', 'de', 'het', 'een', 'en', 'van', 'voor'];
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
        if (/social|community|network|connect/.test(t)) return 'Social';
        if (/video|content|creator|media/.test(t)) return 'Creator Economy';
        if (/game|gaming|play/.test(t)) return 'Gaming';
        if (/food|restaurant|delivery/.test(t)) return 'FoodTech';
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

module.exports = { VibeClubAgent };
