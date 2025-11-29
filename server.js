const express = require('express');
const cors = require('cors');
const path = require('path');
const { evaluateProject } = require('./aiJudge');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'VibeClub AI Judge is running!',
        mode: 'Smart Analysis Engine'
    });
});

// Main evaluation endpoint
app.post('/api/evaluate', async (req, res) => {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('📥 NEW SUBMISSION:', req.body.projectTitle);
        console.log('='.repeat(60));
        
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
        if (req.body.coreIdea.length > 150) {
            return res.status(400).json({
                error: 'Core idea exceeds 150 characters',
                message: 'Please shorten your core idea description'
            });
        }
        
        if (req.body.targetAudience.length > 200) {
            return res.status(400).json({
                error: 'Target audience exceeds 200 characters',
                message: 'Please shorten your target audience description'
            });
        }
        
        if (req.body.problemStatement.length > 300) {
            return res.status(400).json({
                error: 'Problem statement exceeds 300 characters',
                message: 'Please shorten your problem statement'
            });
        }
        
        if (req.body.competitiveAdvantage.length > 300) {
            return res.status(400).json({
                error: 'Competitive advantage exceeds 300 characters',
                message: 'Please shorten your competitive advantage'
            });
        }
        
        // Validate URLs if provided
        if (req.body.githubLink && !isValidUrl(req.body.githubLink)) {
            return res.status(400).json({
                error: 'Invalid GitHub URL',
                message: 'Please enter a valid URL for GitHub'
            });
        }
        
        if (req.body.demoVideoLink && !isValidUrl(req.body.demoVideoLink)) {
            return res.status(400).json({
                error: 'Invalid demo video URL',
                message: 'Please enter a valid URL for demo video'
            });
        }
        
        // Evaluate the project
        console.log('🤖 Starting AI evaluation...');
        const startTime = Date.now();
        
        const result = await evaluateProject(req.body);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Evaluation complete in ${duration}s`);
        console.log(`📊 Scores: Innovation ${result.innovationScore.score}, Market ${result.marketPotentialScore.score}`);
        console.log(`🏆 Verdict: ${result.overallRating.verdict}`);
        console.log('='.repeat(60) + '\n');
        
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
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎯 VibeClub AI Judge System                             ║
║                                                            ║
║   Server running on: http://localhost:${PORT}                ║
║   Frontend: http://localhost:${PORT}                         ║
║   API: http://localhost:${PORT}/api                          ║
║                                                            ║
║   Mode: Smart Analysis Engine (No API Keys Required!)      ║
║                                                            ║
║   Status: ✅ Ready to evaluate projects!                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

// Helper function to validate URLs
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = app;
