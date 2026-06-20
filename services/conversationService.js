const { json } = require("express");
const { CONVERSATION_HISTORY_LIMIT } = require("../config/conversationConfig");
const supabaseAdmin = require("../libs/supabaseAdmin");
const {
  toolNames,
  actions,
  toolExplanation,
  structuredReturn,
} = require("../tools/aiTools");
const { toolManager } = require("../utils/actionUtils/callToolUtil");
const { show_candidates } = require("../utils/actionUtils/actionUtil");

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
    const { data, error } = await supabaseAdmin
      .from("chatbot_messages")
      .select("user_message, chatbot_message")
      .eq("conversation_id", chatId)
      .order("created_at", { ascending: true })
      .limit(CONVERSATION_HISTORY_LIMIT);

    if (error) {
      throw error;
    }

    return data.flatMap((d) => {
      const messages = [];

      if (d.user_message) {
        messages.push({
          role: "user",
          parts: d.user_message,
        });
      }

      if (d.chatbot_message) {
        messages.push({
          role: "model",
          parts: d.chatbot_message,
        });
      }

      return messages;
    });
  };

  restructurePrompt = (message, history, context, extras) => {
    return `
You are BlueWorks Assistant, an AI job intake agent for a worker marketplace platform.

==================================================
CONVERSATION CONTEXT FIELDS
==================================================

These are the fields you maintain and update:

- job_category        : Broad category (e.g. Plumbing, Electrical, Carpentry)
- job_type            : Specific job (e.g. Leak Repair, Outlet Repair)
- required_skills     : Array of skills needed
- client_location     : Customer location (provided via map pin, use GET_CUSTOMER_LOCATION action)
- client_budget       : Must be a non-negative NUMBER (e.g. 1500). Never a string or range.
- urgency             : STRICTLY one of: Today | Tomorrow | This Week | Flexible
- candidate_limit     : Number of workers to find (positive integer)
- preferByNearest     : Boolean
- preferByRating      : Boolean
- ready_for_submission: true only when ALL required fields are filled and customer confirmed
- missing_fields      : Array of field names still missing
- extras              : A JSON object for any additional details that don't fit other fields (e.g. { "description": "kitchen sink leaking", "floor": "2nd floor" })

==================================================
AVAILABLE ACTIONS
==================================================

${JSON.stringify(actions, null, 2)}

Rules for actions:
- You MUST always include the correct action(s) in your response.
- If you are asking a question, include ASK_QUESTION.
- If you need the customer's location, include GET_CUSTOMER_LOCATION.
- If you want to show workers, include SHOW_CANDIDATES.
- CRITICAL: You MUST include CALL_TOOL in your action array if you want to use any tool. Tools will NOT run without it.
- You may return multiple actions.

==================================================
AVAILABLE TOOLS
==================================================

${JSON.stringify(toolNames, null, 2)}

Tool descriptions:
${JSON.stringify(toolExplanation, null, 2)}

Rules for tools:
- CRITICAL: Only put a tool in the "tool" array if you have also included "CALL_TOOL" in the "action" array.
- If you did not include CALL_TOOL in actions, the "tool" array must be empty.
- Only use available tool names listed above.
- Only include fields in tool arguments that you want to change. Do not repeat unchanged fields.
- client_budget must always be a NUMBER, never a string or range.
- extras must always be a JSON object, never a plain string. Store details like description, problem summary, and other notes inside it.

==================================================
RULES
==================================================

- Always return valid JSON. Never return markdown or text outside JSON.
- Never hallucinate or invent customer information.
- Never overwrite existing context unless the customer explicitly provides new information.
- Only populate fields that are explicitly provided or confirmed by the customer.
- Always return missing_fields reflecting the current state.
- Only set ready_for_submission=true when all required fields are filled and customer has confirmed.
- Keep tool arguments minimal — only include what changed.

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

  interpretAction = async (response, filtered_response, activeChatId) => {
    let ret = {
      error_message: "",
      success_message: "",
    };

    let res = {
      error_message: "",
      success_message: "",
    };

    if (response.action) {
      if (!Array.isArray(response.action)) {
        ret.error_message += `\n ACTION MUST BE AN ARRAY`;
        return;
      }

      for (const action of response.action) {
        switch (action) {
          case "ASK_QUESTION":
            filtered_response.ask_question = true;
            break;
          case "GET_CUSTOMER_LOCATION":
            filtered_response.get_location = true;
            break;
          case "SHOW_CANDIDATES":
            filtered_response.show_candidate = true;
            await show_candidates(activeChatId, filtered_response);
            break;
          case "CALL_TOOL": // TOOL CALL
            console.log("CALLING TOOL");
            res = await toolManager(response.tool, response, activeChatId);
            break;
          case "COMPLETE":
            console.log("COMPLETED");
            break;
          default:
            ret.error_message += `\n INVALID ACTION NAME: ${action}. AVAILABLE ACTION NAMES: ${JSON.stringify(actions, null, 2)}.`;
            break;
        }

        if (res.error_message) {
          console.log("RES : " + JSON.stringify(res));
          ret.error_message += `\n ${res.error_message}`;
          ret.success_message += `\n ${res.success_message}`;

          //RESET
          res = {
            error_message: "",
            success_message: "",
          };
        }
      }
    }
    console.log("CONVERSATION SERVICE ERROR: " + JSON.stringify(ret));
    return ret;
  };
}

module.exports = ConversationService;
