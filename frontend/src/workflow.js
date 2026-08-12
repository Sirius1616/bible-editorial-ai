export const STATUS_LABELS = {
  assigned: "Assigned",
  in_progress: "In progress",
  in_review: "In review",
  qa: "QA",
  ready: "Ready",
  archived: "Archived",
};

export const STATUS_BADGE = {
  assigned: "badge-neutral",
  in_progress: "badge-draft",
  in_review: "badge-type",
  qa: "badge-qa",
  ready: "badge-approved",
  archived: "badge-rejected",
};

export const STATUS_ORDER = {
  assigned: 0,
  in_progress: 1,
  in_review: 2,
  qa: 3,
  ready: 4,
  archived: 5,
};

export const ALLOWED_TRANSITIONS = {
  assigned: ["in_progress", "archived"],
  in_progress: ["assigned", "in_review", "archived"],
  in_review: ["in_progress", "qa", "ready", "archived"],
  qa: ["in_review", "ready", "archived"],
  ready: ["in_review", "archived"],
  archived: ["assigned"],
};
