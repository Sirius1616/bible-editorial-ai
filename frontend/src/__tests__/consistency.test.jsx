import { render, screen, waitFor } from "@testing-library/react";
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
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
  },
  version: {
    id: 5,
    content_item_id: 10,
    version_number: 1,
    body: "Jesus is the way. jesus is the truth.",
    change_note: "first edit",
    footnotes: [],
    cross_refs: ["John 3:16", "Zzz 1:1"],
    created_at: "2026-08-01T10:00:00Z",
  },
  consistencyResult: {
    score: 66,
    references_checked: 2,
    demo: true,
    ref_issues: [
      { reference: "Zzz 1:1", reason: "Reference does not match a Bible book (e.g. 'John 3:16').", severity: "high" },
    ],
    term_issues: [
      {
        term: "Jesus",
        count: 2,
        variants: ["Jesus", "jesus"],
        reason: "Jesus is used with inconsistent forms (Jesus, jesus).",
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
    qaCheck: vi.fn(),
    consistencyCheck: vi.fn().mockResolvedValue(mocks.consistencyResult),
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

describe("Editor cross-reference & terminology consistency", () => {
  it("runs the check and shows broken refs and term drift", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /References/i }));

    await waitFor(() => {
      expect(itemsApi.consistencyCheck).toHaveBeenCalledWith("1", "10", {
        body: mocks.version.body,
      });
    });

    expect(await screen.findByText("66/100")).toBeInTheDocument();
    expect(screen.getByText(/2 reference/)).toBeInTheDocument();
    expect(screen.getByText("Zzz 1:1")).toBeInTheDocument();
    expect(screen.getByText(/Reference does not match a Bible book/)).toBeInTheDocument();
    expect(screen.getByText("Broken cross-references")).toBeInTheDocument();
    expect(screen.getByText("Terminology drift")).toBeInTheDocument();
    expect(screen.getAllByText(/Jesus, jesus/).length).toBeGreaterThan(0);
  });
});