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
      return;
    }

    for (const tool of tool_arr) {
      switch (tool.name) {
        case "update_context":
          res = await updateContextTool(tool.arguments, chatId, userId);
          break;
        case "create_and_send_job_requests":
          rest = await jobService.createAndSendJobRequest(
            tool.arguments,
            context,
            userId,
            chatId,
          );
          break;
        case "create_job_request":
          //   res = await createJobRequestTool(tool.arguments);
          break;
        case "update_job_request":
          break;
        case "delete_job_request":
          break;
        case "send_job_request":
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

  if (res.error) {
    console.log("CONTEXT TOOL ERROR : " + res.error.message);
  }
  return res.error ? res.error.message : "";
};

const send_job_requests = async () => {
  // {                                    SAMPLE
  //   "name": "send_job_requests",
  //   "arguments": {
  //     "job_category": "Electrical",
  //     "job_type": "Circuit Breaker Repair",
  //     "description": "Circuit breaker keeps tripping after adding wiring for outlets, lights, and sound systems. Reports a burning smell.",
  //     "client_budget": 1000,
  //     "urgency": "Today",
  //     "client_location": "0101000020E6100000700B96EA02475E400ADB4FC6F8682D40"
  //   }
  // }
};

module.exports = { toolManager };
