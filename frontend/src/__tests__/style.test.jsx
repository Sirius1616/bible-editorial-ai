import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";

const mocks = vi.hoisted(() => ({
  project: { id: 1, name: "Sample Study Bible", style_guide: "Plain language." },
  item: {
    id: 10,
    project_id: 1,
    title: "Grace",
    passage: "John 1:14",
    content_type: "study_note",
    status: "draft",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
  },
  version: {
    id: 5,
    content_item_id: 10,
    version_number: 2,
    body: "I think the verse is really great.",
    change_note: "first edit",
    created_at: "2026-08-01T10:00:00Z",
  },
  styleResult: {
    score: 77,
    demo: true,
    issues: [
      { snippet: "I think", reason: "Avoid first-person voice.", severity: "high" },
      { snippet: "really", reason: "Weak intensifier.", severity: "medium" },
    ],
  },
}));

vi.mock("../api", () => ({
  projectsApi: {
    get: vi.fn().mockResolvedValue(mocks.project),
    create: vi.fn(),
    list: vi.fn(),
  },
  itemsApi: {
    get: vi.fn().mockResolvedValue(mocks.item),
    versions: vi.fn().mockResolvedValue([mocks.version]),
    comments: vi.fn().mockResolvedValue([]),
    history: vi.fn().mockResolvedValue([]),
    addVersion: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    diffVersions: vi.fn(),
    generateDraft: vi.fn(),
    styleCheck: vi.fn().mockResolvedValue(mocks.styleResult),
    review: vi.fn(),
    transition: vi.fn(),
    exportItem: vi.fn(),
    list: vi.fn(),
  },
  authApi: {
    me: vi.fn().mockResolvedValue({ full_name: "Test", email: "t@test.ai" }),
  },
}));

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={["/projects/1/items/10"]}>
      <Routes>
        <Route path="/projects/:projectId/items/:itemId" element={<Editor />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Editor style-guide check", () => {
  it("runs a check on the current body and shows score and issues", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /Style check/i }));

    await waitFor(() => {
      expect(itemsApi.styleCheck).toHaveBeenCalledWith("1", "10", "I think the verse is really great.");
    });

    expect(await screen.findByText("77/100")).toBeInTheDocument();
    expect(screen.getByText("Avoid first-person voice.")).toBeInTheDocument();
    expect(screen.getByText("Weak intensifier.")).toBeInTheDocument();
    expect(screen.getByText("“I think”")).toBeInTheDocument();
    expect(screen.getByText("“really”")).toBeInTheDocument();
  });

  it("toggles inline highlights of the flagged snippets", async () => {
    const user = userEvent.setup();

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /Style check/i }));
    await screen.findByText("77/100");

    const mark = document.querySelector(".style-mark.severity-high");
    expect(mark).toBeInTheDocument();
    expect(mark.textContent).toBe("I think");
    expect(document.querySelector(".style-mark.severity-medium").textContent).toBe("really");

    await user.click(screen.getByRole("button", { name: /Hide highlights/i }));
    expect(document.querySelector(".style-mark")).toBeNull();
  });
});
