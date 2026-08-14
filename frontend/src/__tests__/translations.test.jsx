import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";

const mocks = vi.hoisted(() => ({
  project: { id: 1, name: "Sample Study Bible", style_guide: "Plain language.", my_role: "admin" },
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
    version_number: 2,
    body: "Grace means unearned favor.",
    change_note: "first edit",
    created_at: "2026-08-01T10:00:00Z",
  },
  translations: {
    reference: "John 3:16-17",
    demo: true,
    note: "Demo data — KJV and WEB are public domain.",
    translations: [
      { name: "KJV", text: "For God so loved the world", available: true, demo: true },
      { name: "WEB", text: "For God so loved the world", available: true, demo: true },
      { name: "ESV", text: null, available: false, demo: true },
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
    styleCheck: vi.fn(),
    translations: vi.fn().mockResolvedValue(mocks.translations),
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

function getTextarea() {
  return screen.getByPlaceholderText(
    "Write or edit content here. The project style guide will guide AI drafts.",
  );
}

function getPanel() {
  return within(document.getElementById("translations-panel"));
}

describe("Editor translation comparison sidebar", () => {
  it("loads and renders the comparison when toggled on", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /Translations/i }));

    await waitFor(() => {
      expect(itemsApi.translations).toHaveBeenCalledWith("1", "10");
    });
    const panel = getPanel();
    expect(await panel.findByText("John 3:16-17")).toBeInTheDocument();
    expect(panel.getAllByText("For God so loved the world").length).toBeGreaterThanOrEqual(2);
    expect(panel.getByText("Demo data — KJV and WEB are public domain.")).toBeInTheDocument();
    expect(panel.getByText("Requires BIBLE_API_KEY.")).toBeInTheDocument();
  });

  it("toggles the sidebar closed again", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /Translations/i }));
    await getPanel().findByText("John 3:16-17");

    await user.click(screen.getByRole("button", { name: /Hide translations/i }));
    expect(
      screen.getByText(/Compare this passage across translations/),
    ).toBeInTheDocument();
    expect(screen.queryByText("For God so loved the world")).not.toBeInTheDocument();
  });

  it("inserts a quote from a translation at the cursor", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /Translations/i }));
    const panel = getPanel();
    await panel.findByText("John 3:16-17");

    const textarea = getTextarea();
    textarea.setSelectionRange(6, 6);
    await user.click(panel.getAllByRole("button", { name: /Insert quote/i })[0]);

    expect(textarea.value).toContain(
      "“For God so loved the world” (KJV, John 3:16-17)",
    );
    expect(screen.getByText("Quote inserted from KJV.")).toBeInTheDocument();
  });

  it("shows the anchored error message when the item has no verse anchor", async () => {
    const { itemsApi } = await import("../api");
    mocks.translationsError = new Error("Anchor this item to a passage before comparing translations.");
    itemsApi.translations.mockRejectedValueOnce(mocks.translationsError);
    const user = userEvent.setup();

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: /Translations/i }));

    expect(
      await screen.findByText(
        "Anchor this item to a passage before comparing translations.",
      ),
    ).toBeInTheDocument();
  });
});
