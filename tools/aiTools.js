const supabaseAdmin = require("../libs/supabaseAdmin");

const submitJobRequests = (
  category,
  job_type,
  description,
  budget,
  urgency,
  location,
  client_id,
  candidate_worker_id_arr,
) => {};

const findCandidateWorkers = (
  job_category,
  job_type,
  required_skills,
  client_location, // long, lat, radius
  client_budget,
  urgency,
  candidate_limit,
  byNearest,
  byRatings,
) => {};

const structuredReturn = {
  action: [""],
  message: "",
  missing_fields: [],
  tool: [
    {
      name: "",
      arguments: {},
    },
  ],
  ready_for_submission: false,
  confidence: {},
};

const actions = [
  "ASK_QUESTION",
  "SHOW_CANDIDATES",
  "GET_CUSTOMER_LOCATION",
  "CALL_TOOL",
  "COMPLETE",
];

const toolNames = [
  "update_context",
  "create_and_send_job_requests",
  "create_job_request",
  "update_job_request",
  "delete_job_request",
  "send_job_request",
];

const toolExplanation = {
  update_context: `updates the context table. only put a value on the column that you want to change.`,
  create_and_send_job_requests: `creates and sends the job requests to the workers. requires the context table columns are required to be filled in the context table. STRICTLY only call this if job_id is null in context.`,
  create_job_request: `Creates only a job request`,
  update_job_request: `Updates a job request`,
  delete_job_request: `Deletes a job request`,
  send_job_request: `sends the job request to the candidates. requires job_id in context, otherwise, suggest create and send or create only.`,
};

module.exports = {
  toolNames,
  actions,
  structuredReturn,
  toolExplanation,
};
