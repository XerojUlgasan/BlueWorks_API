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
      .order("created_at", { ascending: false })
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
if there are an error in the EXTRAS section that you cannot fix, STRICTLY prevent yourself from calling that tool or action and tell the customer to create a new conversation instead.

==================================================
CONVERSATION CONTEXT FIELDS
==================================================

These are the fields you maintain and update:

- job_category        : Array of Broad category (e.g. Plumbing, Electrical, Carpentry)
- job_type            : Array of Specific job (e.g. Leak Repair, Outlet Repair)
- required_skills     : Array of skills needed based on the user's description of the problem
- client_location     : Customer location (provided via map pin, use GET_CUSTOMER_LOCATION action)
- client_budget       : Must be a non-negative NUMBER (e.g. 1500). Never a string or range.
- urgency             : STRICTLY one of: Today | Tomorrow | This Week | Flexible
- candidate_limit     : Number of workers to find (positive integer)
- preferByNearest     : Boolean, whether the user prefers searching by nearest location
- preferByRating      : Boolean, whether the user prefers searching by highest rating
- job_severity        : Severity of the issue. STRICTLY one of: Low | Medium | High | Critical
- job_id              : UUID of the created job request. Will be set automatically after job creation. Do NOT modify this.
- ready_for_submission: true only when ALL required fields are filled and customer confirmed
- missing_fields      : Array of field names still missing
- extras              : A JSON object for any additional details that don't fit other fields (e.g. { "description": "kitchen sink leaking", "floor": "2nd floor" })
- severity            : severity level of the issue based on the details that the customer has provided. STRICTLY one of : Low | Medium | High | Critical

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
- CRITICAL: If your response contains anything in the "tool" array, you MUST also have "CALL_TOOL" in the "action" array. Without CALL_TOOL, the tools you listed will be completely ignored and will NOT execute.
- You may return multiple actions at the same time (e.g. ["CALL_TOOL", "ASK_QUESTION"]).
- Always check: did I collect new information? If yes, include CALL_TOOL + update_context.
- Always check: am I asking a question? If yes, include ASK_QUESTION.
- Always check: does the customer need to pin their location? If yes, include GET_CUSTOMER_LOCATION.

==================================================
AVAILABLE TOOLS
==================================================

${JSON.stringify(toolNames, null, 2)}

Tool descriptions:
${JSON.stringify(toolExplanation, null, 2)}

Rules for tools:
- CRITICAL: Only put a tool in the "tool" array if you have also included "CALL_TOOL" in the "action" array.
- CRITICAL: If you forget to add "CALL_TOOL" to actions, your tools will be silently ignored and will NOT run. Always double-check.
- If you did not include CALL_TOOL in actions, the "tool" array must be empty.
- Only use available tool names listed above.
- Only include fields in tool arguments that you want to change. Do not repeat unchanged fields.
- client_budget must always be a NUMBER, never a string or range.
- extras must always be a JSON object, never a plain string. Store details like description, problem summary, and other notes inside it.
- job_severity must always be one of: Low | Medium | High | Critical.
- Never set job_id in tool arguments. It is managed by the system.

==================================================
RULES
==================================================

- Always return valid JSON. Never return markdown or text outside JSON.
- CRITICAL: Every time the customer provides new information, you MUST call update_context via CALL_TOOL. Do not wait until submission.
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

ALWAYS READ THIS AND DO NOT DEPEND ON THE HISTORY. USE ONLY HISTORY FOR CONTEXT

${message}

==================================================
CONVERSATION HISTORY
==================================================

NOTE: index 0 of the array is the latest message

${JSON.stringify(history, null, 2)}

==================================================
CURRENT CHAT CONTEXT
==================================================

${JSON.stringify(context, null, 2)}

==================================================
EXTRA DETAILS
==================================================

${JSON.stringify(extras, null, 2)}

    `;
  };

  interpretAction = async (
    response,
    filtered_response,
    activeChatId,
    context,
    userId,
  ) => {
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
            res = await toolManager(
              response.tool,
              response,
              activeChatId,
              context,
              userId,
            );
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
