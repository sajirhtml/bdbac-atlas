import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="section">
      <h1>Page not found</h1>
      <p className="lede">That address doesn't match anything here. Try the <Link to="/browse">sample browser</Link> or the <Link to="/organisms">organism list</Link>.</p>
    </section>
  );
}
