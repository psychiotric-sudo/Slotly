import { Link, useLocation } from "react-router-dom";

const PAGES = [
  { to: "/privacy", label: "Privacy policy" },
  { to: "/terms", label: "Terms & conditions" },
  { to: "/contact", label: "Contact" },
];

/**
 * The Ft4 dense typographic colophon. Shared by the landing page and the
 * document pages so credits and the site-information links live in one place.
 * The in-page section nav lives in the masthead, so it is not repeated here,
 * and the current document is marked rather than linked to itself.
 */
export default function SiteFooter() {
  const { pathname } = useLocation();
  return (
    <footer className="lp-colophon">
      <div className="lp-wrap">
        <div className="lp-colophon__grid">
          <div className="lp-colophon__col">
            <span className="lp-colophon__brand">Slotly</span>
            <p>
              A free, browser-only timetable builder for a term that does not
              fit the usual shape.
            </p>
          </div>
          <div className="lp-colophon__col">
            <h2>Information</h2>
            <ul>
              {PAGES.map((p) =>
                p.to === pathname ? (
                  <li key={p.to}>
                    <span aria-current="page">{p.label}</span>
                  </li>
                ) : (
                  <li key={p.to}>
                    <Link to={p.to}>{p.label}</Link>
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="lp-colophon__col">
            <h2>Photographs</h2>
            <p>
              Alexandra Road campus, c. 1890s — Swansea Metropolitan
              University archive (CC BY-SA 3.0).
            </p>
            <p>
              Ohio University lecture hall — Garden Sprite (CC0). Sias
              University library, 2017 — Gary Todd (CC0).
            </p>
          </div>
          <div className="lp-colophon__col">
            <h2>Type &amp; build</h2>
            <p>
              Set in Fraunces and Newsreader. Built with React and Vite.
              Timetables rendered and exported entirely in the browser.
            </p>
          </div>
        </div>
        <div className="lp-colophon__fine">
          <span>© 2026 Slotly. Made for whoever is holding the mess.</span>
          <span>
            Built by{" "}
            <a href="https://t.me/drnx64" target="_blank" rel="noopener noreferrer">
              @drnx64
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
