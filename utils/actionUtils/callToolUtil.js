const ContextService = require("../../services/contextService");
const JobService = require("../../services/jobService");
const { toolNames } = require("../../tools/aiTools");

const toolManager = async (tool_arr, response, chatId, context, userId) => {
  const jobService = new JobService();

  let error_messages = "";
  let success_messages = "";
  let res = "";

  if (tool_arr) {
    if (!Array.isArray(tool_arr)) {
      error_messages += `TOOL IS NOT AN ARRAY`;
      return {
        error_message: error_messages,
        success_message: success_messages,
      };
    }

    for (const tool of tool_arr) {
      res = "";
      switch (tool.name) {
        case "update_context":
          res = await updateContextTool(tool.arguments, chatId, userId);
          break;
        case "create_job_request":
          res = await createJobRequestTool(context, userId, chatId);
          break;
        default:
          console.log("INVALID TOOL NAME: " + tool.name);
          error_messages += `INVALID TOOL NAME: ${tool.name}  AVAILABLE TOOL NAMES: ${JSON.stringify(toolNames, null, 2)}\n`;
          break;
      }

      if (res?.error_message) {
        error_messages += `TOOL ERROR [${tool.name}]: ${res.error_message}\n`;
      } else if (res?.success_message) {
        success_messages += res.success_message + "\n";
      } else if (res?.error) {
        error_messages += `TOOL ERROR [${tool.name}]: ${res.error.message}\n`;
      } else {
        success_messages += `TOOL: ${tool.name} ARGS: ${JSON.stringify(tool.arguments)} WAS EXECUTED SUCCESSFULLY, DON'T REPEAT THIS AGAIN WHEN ANOTHER ERROR OCCURED, UNLESS NEEDED\n`;
      }
    }
  }

  console.log("TOOL MANAGER ERROR : " + error_messages);
  return { error_message: error_messages, success_message: success_messages };
};

const updateContextTool = async (args, chatId, userId) => {
  console.log("UPDATING CONTEXT");
  const contextService = new ContextService();
  const res = await contextService.updateContext(args, chatId, userId);
  if (res.error) console.log("CONTEXT TOOL ERROR : " + res.error.message);
  return res.error
    ? { error_message: res.error.message, success_message: "" }
    : { error_message: "", success_message: "Context updated successfully." };
};

const createJobRequestTool = async (context, client_id, chatId) => {
  console.log("CREATING JOB REQUEST");
  const jobService = new JobService();
  const contextService = new ContextService();

  if (context.job_id) {
    console.log("JOB REQUEST ALREADY CREATED!!! ");
    return {
      error_message: `Job request already exists with ID: ${context.job_id}.`,
      success_message: "",
    };
  }

  const { data, error } = await jobService.createJobRequest(context, client_id);
  if (error)
    return {
      error_message: `ERROR CREATING JOB REQUEST: ${error.message}`,
      success_message: "",
    };
  await contextService.bindJobIdToContext(chatId, data.id);
  return {
    error_message: "",
    success_message: `Job request created with ID: ${data.id}.`,
  };
};

module.exports = { toolManager };
