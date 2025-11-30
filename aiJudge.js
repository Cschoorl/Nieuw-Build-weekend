const { VibeClubAgent } = require('./agent');

/**
 * Main evaluation function using the AI Agent
 */
async function evaluateProject(projectData) {
    // Create new agent instance
    const agent = new VibeClubAgent();
    
    // Run the agent's evaluation
    const result = await agent.evaluate(projectData);
    
    return result;
}

module.exports = { evaluateProject };
