const supabaseAdmin = require("../libs/supabaseAdmin");

const searchWorker = () => {};
const checkWorkerAvailability = () => {};
const createWorkerBooking = (workerId, clientId) => {};
const viewSchedule = (dateFrom, dateTo, workerId) => {};

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

const toolNames = [
  "show_candidates",
  "update_context",
  "send_job_requests",
  "get_customer_location",
];

const actions = ["ASK_QUESTION", "CALL_TOOL", "COMPLETE"];

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

const toolExplanation = {
  show_candidates: `Shows the customer the current candidates for the job based on the context. here's the context table create table public.conversation_context (
                  id uuid not null,
                  created_at timestamp with time zone not null default now(),
                  extras json null,
                  job_type character varying null,
                  job_category character varying null,
                  required_skills character varying[] null,
                  client_location geography null,
                  client_budget smallint null,
                  urgency character varying null,
                  candidate_limit smallint null,
                  ready_for_submission boolean null default false,
                  missing_fields character varying[] null,
                  "preferByNearest" boolean null,
                  "preferByRating" boolean null,
                  constraint conversation_context_pkey primary key (id),
                  constraint conversation_context_id_fkey foreign KEY (id) references bot_conversation (id) on delete CASCADE
                ) TABLESPACE pg_default;`,
  update_context: `updates the context table. only put a value on the column that you want to change.`,
  send_job_requests: `sends the job requests to the workers. requires the context table columns are required to be filled in the context table.`,
  get_customer_location: `requests the frontend to get the customer location or to where the service is going to be done.`,
};

module.exports = {
  toolNames,
  actions,
  structuredReturn,
  toolExplanation,
};
