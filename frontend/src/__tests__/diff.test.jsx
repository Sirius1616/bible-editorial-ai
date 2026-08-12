import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";

const mocks = vi.hoisted(() => ({
  project: { id: 1, name: "Sample Study Bible", style_guide: "" },
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
  versions: [
    {
      id: 5,
      content_item_id: 10,
      version_number: 2,
      body: "God so loved the world.",
      change_note: "first edit",
      created_at: "2026-08-01T10:00:00Z",
    },
    {
      id: 6,
      content_item_id: 10,
      version_number: 3,
      body: "God so loved the entire world.",
      change_note: "second edit",
      created_at: "2026-08-01T11:00:00Z",
    },
  ],
  diff: {
    from_version: 2,
    to_version: 3,
    word_diff: [
      { op: "equal", text: "God so loved the" },
      { op: "insert", text: "entire" },
      { op: "equal", text: "world." },
    ],
    line_diff: [],
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
    versions: vi.fn().mockResolvedValue(mocks.versions),
    diffVersions: vi.fn().mockResolvedValue(mocks.diff),
    addVersion: vi.fn(),
    comments: vi.fn().mockResolvedValue([]),
    history: vi.fn().mockResolvedValue([]),
    addComment: vi.fn(),
    generateDraft: vi.fn(),
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

describe("Editor version diff", () => {
  it("highlights additions and removals between versions", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    expect(await screen.findByRole("heading", { name: "Grace" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Compare/i }));
    await user.click(screen.getByRole("button", { name: /Show diff/i }));

    await waitFor(() => {
      expect(itemsApi.diffVersions).toHaveBeenCalledWith("1", "10", 2, 3);
    });

    const add = await screen.findByText("entire");
    expect(add.className).toContain("diff-add");
    expect(screen.getByText("v2 → v3")).toBeInTheDocument();
  });
});
