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

  console.log(JSON.stringify(context, null, 2));

  // 5. Send message to AI and get response
  var response = await aiServive.sendMessage(message, history, context, extras);

  console.log(JSON.stringify(response, null, 2));

  // 6. Interpret action response
  while (retry) {
    const interpretResult = await conversationService.interpretAction(
      response,
      filtered_response,
      activeChatId,
      context,
      req.userId,
    );

    if (interpretResult.error_message) {
      console.log(
        "INTERPRETATION ERROR: " + JSON.stringify(interpretResult, null, 2),
      );

      retry_counter++;
      if (retry_counter > 3) {
        response.message =
          "Something went wrong after multiple retries. Please try again.";
        retry = false;
        break;
      }

      response = await aiServive.sendMessage(message, history, context, {
        error: interpretResult.error_message,
        success: interpretResult.success_message,
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

  if (aiMsgError) return res.status(500).json({ error: aiMsgError.message });

  return res.status(200).json({
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

// SEVERITY
// HOURLY RATE / OVER ALL JOB RATE
