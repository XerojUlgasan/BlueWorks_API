const ContextService = require("../../services/contextService");

const toolManager = async (tool_arr, response, chatId) => {
  if (tool_arr && Array.isArray(tool_arr)) {
    tool_arr.forEach(async (tool) => {
      switch (tool.name) {
        case "show_candidates":
          break;
        case "update_context":
          await updateContextTool(tool.arguments, chatId);
          break;
        case "send_job_requests":
          break;
        case "get_customer_location":
          break;
        default:
          console.log("INVALID TOOL NAME: " + tool.name);
          break;
      }
    });
  } else {
  }
  response.test = "check lang po";
  return;
};

const updateContextTool = async (args, chatId) => {
  console.log("UPDATING CONTEXT");

  const contextService = new ContextService();

  const { data, error } = await contextService.updateContext(args, chatId);

  if (error) console.log("ERROR ENCOUNTERED: " + error.message);
};

module.exports = { toolManager };
