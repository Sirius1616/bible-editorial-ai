import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WorkspaceSettings from "../pages/WorkspaceSettings";
import Invite from "../pages/Invite";

const workspace = vi.hoisted(() => ({
  detail: {
    id: 1,
    name: "Grace Publishers",
    owner_id: 10,
    member_count: 2,
    my_role: "owner",
    members: [
      { id: 1, user_id: 10, role: "owner", email: "owner@publisher.org", full_name: "Ada Owner", created_at: "2026-01-01T00:00:00Z" },
      { id: 2, user_id: 11, role: "member", email: "edit@acme.org", full_name: "Beth Editor", created_at: "2026-01-01T00:00:00Z" },
    ],
  },
  invite: {
    id: 1,
    workspace_id: 1,
    email: "new@acme.org",
    role: "member",
    token: "abc123",
    join_url: "/invite/abc123",
    created_at: "2026-01-01T00:00:00Z",
    expires_at: null,
    accepted_at: null,
  },
}));

vi.mock("../api", () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({ full_name: "Ada Owner", email: "owner@publisher.org" }),
  },
  workspacesApi: {
    get: vi.fn().mockResolvedValue(workspace.detail),
    listInvites: vi.fn().mockResolvedValue([workspace.invite]),
    createInvite: vi.fn().mockResolvedValue(workspace.invite),
    revokeInvite: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
    transfer: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
  },
  invitesApi: {
    info: vi.fn().mockResolvedValue({
      workspace_name: "Grace Publishers",
      email: "new@acme.org",
      role: "member",
    }),
    accept: vi.fn().mockResolvedValue({ id: 1 }),
    register: vi.fn(),
  },
}));

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={["/workspaces/1"]}>
      <Routes>
        <Route path="/workspaces/:workspaceId" element={<WorkspaceSettings />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderInvite() {
  return render(
    <MemoryRouter initialEntries={["/invite/abc123"]}>
      <Routes>
        <Route path="/invite/:token" element={<Invite />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WorkspaceSettings", () => {
  it("renders members, pending invites and transfer for the owner", async () => {
    renderSettings();

    expect(await screen.findByText("Grace Publishers")).toBeInTheDocument();
    expect(screen.getAllByText("Ada Owner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beth Editor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("owner@publisher.org").length).toBeGreaterThan(0);
    expect(screen.getByText(/new@acme.org/)).toBeInTheDocument();
    expect(screen.getByLabelText("Transfer ownership to")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete workspace/i })).toBeInTheDocument();
  });

  it("creates an invite from the form", async () => {
    const user = userEvent.setup();
    const { workspacesApi } = await import("../api");
    renderSettings();

    await screen.findByText("Grace Publishers");
    await user.type(screen.getByLabelText("Email address"), "mike@acme.org");
    await user.selectOptions(screen.getByLabelText("Role"), "admin");
    await user.click(screen.getByRole("button", { name: /Create invite/i }));

    await waitFor(() => {
      expect(workspacesApi.createInvite).toHaveBeenCalledWith(1, "mike@acme.org", "admin");
    });
  });

  it("hides management controls for a plain member", async () => {
    const { workspacesApi } = await import("../api");
    workspacesApi.get.mockResolvedValueOnce({
      ...workspace.detail,
      my_role: "member",
    });
    workspacesApi.listInvites.mockResolvedValueOnce([]);

    renderSettings();

    await screen.findByText("Grace Publishers");
    expect(screen.queryByLabelText("Transfer ownership to")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete workspace/i })).not.toBeInTheDocument();
  });
});

describe("Invite page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("accepts an invitation when logged in", async () => {
    localStorage.setItem("token", "test-token");
    const user = userEvent.setup();
    const { invitesApi } = await import("../api");

    renderInvite();

    expect(await screen.findByText("Grace Publishers")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Accept invitation/i }));
    await waitFor(() => {
      expect(invitesApi.accept).toHaveBeenCalledWith("abc123");
    });
  });

  it("shows the register form when not logged in", async () => {
    renderInvite();

    expect(await screen.findByText("Grace Publishers")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("new@acme.org");
    expect(screen.getByRole("button", { name: /Create account and join/i })).toBeInTheDocument();
  });
});
