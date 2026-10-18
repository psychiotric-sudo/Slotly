import type { ReactNode } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import "./Landing.css";
import "./Legal.css";

const NAV = [
  { href: "/#grid", label: "The grid" },
  { href: "/#clashes", label: "Clashes" },
  { href: "/#carry", label: "Export" },
  { href: "/#faq", label: "Questions" },
];

interface LegalLayoutProps {
  kicker: string;
  title: string;
  updated: string;
  lede: string;
  children: ReactNode;
}

/**
 * Shared shell for the document pages. Wraps content in the editorial
 * `.landing` base (paper, body type, page entrance) and reuses the landing
 * masthead and colophon, so all four public pages share one set of chrome.
 * Document-to-document links live once, in the footer's Information column.
 */
export default function LegalLayout({
  kicker,
  title,
  updated,
  lede,
  children,
}: LegalLayoutProps) {
  return (
    <div className="landing legal">
      <SiteHeader nav={NAV} homeHref="/" issue="Slotly · Site information" />
      <main className="legal__main">
        <div className="lp-wrap">
          <header className="legal__head">
            <p className="legal__kicker">{kicker}</p>
            <h1 className="lp-display legal__title">{title}</h1>
            <p className="legal__meta">Last updated {updated}</p>
          </header>
          <div className="legal__body">
            <p className="legal__lede">{lede}</p>
            <div className="legal__prose">{children}</div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
