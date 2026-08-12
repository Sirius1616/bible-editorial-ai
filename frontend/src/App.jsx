import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Editor from "./pages/Editor";
import Login from "./pages/Login";
import Projects from "./pages/Projects";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Projects</Link> | <Link to="/editor">Editor</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}
