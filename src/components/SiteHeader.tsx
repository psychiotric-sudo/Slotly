import { Link } from "react-router-dom";

export interface SiteNavLink {
  href: string;
  label: string;
}

interface SiteHeaderProps {
  nav: SiteNavLink[];
  /** Where the wordmark points — an in-page anchor on the landing, "/" elsewhere. */
  homeHref?: string;
  issue?: string;
}

/**
 * The N6 newspaper masthead. Shared by the landing page and the document
 * pages (privacy, terms, contact) so the chrome stays in one place.
 */
export default function SiteHeader({
  nav,
  homeHref = "#top",
  issue = "The weekly planner · No. 1",
}: SiteHeaderProps) {
  return (
    <header className="lp-masthead">
      <div className="lp-wrap">
        <div className="lp-masthead__inner">
          <p className="lp-masthead__issue">{issue}</p>
          <a className="lp-masthead__wordmark" href={homeHref} aria-label="Slotly, back to top">
            Slotly
          </a>
          <p className="lp-masthead__tagline">
            For the term that doesn&rsquo;t fit the usual shape
          </p>
          <nav className="lp-masthead__nav" aria-label="Page sections">
            {nav.map((link) => (
              <a className="lp-masthead__link" href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
            <Link className="lp-btn lp-masthead__cta" to="/app">
              Open the planner
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
