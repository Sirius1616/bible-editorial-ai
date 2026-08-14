import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

vi.mock("../api", () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({ full_name: "Test", email: "t@test.ai" }),
  },
  projectsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    get: vi.fn(),
  },
  itemsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  workspacesApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe("auth guard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated users from /projects to /login", () => {
    window.history.pushState({}, "", "/projects");
    render(<App />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("renders the projects page when a token exists", async () => {
    localStorage.setItem("token", "test-token");
    window.history.pushState({}, "", "/projects");

    render(<App />);

    expect(await screen.findByText("Your projects")).toBeInTheDocument();
  });

  it("toggles between light and dark themes and persists the choice", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "test-token");
    window.history.pushState({}, "", "/projects");

    render(<App />);

    const toggle = await screen.findByRole("button", { name: "Toggle color theme" });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));

    await user.click(toggle);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(localStorage.getItem("editorial-theme")).toBe("dark");

    await user.click(toggle);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
  });
});
