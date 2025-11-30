# 🚀 Quick Setup Guide for VibeClub AI Judge

## Step-by-Step Installation

### 1️⃣ Install Node.js

If you don't have Node.js installed:

**Mac:**
```bash
# Using Homebrew
brew install node
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

**Verify installation:**
```bash
node --version
npm --version
```

### 2️⃣ Install Dependencies

In the project folder:

```bash
npm install
```

This installs:
- Express (web server)
- Claude AI SDK
- Axios (HTTP requests)
- CORS (API access)
- dotenv (environment variables)

### 3️⃣ Get Your API Keys

#### Anthropic Claude API (Required)

1. Go to: https://console.anthropic.com/
2. Sign up with your email
3. Go to **API Keys** section
4. Click **Create Key**
5. Copy your key (starts with `sk-ant-...`)

#### Search API (Optional, but recommended)

**Brave Search API:**
1. Go to: https://brave.com/search/api/
2. Sign up for free account
3. Get API key
4. Free tier: 2,000 queries/month

**OR Serper (Google Search):**
1. Go to: https://serper.dev/
2. Sign up
3. Get API key
4. Free tier: 2,500 queries

### 4️⃣ Configure Environment

Create a `.env` file in the project root:

```bash
# Option 1: Copy template
cp ENV_TEMPLATE.txt .env

# Option 2: Create manually
nano .env
```

Add your keys:

```env
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
SEARCH_API_KEY=your-search-key-here
SEARCH_API_PROVIDER=brave
PORT=3000
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X for nano)

### 5️⃣ Start the Server

```bash
npm start
```

You should see:

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎯 VibeClub AI Judge System                             ║
║                                                            ║
║   Server running on: http://localhost:3000                ║
║   Frontend: http://localhost:3000                         ║
║   API: http://localhost:3000/api                          ║
║                                                            ║
║   Status: ✅ Ready to evaluate projects!                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### 6️⃣ Open the Application

Open your browser and go to:

```
http://localhost:3000
```

### 7️⃣ Test It!

Fill in a test project:

```
Project Title: TaskFlow
Core Idea: AI-powered task prioritization for remote workers
Target Audience: Freelancers and remote teams
Problem: Workers waste 2+ hours daily deciding what to work on
Business Model: SaaS - $9/month for individuals, $49/month for teams
Competitive Advantage: Behavioral AI learns from your work patterns
```

Click **Get AI Evaluation** and wait ~20 seconds.

## 🐛 Common Issues

### "Cannot find module 'express'"

Solution:
```bash
npm install
```

### "Invalid API key"

Solution:
- Check your `.env` file
- Make sure API key is copied correctly
- No extra spaces or quotes

### "Port 3000 already in use"

Solution:
```bash
# Change port in .env
PORT=3001
```

Or kill the process:
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F
```

### Search API not working

Solution:
- Check `SEARCH_API_KEY` in `.env`
- Verify API quota not exceeded
- System will work with mock data if search fails

## 🎯 What to Do Next

1. **Test with your own project ideas**
2. **Check the scores and feedback**
3. **Share with your team**
4. **Use for hackathon judging**

## 💡 Pro Tips

✅ **For best results:**
- Be specific in your descriptions
- Include market size if you know it
- Add GitHub/demo links if available
- Mention your team's experience

✅ **Scoring factors:**
- **Innovation**: Novelty, tech sophistication, differentiation
- **Market Potential**: Market size, business model, competition, execution feasibility

✅ **Save money on API costs:**
- Claude charges per token (~$0.003 per evaluation)
- Search APIs have free tiers (2000+ queries/month)

## 📞 Need Help?

1. Check the main README.md
2. Review error messages in terminal
3. Verify all dependencies installed
4. Ensure API keys are valid

## 🚀 Ready to Deploy?

See deployment section in main README.md for:
- Vercel/Netlify (frontend)
- Railway/Render (backend)
- Environment variable setup

---

**You're all set!** 🎉

Start evaluating projects with AI-powered insights!



