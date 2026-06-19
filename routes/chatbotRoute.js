const { response } = require("express");
const ai = require("../libs/googleGenAi");
const supabaseAdmin = require("../libs/supabaseAdmin");
const AiService = require("../services/aiService");
const ConversationService = require("../services/conversationService");
const ContextService = require("../services/contextService");
const { toolManager } = require("../utils/actionUtils/callToolUtil");

const chatbotRouter = require("express").Router();

const aiServive = new AiService();
const conversationService = new ConversationService();
const contextService = new ContextService();

chatbotRouter.post("/chat", async (req, res) => {
  const { message, chatId } = req.body;

  let activeChatId = chatId;
  let error_message = "";
  let retry_counter = 0;

  // 1. Check if chatId is provided, if not create a new conversation
  if (!activeChatId) {
    const { data, error } = await conversationService.initiateConversation(
      req.userId,
    );
    if (error) return res.status(500).json({ error: error.message });
    activeChatId = data.id;
  }

  // 2. insert message to the chatbot_messages (for history)
  const { error: msgError } = await conversationService.recordMessage(
    req.userId,
    message,
    null,
    activeChatId,
  );
  if (msgError) return res.status(500).json({ error: msgError.message });

  // 3. retrieve conversation history
  const history = await conversationService.getChatHistory(activeChatId);

  // 4. retrieve chatContext
  const { data: context } = await contextService.retrieveContext(activeChatId);

  // 5. Send message to AI and get response
  var response = await aiServive.sendMessage(message, history, context, null);
  console.log(JSON.stringify(response, null, 2));

  // 6. Interpret response
  if (response.action && Array.isArray(response.action)) {
    response.action.forEach(async (action) => {
      switch (action) {
        case "ASK_QUESTION": //////////////////////////
          console.log("ASKING QUESTION");
          break;
        case "CALL_TOOL": //////////////////////////
          console.log("CALLING TOOL");
          await toolManager(response.tool, response, activeChatId);
          break;
        case "COMPLETE": //////////////////////////
          console.log("COMPLETED");
          break;
        default:
          retry_counter++;
          error_message += `\n INVALID ACTION NAME, RETRY COUNT : ${retry_counter}`;

          if (retry_counter > 3) {
            response.message = "INVALID TOOL NAME, RETRIED 3 TIMES ALREADY.";
          }

          response = await aiServive.sendMessage(
            message,
            history,
            context,
            error_message,
          );
          break;
      }
    });
  } else {
    // retry logic if response.action does not exist
  }

  // 7. Decide action

  // 8. Record AI response to chatbot_messages
  const { error: aiMsgError } = await conversationService.recordMessage(
    req.userId,
    null,
    response.message,
    activeChatId,
  );

  if (msgError) return res.status(500).json({ error: msgError.message });

  res.status(200).json({
    chatId: activeChatId,
    // response: { action: response.action, message: response.message }, // FOR PROUCTION
    response: response, // FOR TESTING
  });
});

module.exports = chatbotRouter;
