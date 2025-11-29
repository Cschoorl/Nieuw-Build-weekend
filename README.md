# 🎯 VibeClub AI Judge System

An AI-powered evaluation system for hackathon projects that scores submissions on **Innovation Level** and **Market Potential** using Claude AI and real-time web research.

![VibeClub AI Judge](https://img.shields.io/badge/AI-Claude%20Sonnet%204-blueviolet)
![Status](https://img.shields.io/badge/status-ready-success)

## 🌟 Features

- **🤖 AI-Powered Scoring** - Uses Claude Sonnet 4 for intelligent evaluation
- **🔍 Real-Time Market Research** - Searches web for competitors, market size, and trends
- **📊 Dual Metrics** - Innovation Level (0-100) + Market Potential (0-100)
- **💡 Actionable Feedback** - Specific recommendations for improvement
- **🎨 Modern UI** - Beautiful, responsive interface with live loading states
- **📈 Investor Signals** - HIGH/MEDIUM/LOW interest indicators
- **🚀 Next Steps** - Prioritized action items with impact analysis

## 📋 What It Evaluates

### Input Fields
- **Project Title** - Name of your project
- **Core Idea** - One-sentence pitch (max 150 chars)
- **Target Audience** - Who are your customers? (max 200 chars)
- **Problem Statement** - What problem does it solve? (max 300 chars)
- **Business Model** - How will you make money?
- **Competitive Advantage** - Why will you win? (max 300 chars)
- **Market Size** (optional) - TAM/SAM estimates
- **GitHub Link** (optional) - Repository URL
- **Demo Video** (optional) - Demo link
- **Team Experience** (optional) - Team background

### AI Analysis Process

1. **Validation** - Checks all required fields
2. **Market Research** - Searches for:
   - Competitors in the space
   - Market size validation
   - Industry trends (2024-2025)
3. **Innovation Scoring** (0-100)
   - Novelty of idea
   - Technical sophistication
   - Competitive differentiation
   - Team capability
4. **Market Potential Scoring** (0-100)
   - Target audience size
   - Business model viability
   - Competitive landscape
   - Execution feasibility
5. **Recommendations** - Specific next steps to improve scores

### Output Structure

```json
{
  "projectTitle": "TaskFlow",
  "summary": {
    "whatItIs": "...",
    "whoItsFor": "...",
    "problemSolved": "...",
    "businessModel": "...",
    "competitiveEdge": "..."
  },
  "strengths": [
    { "title": "Real Market Demand", "description": "..." }
  ],
  "innovationScore": {
    "score": 75,
    "reasoning": "...",
    "improvements": "..."
  },
  "marketPotentialScore": {
    "score": 68,
    "reasoning": "...",
    "improvements": "..."
  },
  "overallRating": {
    "score": 72,
    "verdict": "Promising",
    "competitiveContext": "Competing against Asana, Notion...",
    "investorSignal": "MEDIUM"
  },
  "nextSteps": [
    {
      "priority": "URGENT",
      "action": "Build working MVP",
      "impact": "Will improve innovation score to 82+"
    }
  ],
  "webResearch": {
    "competitorsFound": ["Asana", "Notion", "Monday"],
    "marketGrowth": "...",
    "marketSizeValidation": "..."
  }
}
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ and npm
- **Anthropic API Key** (required) - [Get one here](https://console.anthropic.com/)
- **Search API Key** (optional) - For real market research

### Installation

1. **Clone or download this project**

```bash
cd "Nieuw Build weekend"
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
# Copy the template
cp ENV_TEMPLATE.txt .env
```

Then edit `.env` and add your API keys:

```env
# REQUIRED
ANTHROPIC_API_KEY=sk-ant-xxx...

# OPTIONAL (for real web research)
SEARCH_API_KEY=your_search_key
SEARCH_API_PROVIDER=brave

PORT=3000
```

**Note**: Without a search API key, the system will work with mock data for demonstrations.

### Running the Application

```bash
npm start
```

The server will start on `http://localhost:3000`

Open your browser and go to:
```
http://localhost:3000
```

## 🎯 How to Use

1. **Fill in the submission form**
   - All fields marked with * are required
   - Character limits are enforced
   - URLs are validated

2. **Click "Get AI Evaluation"**
   - Wait ~20 seconds for analysis
   - Watch the progress steps

3. **Review your results**
   - See your scores (Innovation + Market Potential)
   - Read AI reasoning
   - Check competitor analysis
   - Review next steps

4. **Submit another project**
   - Click "Submit Another Project" button

## 🔧 API Endpoints

### POST `/api/evaluate`

Evaluate a project submission.

**Request Body:**
```json
{
  "projectTitle": "TaskFlow",
  "coreIdea": "AI-powered task prioritization",
  "targetAudience": "Remote workers and freelancers",
  "problemStatement": "Workers waste 2+ hours daily on prioritization",
  "businessModel": "SaaS: $9/month individual, $49/month teams",
  "competitiveAdvantage": "Behavioral AI + native integrations",
  "marketSize": "$8B TAM",
  "githubLink": "https://github.com/...",
  "demoVideoLink": "https://youtube.com/...",
  "teamExperience": "10 years in productivity software"
}
```

**Response:**
```json
{
  "projectTitle": "...",
  "summary": { ... },
  "strengths": [ ... ],
  "innovationScore": { ... },
  "marketPotentialScore": { ... },
  "overallRating": { ... },
  "nextSteps": [ ... ],
  "webResearch": { ... }
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "message": "VibeClub AI Judge is running!"
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Vanilla JS)          │
│  - Submission form                              │
│  - Loading animations                           │
│  - Results display                              │
└─────────────────┬───────────────────────────────┘
                  │ HTTP POST /api/evaluate
                  ▼
┌─────────────────────────────────────────────────┐
│              Express.js Backend                 │
│  - Input validation                             │
│  - API routing                                  │
│  - Error handling                               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              AI Judge Module                    │
│  1. Web Research (webSearch.js)                 │
│     - Find competitors                          │
│     - Validate market size                      │
│     - Analyze trends                            │
│                                                 │
│  2. Claude AI Analysis (aiJudge.js)             │
│     - Parse inputs + research                   │
│     - Generate scores (Innovation + Market)     │
│     - Create recommendations                    │
│                                                 │
│  3. Structure Response                          │
│     - Format as JSON                            │
│     - Add web research data                     │
└─────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
.
├── index.html              # Frontend submission form
├── styles.css              # UI styling
├── app.js                  # Frontend JavaScript
├── server.js               # Express.js backend
├── aiJudge.js              # AI evaluation logic
├── webSearch.js            # Web research module
├── package.json            # Dependencies
├── ENV_TEMPLATE.txt        # Environment template
└── README.md               # This file
```

## 🔑 API Keys

### Anthropic Claude API (Required)

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up / Sign in
3. Navigate to API Keys
4. Create a new key
5. Add to `.env` as `ANTHROPIC_API_KEY`

**Pricing**: Pay-as-you-go, ~$0.003 per evaluation

### Search API (Optional)

Choose one provider:

**Option 1: Brave Search** (Recommended)
- Website: [brave.com/search/api](https://brave.com/search/api/)
- Free tier: 2,000 queries/month
- Set `SEARCH_API_PROVIDER=brave`

**Option 2: Serper**
- Website: [serper.dev](https://serper.dev/)
- Free tier: 2,500 queries
- Set `SEARCH_API_PROVIDER=serper`

**Option 3: Tavily**
- Website: [tavily.com](https://tavily.com/)
- Free tier: 1,000 queries/month
- Set `SEARCH_API_PROVIDER=tavily`

**Without Search API**: System uses mock data for demonstrations

## 🎨 Customization

### Adjust Scoring Weights

Edit `aiJudge.js` - modify the Claude prompt:

```javascript
// Change scoring emphasis
- Innovation: Focus more on tech novelty
- Market: Focus more on business viability
```

### Change UI Theme

Edit `styles.css`:

```css
:root {
    --primary: #6366f1;      /* Main color */
    --success: #10b981;      /* High scores */
    --warning: #f59e0b;      /* Medium scores */
    --danger: #ef4444;       /* Low scores */
}
```

### Add More Search Queries

Edit `aiJudge.js` - `conductWebResearch()` function:

```javascript
// Add new research queries
const customQuery = `${keywords} specific research`;
const results = await searchWeb(customQuery);
```

## 🐛 Troubleshooting

### "AI evaluation failed"
- Check your `ANTHROPIC_API_KEY` in `.env`
- Ensure API key is valid and has credits
- Check console for detailed error

### "Search API error"
- Verify `SEARCH_API_KEY` is correct
- Check API quota/limits
- System will fallback to mock data

### Form validation errors
- Ensure all required fields are filled
- Check character limits
- Validate URL formats

### Port already in use
- Change `PORT` in `.env` to another port (e.g., 3001)
- Or kill the process using port 3000

## 📊 Example Evaluation

**Input:**
```
Project: TaskFlow
Idea: AI-powered task prioritization tool
Audience: Remote workers and freelancers
Problem: Workers waste 2+ hours daily on prioritization
Model: SaaS: $9/month individual, $49/month teams
Advantage: Behavioral AI + native Slack/Gmail integration
```

**Output:**
```
Innovation Score: 72/100
- Novel behavioral AI approach
- Good integration strategy
- Room for deeper ML features

Market Potential: 68/100
- Real market ($8B TAM)
- Viable business model
- Crowded competitive landscape
- Need stronger differentiation

Overall: 70/100 - "Promising"
Investor Interest: MEDIUM

Next Steps:
1. [URGENT] Build working MVP
2. [URGENT] Conduct user interviews
3. [NICE] Partner with Slack officially
```

## 🚀 Deployment

### Deploy to Vercel/Netlify (Frontend)
1. Push to GitHub
2. Connect to Vercel/Netlify
3. Set environment variables
4. Deploy

### Deploy Backend (Railway/Render)
1. Push to GitHub
2. Connect to Railway/Render
3. Add `ANTHROPIC_API_KEY` environment variable
4. Deploy
5. Update frontend API URL in `app.js`

## 📝 License

MIT License - Free to use and modify

## 🤝 Contributing

This is a hackathon project. Feel free to fork and improve!

## 💡 Tips for Best Results

1. **Be Specific** - Vague ideas get lower scores
2. **Include Market Size** - Helps validation
3. **Add GitHub Link** - Shows real progress
4. **Describe Team** - Experience boosts credibility
5. **Clear Business Model** - Shows commercial viability

## 📮 Support

For issues or questions:
- Check console logs for errors
- Review API key setup
- Ensure all dependencies installed

---

Built with ❤️ for VibeClub Hackathon

**Powered by**: Claude Sonnet 4 + Web Research APIs

