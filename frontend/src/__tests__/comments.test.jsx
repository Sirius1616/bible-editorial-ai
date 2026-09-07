import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Editor from "../pages/Editor";

const mocks = vi.hoisted(() => ({
  project: { id: 1, name: "Sample Study Bible", style_guide: "", my_role: "admin" },
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
    body: "Grace means unearned favor.",
    change_note: "first edit",
    created_at: "2026-08-01T10:00:00Z",
  },
  comments: [
    {
      id: 1,
      body: "Check the Greek here.",
      anchor_type: "text",
      anchor_start: "0",
      anchor_end: "5",
      anchor_text: "Grace",
      parent_id: null,
      resolved: false,
      created_at: "2026-08-01T10:00:00Z",
    },
    {
      id: 2,
      body: "Verify against the NIV.",
      anchor_type: "verse",
      anchor_start: "John 1:14",
      parent_id: null,
      resolved: false,
      created_at: "2026-08-01T10:01:00Z",
    },
    {
      id: 3,
      body: "Done — matches NIV.",
      anchor_type: null,
      parent_id: 1,
      resolved: false,
      created_at: "2026-08-01T10:05:00Z",
    },
  ],
}));

vi.mock("../api", () => ({
  projectsApi: {
    get: vi.fn().mockResolvedValue(mocks.project),
    create: vi.fn(),
    list: vi.fn(),
    members: vi.fn().mockResolvedValue([]),
  },
  itemsApi: {
    get: vi.fn().mockResolvedValue(mocks.item),
    versions: vi.fn().mockResolvedValue([mocks.version]),
    comments: vi.fn().mockResolvedValue(mocks.comments),
    history: vi.fn().mockResolvedValue([]),
    addVersion: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    diffVersions: vi.fn(),
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

function threadFor(body) {
  return screen.getByText(body).closest(".comment-thread");
}

function getTextarea() {
  return screen.getByPlaceholderText(
    "Write or edit content here. The project style guide will guide AI drafts.",
  );
}

function sendButton() {
  const form = screen.getByPlaceholderText("Add a comment…").closest("form");
  return within(form).getByRole("button");
}

describe("Editor inline / verse-level comments", () => {
  it("renders anchored threads and inline annotation markers", async () => {
    renderEditor();

    expect(await screen.findByRole("heading", { name: "Grace" })).toBeInTheDocument();
    expect(screen.getByText("Check the Greek here.")).toBeInTheDocument();
    expect(screen.getByText("Verify against the NIV.")).toBeInTheDocument();
    expect(screen.getByText("Done — matches NIV.")).toBeInTheDocument();
    expect(screen.getByText("\u201cGrace\u201d")).toBeInTheDocument();
    expect(screen.getAllByText("John 1:14").length).toBeGreaterThan(0);

    const mark = await waitFor(() => document.querySelector('[data-comment-id="1"]'));
    expect(mark).toBeInTheDocument();
    expect(mark.textContent).toBe("Grace");
  });

  it("posts a whole-item comment", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.type(screen.getByPlaceholderText("Add a comment…"), "Whole item note.");
    await user.click(sendButton());

    await waitFor(() => {
      expect(itemsApi.addComment).toHaveBeenCalledWith("1", "10", { body: "Whole item note." });
    });
  });

  it("anchors a comment to selected text", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    itemsApi.comments.mockResolvedValueOnce([
      { ...mocks.comments[1] },
      { ...mocks.comments[2] },
    ]);

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    const textarea = getTextarea();
    textarea.setSelectionRange(0, 5);
    fireEvent.select(textarea);

    await user.click(screen.getByRole("button", { name: "Selected text" }));
    expect(screen.getByText("Anchored to “Grace”")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Add a comment…"), "Fix the tone.");
    await user.click(sendButton());

    await waitFor(() => {
      expect(itemsApi.addComment).toHaveBeenCalledWith("1", "10", {
        body: "Fix the tone.",
        anchor_type: "text",
        anchor_start: "0",
        anchor_end: "5",
        anchor_text: "Grace",
      });
    });
  });

  it("posts a verse-anchored comment", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    await user.click(screen.getByRole("button", { name: "Verse" }));
    await user.type(screen.getByPlaceholderText("Book"), "John");
    await user.type(screen.getByPlaceholderText("Ch."), "1");
    await user.type(screen.getByPlaceholderText("V."), "14");
    await user.type(screen.getByPlaceholderText("Add a comment…"), "Verify against the KJV.");
    await user.click(sendButton());

    await waitFor(() => {
      expect(itemsApi.addComment).toHaveBeenCalledWith("1", "10", {
        body: "Verify against the KJV.",
        anchor_type: "verse",
        anchor_start: "John 1:14",
        anchor_text: "John 1:14",
      });
    });
  });

  it("replies inside a comment thread", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    const thread = threadFor("Check the Greek here.");
    await user.click(within(thread).getByRole("button", { name: "Reply" }));
    await user.type(screen.getByPlaceholderText("Reply…"), "Agreed.");
    const replyForm = screen.getByPlaceholderText("Reply…").closest("form");
    await user.click(within(replyForm).getByRole("button"));

    await waitFor(() => {
      expect(itemsApi.addComment).toHaveBeenCalledWith("1", "10", {
        body: "Agreed.",
        parent_id: 1,
      });
    });
  });

  it("resolves and reopens a thread", async () => {
    const user = userEvent.setup();
    const { itemsApi } = await import("../api");

    renderEditor();
    await screen.findByRole("heading", { name: "Grace" });

    const thread = threadFor("Verify against the NIV.");
    await user.click(within(thread).getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(itemsApi.updateComment).toHaveBeenCalledWith("1", "10", 2, { resolved: true });
    });
  });
});
