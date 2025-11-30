const express = require('express');
const cors = require('cors');
const path = require('path');
const { evaluateProject } = require('./aiJudge');

// Load environment variables from .env file
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Check for API key on startup
const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'VibeClub AI Judge is running!',
        mode: hasOpenAI ? 'OpenAI GPT-4' : 'Local Analysis',
        apiConfigured: hasOpenAI
    });
});

// Main evaluation endpoint
app.post('/api/evaluate', async (req, res) => {
    try {
        console.log('\n' + '═'.repeat(60));
        console.log('📥 NEW SUBMISSION:', req.body.projectTitle);
        console.log('═'.repeat(60));
        
        // Validate request body
        const requiredFields = [
            'projectTitle',
            'coreIdea',
            'targetAudience',
            'problemStatement',
            'businessModel',
            'competitiveAdvantage'
        ];
        
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            console.log('❌ Missing fields:', missingFields);
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields,
                message: `Please fill in: ${missingFields.join(', ')}`
            });
        }
        
        // Validate character limits
        const limits = {
            coreIdea: 150,
            targetAudience: 200,
            problemStatement: 300,
            competitiveAdvantage: 300
        };
        
        for (const [field, limit] of Object.entries(limits)) {
            if (req.body[field] && req.body[field].length > limit) {
                return res.status(400).json({
                    error: `${field} exceeds ${limit} characters`,
                    message: `Please shorten your ${field}`
                });
            }
        }
        
        // Evaluate the project
        console.log(`🤖 Starting evaluation (Mode: ${hasOpenAI ? 'OpenAI GPT-4' : 'Local'})...`);
        const startTime = Date.now();
        
        const result = await evaluateProject(req.body);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ Evaluation complete in ${duration}s`);
        console.log(`📊 Innovation: ${result.innovationScore.score} | Market: ${result.marketPotentialScore.score}`);
        console.log(`🏆 Verdict: ${result.overallRating.verdict} | Investor: ${result.overallRating.investorSignal}`);
        console.log('═'.repeat(60) + '\n');
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Evaluation Error:', error);
        res.status(500).json({
            error: 'Evaluation failed',
            message: error.message || 'Something went wrong during evaluation'
        });
    }
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🎯 VibeClub AI Judge System                                 ║
║                                                                ║
║   Server: http://localhost:${PORT}                               ║
║                                                                ║
║   Mode: ${hasOpenAI ? '🟢 OpenAI GPT-4 (Real AI Analysis)' : '🟡 Local Analysis (Add API key for AI)'}       
║                                                                ║
${!hasOpenAI ? `║   ⚠️  Add OPENAI_API_KEY to .env for GPT-4 analysis          ║
║                                                                ║` : ''}
║   Status: ✅ Ready to evaluate projects!                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    if (!hasOpenAI) {
        console.log('\n💡 TIP: Create a .env file with your OpenAI API key:');
        console.log('   OPENAI_API_KEY=sk-your-key-here\n');
    }
});

module.exports = app;
