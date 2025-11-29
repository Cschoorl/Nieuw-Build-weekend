# 🎯 START HERE - VibeClub AI Judge

## ✅ Installation Complete!

All dependencies have been installed. Follow these 3 simple steps to start:

---

## 📝 STEP 1: Create .env file

Create a new file called `.env` in this folder and add:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SEARCH_API_KEY=your_search_api_key_here
SEARCH_API_PROVIDER=brave
PORT=3000
```

**Quick way:**
```bash
cp ENV_TEMPLATE.txt .env
```

Then edit `.env` and replace `your_anthropic_api_key_here` with your actual key.

---

## 🔑 STEP 2: Get Your API Key

### Anthropic Claude API (Required)

1. Go to: **https://console.anthropic.com/**
2. Sign up (free)
3. Go to "API Keys"
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-...`)
6. Paste it in your `.env` file

### Search API (Optional)

For real market research, get a free key from:
- **Brave Search**: https://brave.com/search/api/ (2,000/month free)
- **Serper**: https://serper.dev/ (2,500 free)

**Note**: Without search API, system uses mock data (still works for demo!)

---

## 🚀 STEP 3: Start the Server

```bash
npm start
```

Then open in your browser:
```
http://localhost:3000
```

---

## 🎉 That's it!

You should see:

```
╔════════════════════════════════════════════════════════════╗
║   🎯 VibeClub AI Judge System                             ║
║   Server running on: http://localhost:3000                ║
║   Status: ✅ Ready to evaluate projects!                   ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📚 What This System Does

### Input (from builders):
- Project details (title, idea, audience, problem)
- Business model
- Competitive advantage
- Optional: GitHub, demo, team info

### AI Processing:
1. ✅ **Validates** submission
2. 🔍 **Researches** competitors & market
3. 🤖 **Analyzes** with Claude AI
4. 📊 **Scores** Innovation (0-100) + Market Potential (0-100)
5. 💡 **Generates** recommendations

### Output:
- **Detailed scores** with reasoning
- **Strengths** of the project
- **Competitive analysis** from web research
- **Next steps** to improve scores
- **Investor signal** (HIGH/MEDIUM/LOW)

---

## 🎯 Test It!

Try this example:

```
Project: TaskFlow
Idea: AI-powered task prioritization tool
Audience: Remote workers and freelancers
Problem: Workers waste 2+ hours daily on prioritization
Model: SaaS: $9/month individual, $49/month teams
Advantage: Behavioral AI + native Slack/Gmail integration
```

Expected result: ~70-75 overall score, MEDIUM investor interest

---

## 📖 Documentation

- **README.md** - Full documentation
- **SETUP_GUIDE.md** - Detailed setup instructions
- **ENV_TEMPLATE.txt** - Environment variable template

---

## 🐛 Troubleshooting

### "Cannot find module"
```bash
npm install
```

### "Invalid API key"
- Check your `.env` file
- Ensure API key is correct
- No extra spaces

### Port already in use
Change `PORT=3001` in `.env`

---

## 💰 Costs

- **Anthropic Claude**: ~$0.003 per evaluation
- **Search APIs**: Free tier (2000+ queries/month)

Very affordable for hackathons! 💸

---

## 🚀 Ready to Go?

1. Create `.env` file ✅
2. Add API key ✅
3. Run `npm start` ✅
4. Open `http://localhost:3000` ✅

**Happy judging!** 🎉

---

Built for VibeClub Hackathon with ❤️

