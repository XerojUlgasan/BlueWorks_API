const { response } = require("express");
const ai = require("../libs/googleGenAi");
const supabaseAdmin = require("../libs/supabaseAdmin");
const AiService = require("../services/aiService");
const ConversationService = require("../services/conversationService");
const ContextService = require("../services/contextService");
const { toolManager } = require("../utils/actionUtils/callToolUtil");
const { actions, toolNames } = require("../tools/aiTools");

const chatbotRouter = require("express").Router();

const aiServive = new AiService();
const conversationService = new ConversationService();
const contextService = new ContextService();

chatbotRouter.post("/chat", async (req, res) => {
  const { message, chatId, location } = req.body;

  let activeChatId = chatId;
  let error_message = "";
  let retry_counter = 0;
  let retry = true;
  let location_recorded = false;
  let extras = "";

  let filtered_response = {};

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

  if (location) {
    console.log(`UPDATING CLIENT LOCATION`);

    const { error: locationError } = await contextService.updateContext(
      {
        client_location: location,
      },
      activeChatId,
    );

    if (locationError) {
      return res.status(200).json({
        chatId: activeChatId,
        response: {
          message: `Error sending location: ${locationError.message}`,
        },
      });
    }

    location_recorded = true;
    extras +=
      "location successfully recorded already together with the customer's preferred search radius for workers.\n";
  }

  // 3. retrieve conversation history
  const history = await conversationService.getChatHistory(activeChatId);

  // 4. retrieve chatContext
  const { data: context } = await contextService.retrieveContext(activeChatId);

  // 5. Send message to AI and get response
  var response = await aiServive.sendMessage(message, history, context, extras);

  console.log("RESPONSE : " + JSON.stringify(response, null, 2));

  // 6. Interpret action response
  while (retry) {
    const res = await conversationService.interpretAction(
      response,
      filtered_response,
      activeChatId,
    );

    console.log("INTERPRETATION ERROR: " + JSON.stringify(res, null, 2));

    if (res.error_message) {
      response = await aiServive.sendMessage(message, history, context, {
        error: res.error_message,
        success: res.success_message,
      });

      continue;
    }

    retry = false;
  }

  // 7. Record AI response to chatbot_messages
  const { error: aiMsgError } = await conversationService.recordMessage(
    req.userId,
    null,
    response.message,
    activeChatId,
  );

  if (msgError) return res.status(500).json({ error: msgError.message });

  res.status(200).json({
    chatId: activeChatId,
    response: {
      action: response.action,
      message: response.message,
      ...filtered_response,
    }, // FOR PROUCTION
    // response: response, // FOR TESTING
  });
});

module.exports = chatbotRouter;
