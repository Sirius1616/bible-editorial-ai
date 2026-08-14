import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProjectDetail from "../pages/ProjectDetail";

const mocks = vi.hoisted(() => ({
  project: {
    id: 1,
    name: "Sample Study Bible",
    description: "Demo",
    translation: "ESV",
    style_guide: "",
    owner_id: 1,
    workspace_id: 1,
    workspace_name: "My Workspace",
    member_count: 2,
    my_role: "admin",
  },
  members: [
    { id: 1, user_id: 1, role: "admin", email: "alice@test.ai", full_name: "Alice Admin" },
    { id: 2, user_id: 2, role: "reviewer", email: "bob@test.ai", full_name: "Bob Reviewer" },
  ],
  workspaceMembers: [
    { user_id: 1, email: "alice@test.ai", full_name: "Alice Admin" },
    { user_id: 2, email: "bob@test.ai", full_name: "Bob Reviewer" },
    { user_id: 3, email: "carol@test.ai", full_name: "Carol Proof" },
  ],
  items: [],
}));

vi.mock("../api", () => ({
  projectsApi: {
    get: vi.fn().mockResolvedValue(mocks.project),
    list: vi.fn(),
    create: vi.fn(),
    members: vi.fn().mockResolvedValue(mocks.members),
    addMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
  },
  itemsApi: {
    list: vi.fn().mockResolvedValue(mocks.items),
  },
  workspacesApi: {
    get: vi.fn().mockResolvedValue({ members: mocks.workspaceMembers }),
  },
  authApi: {
    me: vi.fn().mockResolvedValue({ full_name: "Alice", email: "alice@test.ai" }),
  },
}));

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/projects/1"]}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProjectDetail members management", () => {
  it("lists project members with role controls for admins", async () => {
    renderDetail();

    expect(await screen.findByText("Project members")).toBeInTheDocument();
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("Bob Reviewer")).toBeInTheDocument();
    expect(screen.getByLabelText("Role of Alice Admin")).toHaveValue("admin");
    expect(screen.getByLabelText("Role of Bob Reviewer")).toHaveValue("reviewer");
  });

  it("adds a workspace member to the project", async () => {
    const user = userEvent.setup();
    const { projectsApi } = await import("../api");

    renderDetail();
    await screen.findByText("Project members");

    await user.click(screen.getByRole("button", { name: /Add member/i }));
    await user.selectOptions(screen.getByLabelText("Workspace member"), "3");
    await user.click(screen.getByRole("button", { name: /Add to project/i }));

    await waitFor(() => {
      expect(projectsApi.addMember).toHaveBeenCalledWith("1", 3, "editor");
    });
  });

  it("changes a member's role", async () => {
    const user = userEvent.setup();
    const { projectsApi } = await import("../api");

    renderDetail();
    await screen.findByText("Project members");

    await user.selectOptions(screen.getByLabelText("Role of Bob Reviewer"), "proofreader");

    await waitFor(() => {
      expect(projectsApi.updateMember).toHaveBeenCalledWith("1", 2, "proofreader");
    });
  });

  it("removes a member after confirmation", async () => {
    const user = userEvent.setup();
    const { projectsApi } = await import("../api");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderDetail();
    await screen.findByText("Project members");

    await user.click(screen.getAllByTitle("Remove member")[1]);

    await waitFor(() => {
      expect(projectsApi.removeMember).toHaveBeenCalledWith("1", 2);
    });
    confirmSpy.mockRestore();
  });
});

describe("ProjectDetail read-only for viewers", () => {
  it("hides creation and member management for viewers", async () => {
    const { projectsApi } = await import("../api");
    projectsApi.get.mockResolvedValueOnce({ ...mocks.project, my_role: "viewer" });

    renderDetail();

    expect(await screen.findByRole("heading", { name: "Sample Study Bible" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New item/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Project members")).not.toBeInTheDocument();
  });
});
