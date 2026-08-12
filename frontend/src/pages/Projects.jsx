import { useEffect, useState } from "react";

export default function Projects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch("/api/v1/projects")
      .then((res) => res.json())
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  return (
    <main>
      <h1>Projects</h1>
      <p>{projects.length === 0 ? "No projects yet." : `Loaded ${projects.length} project(s).`}</p>
    </main>
  );
}
