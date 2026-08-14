export const PROJECT_ROLE_LABELS = {
  admin: "Admin",
  editor: "Editor",
  reviewer: "Reviewer",
  proofreader: "Proofreader",
  viewer: "Viewer",
};

export const canEdit = (role) => role === "admin" || role === "editor";
export const canReview = (role) => role === "admin" || role === "reviewer";
export const canComment = (role) => !!role && role !== "viewer";
export const canExport = (role) => role === "admin" || role === "editor";
export const isAdmin = (role) => role === "admin";
