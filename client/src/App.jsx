import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import About from "./pages/About.jsx";
import Browse from "./pages/Browse.jsx";
import Home from "./pages/Home.jsx";
import NotFound from "./pages/NotFound.jsx";
import Organism from "./pages/Organism.jsx";
import Organisms from "./pages/Organisms.jsx";
import Project from "./pages/Project.jsx";
import Projects from "./pages/Projects.jsx";
import Quality from "./pages/Quality.jsx";
import Sample from "./pages/Sample.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="sample/:accession" element={<Sample />} />
        <Route path="organisms" element={<Organisms />} />
        <Route path="organisms/:slug" element={<Organism />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:accession" element={<Project />} />
        <Route path="quality" element={<Quality />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
