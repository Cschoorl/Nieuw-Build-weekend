const express = require('express');
const cors = require('cors');
const path = require('path');
const { evaluateProject } = require('./aiJudge');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Check for API keys
const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');
const hasSerper = process.env.SERPER_API_KEY && process.env.SERPER_API_KEY.length > 10;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        openai: hasOpenAI,
        serper: hasSerper
    });
});

// Main evaluation endpoint - SIMPELER validatie
app.post('/api/evaluate', async (req, res) => {
    try {
        console.log('\n' + '═'.repeat(60));
        console.log('📥 NIEUW PROJECT:', req.body.projectTitle);
        console.log('═'.repeat(60));
        
        // Alleen basis velden verplicht
        const requiredFields = ['projectTitle', 'coreIdea', 'targetAudience'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Vul alle verplichte velden in',
                missingFields
            });
        }
        
        // Run de agent
        console.log(`🤖 Agent start (OpenAI: ${hasOpenAI ? '✅' : '❌'}, Serper: ${hasSerper ? '✅' : '❌'})`);
        const startTime = Date.now();
        
        const result = await evaluateProject(req.body);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ Klaar in ${duration}s`);
        console.log(`📊 Innovation: ${result.innovationScore.score} | Market: ${result.marketPotentialScore.score}`);
        console.log(`🏆 ${result.overallRating.verdict}`);
        console.log('═'.repeat(60) + '\n');
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            error: 'Evaluatie mislukt',
            message: error.message
        });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🤖 VibeClub AI Agent                                        ║
║                                                                ║
║   Server: http://localhost:${PORT}                               ║
║                                                                ║
║   OpenAI GPT-4: ${hasOpenAI ? '🟢 Actief' : '🔴 Niet geconfigureerd'}                              
║   Web Search:   ${hasSerper ? '🟢 Serper (Google)' : '🟡 DuckDuckGo'}                         
║                                                                ║
║   Status: ✅ Agent klaar!                                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
