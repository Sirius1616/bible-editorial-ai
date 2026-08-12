import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Projects from "../pages/Projects";

const mocks = vi.hoisted(() => ({
  projects: [
    { id: 1, name: "Sample Study Bible", description: "A demo project", translation: "ESV" },
    { id: 2, name: "Devotional Series", description: "", translation: "NIV" },
  ],
  items: [
    { id: 1, status: "approved" },
    { id: 2, status: "draft" },
    { id: 3, status: "rejected" },
  ],
}));

vi.mock("../api", () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue(mocks.projects),
    create: vi.fn(),
    get: vi.fn(),
  },
  itemsApi: {
    list: vi.fn((id) =>
      Promise.resolve(id === 1 ? mocks.items : []),
    ),
  },
  authApi: {
    me: vi.fn().mockResolvedValue({ full_name: "Test", email: "t@test.ai" }),
  },
}));

describe("Projects page", () => {
  it("lists projects with their approval stats", async () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Projects />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Sample Study Bible")).toBeInTheDocument();
    expect(screen.getByText("Devotional Series")).toBeInTheDocument();
    expect(screen.getByText("1 approved")).toBeInTheDocument();
    expect(screen.getByText("1 rejected")).toBeInTheDocument();
    expect(screen.getByText("33% approved")).toBeInTheDocument();
  });

  it("creates a project from the form", async () => {
    const user = userEvent.setup();
    const { projectsApi } = await import("../api");

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Projects />
      </MemoryRouter>,
    );

    await screen.findByText("Sample Study Bible");
    await user.click(screen.getByText("New project"));

    await user.type(screen.getByLabelText("Project name"), "New Editorial Project");
    await user.click(screen.getByRole("button", { name: /Create project/i }));

    await waitFor(() => {
      expect(projectsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Editorial Project" }),
      );
    });
  });
});
