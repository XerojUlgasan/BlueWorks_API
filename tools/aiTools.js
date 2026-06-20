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

const toolNames = ["update_context", "send_job_requests"];

const toolExplanation = {
  update_context: `updates the context table. only put a value on the column that you want to change.`,
  send_job_requests: `sends the job requests to the workers. requires the context table columns are required to be filled in the context table.`,
};

module.exports = {
  toolNames,
  actions,
  structuredReturn,
  toolExplanation,
};
