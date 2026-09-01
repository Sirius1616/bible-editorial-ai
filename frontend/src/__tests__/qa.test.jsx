import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";

const mocks = vi.hoisted(() => ({
  project: { id: 1, name: "Sample Study Bible", style_guide: "", my_role: "admin" },
  item: {
    id: 10,
    project_id: 1,
    title: "Grace",
    passage: "John 3:16-17",
    content_type: "study_note",
    status: "draft",
    verse_start: { book: "John", chapter: 3, verse: 16 },
    verse_end: { book: "John", chapter: 3, verse: 17 },
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
  },
  version: {
    id: 5,
    content_item_id: 10,
    version_number: 1,
    body: "The writer says \"God so loved the wolrd\" - the invitation stands.",
    change_note: "first edit",
    footnotes: [],
    cross_refs: [],
    created_at: "2026-08-01T10:00:00Z",
  },
  qaResult: {
    reference: "John 3:16-17",
    score: 62,
    demo: true,
    issues: [
      {
        snippet: "God so loved the wolrd",
        reference: "John 3:16-17",
        expected: "God so loved the world",
        actual: "God so loved the wolrd",
        reason: "Quoted text differs from John 3:16-17 (88% word match).",
        severity: "medium",
      },
    ],
  },
}));

vi.mock("../api", () => ({
  projectsApi: {
    get: vi.fn().mockResolvedValue(mocks.project),
    create: vi.fn(),
    members: vi.fn().mockResolvedValue([]),
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
    styleCheck: vi.fn(),
    qaCheck: vi.fn().mockResolvedValue(mocks.qaResult),
    consistencyCheck: vi.fn(),
    review: vi.fn(),
    transition: vi.fn(),
    exportItem: vi.fn(),
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

describe("Editor Scripture QA check", () => {
  it("runs the QA check and shows expected vs actual", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /QA check/i }));

    await waitFor(() => {
      expect(itemsApi.qaCheck).toHaveBeenCalledWith("1", "10", mocks.version.body);
    });

    expect((await screen.findAllByText("John 3:16-17")).length).toBeGreaterThan(0);
    expect(screen.getByText("62/100")).toBeInTheDocument();
    expect(screen.getByText(/Quoted text differs from John 3:16-17/)).toBeInTheDocument();

    await user.click(screen.getByText(/Expected vs quoted/i));
    const panel = within(document.querySelector("#qa-panel"));
    expect(panel.getAllByText(/God so loved the world/).length).toBeGreaterThan(0);
    expect(panel.getAllByText(/God so loved the wolrd/).length).toBeGreaterThan(0);
  });
});