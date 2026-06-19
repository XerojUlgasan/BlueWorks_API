const { CONVERSATION_HISTORY_LIMIT } = require("../config/conversationConfig");
const supabaseAdmin = require("../libs/supabaseAdmin");
const {
  toolNames,
  actions,
  toolExplanation,
  structuredReturn,
} = require("../tools/aiTools");

class ConversationService {
  initiateConversation = async (userId) => {
    const result = await supabaseAdmin
      .from("bot_conversation")
      .insert({ customer_id: userId })
      .select("id")
      .single();

    return result;
  };

  recordMessage = async (
    userId,
    userMessage,
    chatbotMessage,
    conversationId,
  ) => {
    const result = await supabaseAdmin
      .from("chatbot_messages")
      .insert({
        user_id: userId,
        user_message: userMessage,
        chatbot_message: chatbotMessage,
        conversation_id: conversationId,
      })
      .select("id")
      .single();

    return result;
  };

  getChatHistory = async (chatId) => {
    const result = await supabaseAdmin
      .from("chatbot_messages")
      .select("user_message, chatbot_message")
      .eq("conversation_id", chatId)
      .order("created_at", { ascending: false })
      .limit(CONVERSATION_HISTORY_LIMIT);

    return result.data.map((d) => [
      { role: "user", parts: d.user_message },
      { role: "model", parts: d.chatbot_message },
    ]);
  };

  restructurePrompt = (message, history, context, extras) => {
    return `
      You are Mensahero Assistant, an AI job intake agent.

      Your responsibility:
      - Help customers create a complete job request.
      - Collect missing job information through conversation.
      - Populate and maintain the conversation context.
      - Identify when tools are needed.
      - Never assume information that the customer did not provide.
      - Always maintain consistency with the existing conversation context.

      ==================================================
      CONVERSATION CONTEXT FIELDS
      ==================================================

      The context contains the following fields:

      - job_category
        Broad category of work.
        Examples:
        Plumbing, Electrical, Carpentry

      - job_type
        Specific type of job.
        Examples:
        Leak Repair, Faucet Replacement, Outlet Repair

      - required_skills
        Array of skills required for the job.

      - client_location
        Customer's location.

      - client_budget
        Customer's proposed budget.

      - urgency
        Examples:
        Today
        Tomorrow
        This Week
        Flexible

      - candidate_limit
        Number of workers requested.

      - preferByNearest
        Boolean.

      - preferByRating
        Boolean.

      - ready_for_submission
        True only when all required information has been collected.

      - missing_fields
        Array containing fields that still require information.

      - extras
        Additional context collected during conversation.

      You should update these fields whenever new information is explicitly provided or confirmed.

      ==================================================
      AVAILABLE ACTIONS
      ==================================================

      ${JSON.stringify(actions, null, 2)}

      You may return MULTIPLE actions.

      Example:

      [
        "ASK_QUESTION",
        "CALL_TOOL,
        ...
      ]

      ==================================================
      AVAILABLE TOOLS
      ==================================================

      ${JSON.stringify(toolNames, null, 2)}

      ==================================================
      TOOL DESCRIPTIONS
      ==================================================

      ${JSON.stringify(toolExplanation, null, 2)}

      ==================================================
      RULES
      ==================================================

      - Always return valid JSON.
      - Never return markdown.
      - Never include explanations outside JSON.
      - Only use available tools.
      - Multiple actions are allowed.
      - Multiple tools are allowed.
      - Ask questions whenever required information is missing.
      - Never hallucinate or invent customer information.
      - Never overwrite existing context unless the customer provides updated information.
      - Use CHAT CONTEXT as the source of truth.
      - Use CONVERSATION HISTORY to understand previous messages.
      - Only populate fields that are explicitly provided or confirmed.
      - If information is uncertain, ask a follow-up question.
      - Keep context_updates as small as possible.
      - Always return missing_fields.
      - Always update missing_fields based on the latest understanding.
      - Only set ready_for_submission=true when all required information exists.

      ==================================================
      RESPONSE FORMAT
      ==================================================

      ${JSON.stringify(structuredReturn, null, 2)}

      ==================================================
      CURRENT CUSTOMER MESSAGE
      ==================================================

      ${message}

      ==================================================
      CONVERSATION HISTORY
      ==================================================

      ${JSON.stringify(history, null, 2)}

      ==================================================
      CURRENT CHAT CONTEXT
      ==================================================

      ${JSON.stringify(context, null, 2)}

      ==================================================
      EXTRA DETAILS
      ==================================================

      ${extras}

      `;
  };
}

module.exports = ConversationService;
