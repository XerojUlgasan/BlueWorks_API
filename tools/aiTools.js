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

const toolNames = ["update_context", "create_job_request"];

const toolExplanation = {
  update_context: `Updates the conversation context. Only include the fields you want to change.`,
  create_job_request: `Creates a job request only, without sending to candidates. Use this when the customer wants to save a draft or confirm before sending. `,
};

module.exports = {
  toolNames,
  actions,
  structuredReturn,
  toolExplanation,
};
