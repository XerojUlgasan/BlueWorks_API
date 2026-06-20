const ai = require("../libs/googleGenAi");
const { aiIdentity } = require("../prompts/identityPrompt");
const ConversationService = require("./conversationService");

class AiService {
  identity = aiIdentity;
  conversationService = new ConversationService();

  sendMessage = async (prompt, history, context, extras) => {
    const content = this.conversationService.restructurePrompt(
      prompt,
      history,
      context,
      extras,
    );

    // console.log(content);

    const response = await ai.models.generateContent({
      // model: "gemini-2.5-flash",
      model: "gemini-3.1-flash-lite",
      contents: content,
      config: {
        systemInstruction: this.identity,
      },
    });

    console.log(JSON.parse(response.text, null, 2));

    return JSON.parse(response.text);
  };
}

module.exports = AiService;
