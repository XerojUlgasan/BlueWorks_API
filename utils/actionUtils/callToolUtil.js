const ContextService = require("../../services/contextService");
const { toolNames } = require("../../tools/aiTools");

const toolManager = async (tool_arr, response, chatId) => {
  let error_messages = "";
  let success_messages = "";
  let res = "";

  if (tool_arr) {
    if (!Array.isArray(tool_arr)) {
      error_messages += `TOOL IS NOT AN ARRAY`;
      return;
    }

    for (const tool of tool_arr) {
      switch (tool.name) {
        case "update_context":
          res = await updateContextTool(tool.arguments, chatId);
          break;
        case "send_job_requests":
          break;
        default:
          console.log("INVALID TOOL NAME: " + tool.name);
          error_messages += `INVALID TOOL NAME: ${tool.name}  AVAILABLE TOOL NAMES: ${JSON.stringify(toolNames, null, 2)}\n`;
          break;
      }

      if (res) {
        error_messages += `TOOL ERROR: ${res} \n`;
        res = null; // reset
      } else {
        success_messages += `TOOL: ${tool.name} ARGS: ${JSON.stringify(tool.arguments)} WAS EXECUTED SUCCESSFULLY, DON'T REPEAT THIS AGAIN WHEN ERROR OCCURED\n`;
      }
    }
  }

  console.log("TOOL MANAGER ERROR : " + error_messages);
  return { error_message: error_messages, success_message: success_messages };
};

const updateContextTool = async (args, chatId) => {
  console.log("UPDATING CONTEXT");

  const contextService = new ContextService();

  const res = await contextService.updateContext(args, chatId);

  if (res.error) {
    console.log("CONTEXT TOOL ERROR : " + res.error.message);
  }
  return res.error ? res.error.message : "";
};

module.exports = { toolManager };
