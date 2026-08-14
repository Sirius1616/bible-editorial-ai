import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";

const mocks = vi.hoisted(() => ({
  project: { id: 1, name: "Sample Study Bible", style_guide: "" },
  item: {
    id: 10,
    project_id: 1,
    title: "Faith and Works",
    passage: "James 2:14-26",
    content_type: "study_note",
    status: "draft",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
  },
  version: {
    id: 5,
    content_item_id: 10,
    version_number: 2,
    body: "Faith without works is dead.",
    change_note: "first edit",
    created_at: "2026-08-01T10:00:00Z",
  },
  savedVersion: {
    id: 6,
    content_item_id: 10,
    version_number: 3,
    body: "Edited body text.",
    change_note: "Manual edit",
    created_at: "2026-08-01T10:00:00Z",
  },
  laterVersion: {
    id: 7,
    content_item_id: 10,
    version_number: 3,
    body: "Later draft.",
    change_note: "draft two",
    created_at: "2026-08-01T11:00:00Z",
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
    addVersion: vi.fn().mockResolvedValue(mocks.savedVersion),
    deleteVersion: vi.fn().mockResolvedValue(undefined),
    comments: vi.fn().mockResolvedValue([]),
    history: vi.fn().mockResolvedValue([]),
    addComment: vi.fn(),
    generateDraft: vi.fn(),
    review: vi.fn(),
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

describe("Editor save-version happy path", () => {
  it("saves a new version from the textarea", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();

    expect(await screen.findByRole("heading", { name: "Faith and Works" })).toBeInTheDocument();
    expect(screen.getByText("Faith without works is dead.")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(
      "Write or edit content here. The project style guide will guide AI drafts.",
    );
    await user.clear(textarea);
    await user.type(textarea, "Edited body text.");
    await user.click(screen.getByRole("button", { name: /Save new version/i }));

    await waitFor(() => {
      expect(itemsApi.addVersion).toHaveBeenCalledWith("1", "10", {
        body: "Edited body text.",
        change_note: "Manual edit",
        footnotes: [],
        cross_refs: [],
      });
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("deletes a version after confirmation and reloads the list", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    itemsApi.versions
      .mockReset()
      .mockResolvedValueOnce([mocks.version, mocks.laterVersion])
      .mockResolvedValue([mocks.version]);

    renderEditor();
    await screen.findByRole("heading", { name: "Faith and Works" });
    expect(screen.getByText("Later draft.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete version v3" }));

    await waitFor(() => {
      expect(itemsApi.deleteVersion).toHaveBeenCalledWith("1", "10", 7);
    });
    expect(await screen.findByText("Version v3 deleted.")).toBeInTheDocument();
    expect(screen.queryByText("Later draft.")).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
