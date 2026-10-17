import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import "./Landing.css";

const FEATURES = [
  {
    id: "drag",
    span: 4,
    tag: "Editing",
    tagTone: "blue",
    title: "Drag to move, drag edges to resize",
    body: "Grab a class block and drop it anywhere on the grid. Stretch its edge to make it longer — it snaps to your slot size.",
    visual: "drag",
  },
  {
    id: "clash",
    span: 2,
    tag: "Conflicts",
    tagTone: "red",
    title: "Clashes, caught early",
    body: "Two classes in the same slot get flagged with the exact overlap time.",
    visual: "clash",
  },
  {
    id: "import",
    span: 2,
    tag: "Import",
    tagTone: "green",
    title: "Import in seconds",
    body: "Paste a Gemini export or drop a .ics file from Google Calendar. Merge or replace — you choose.",
    visual: "import",
  },
  {
    id: "export",
    span: 2,
    tag: "Export",
    tagTone: "yellow",
    title: "Take it anywhere",
    body: "JPG for the group chat, PDF for printing, .ics for Google Calendar.",
    visual: "export",
  },
  {
    id: "teacher",
    span: 2,
    tag: "Teacher mode",
    tagTone: "blue",
    title: "One tab per section",
    body: "Keep a schedule for every section you teach and switch with a click.",
    visual: "tabs",
  },
  {
    id: "offline",
    span: 6,
    tag: "Privacy",
    tagTone: "green",
    title: "Your schedule never leaves your device",
    body: "Everything is stored in your browser. No account, no sign-in, no server holding your timetable. Download a JSON backup whenever you want a copy.",
    visual: "offline",
  },
] as const;

const FAQ = [
  {
    q: "Is Slotly free?",
    a: "Yes — every feature, with no paid tier and no trial. The planner runs entirely in your browser.",
  },
  {
    q: "Do I need an account?",
    a: "No. There is no sign-up and no sign-in. Open the planner and start adding classes.",
  },
  {
    q: "Where is my data stored?",
    a: "In your browser's local storage, on your device. Nothing is uploaded. Use Download backup to keep a JSON copy you can restore later — even on another device.",
  },
  {
    q: "Can I import my Google Calendar?",
    a: "Yes. Export a .ics file from Google Calendar and import it here — weekly recurring events become class blocks on the grid. You can also send your finished schedule back to Google Calendar.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. The grid pinch-zooms, the quick-actions button covers add, import, and export, and a Fit all days setting squeezes the whole week onto a small screen.",
  },
  {
    q: "I teach several sections — can I keep them separate?",
    a: "Turn on Teacher mode in Settings. A tab bar appears above the timetable: one tab per section, each with its own classes and breaks. The active tab's name prints on exports.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Add your classes",
    body: "Type in a course, or pull an entire week in from Gemini or a Google Calendar file.",
  },
  {
    n: "2",
    title: "Arrange until it fits",
    body: "Drag blocks around until the week works.",
    kbd: ["Ctrl", "Z", "Ctrl", "Shift", "Z"],
    kbdNote: "Undo and redo anything.",
  },
  {
    n: "3",
    title: "Take it with you",
    body: "Export a JPG or PDF, print it, or sync the whole schedule to Google Calendar.",
  },
];

/** Reveal-on-scroll for every [data-reveal] element inside the landing page. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return ref;
}

function ShotGrid() {
  return (
    <div
      className="shot"
      role="img"
      aria-label="The Slotly planner: a weekly timetable with class blocks, a lunch break, and a flagged clash"
    >
      <div className="shot-chrome" aria-hidden="true">
        <span className="shot-dot" />
        <span className="shot-dot" />
        <span className="shot-dot" />
        <span className="shot-chrome-title">Slotly — Fall semester</span>
      </div>
      <div className="shot-scroll" aria-hidden="true">
        <div className="shot-grid">
          <div className="shot-layer shot-cells">
            <div className="shot-head shot-corner" />
            <div className="shot-head">Mon</div>
            <div className="shot-head">Tue</div>
            <div className="shot-head">Wed</div>
            <div className="shot-head">Thu</div>
            <div className="shot-head">Fri</div>

            <div className="shot-time">9:00</div>
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />

            <div className="shot-time">10:00</div>
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />

            <div className="shot-time">11:00</div>
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />

            <div className="shot-time">12:00</div>
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />

            <div className="shot-time">1:00</div>
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
            <div className="shot-cell" />
          </div>
          <div className="shot-layer shot-blocks">
            <div
              className="shot-block blue"
              style={{ gridColumn: 2, gridRow: "2 / span 2" }}
            >
              <strong>CS 301</strong>
              <span>Operating Systems · B-204</span>
            </div>
            <div
              className="shot-block green"
              style={{ gridColumn: 2, gridRow: 4 }}
            >
              <strong>MATH 214</strong>
              <span>Linear Algebra</span>
            </div>
            <div
              className="shot-block yellow clash"
              style={{ gridColumn: 3, gridRow: "3 / span 2" }}
            >
              <strong>ENG 105</strong>
              <span>Academic Writing</span>
              <em>overlap 10:30–11:00</em>
            </div>
            <div
              className="shot-block blue"
              style={{ gridColumn: 4, gridRow: "2 / span 2" }}
            >
              <strong>CS 301</strong>
              <span>Lab · B-210</span>
            </div>
            <div
              className="shot-block green"
              style={{ gridColumn: 5, gridRow: 6 }}
            >
              <strong>PHYS 112</strong>
              <span>Mechanics</span>
            </div>
            <div
              className="shot-block red"
              style={{ gridColumn: 6, gridRow: "2 / span 2" }}
            >
              <strong>HIST 201</strong>
              <span>Modern Europe</span>
            </div>
            <div
              className="shot-break"
              style={{ gridColumn: "2 / span 5", gridRow: 5 }}
            >
              LUNCH · 12:30 – 1:30
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ kind }: { kind: string }) {
  if (kind === "drag") {
    return (
      <div className="fv-drag" aria-hidden="true">
        <span className="fv-block ghost">CS 301</span>
        <span className="fv-arrow">→</span>
        <span className="fv-block blue">CS 301</span>
        <span className="fv-block dashed">10:30 – 12:00</span>
      </div>
    );
  }
  if (kind === "clash") {
    return (
      <div className="fv-clash" aria-hidden="true">
        <span className="fv-block yellow">ENG 105</span>
        <span className="fv-block red offset">HIST 201</span>
        <span className="fv-badge">overlap 30 min</span>
      </div>
    );
  }
  if (kind === "import") {
    return (
      <div className="fv-stack" aria-hidden="true">
        <span className="fv-line">gemini-export.txt</span>
        <span className="fv-line">schedule.ics</span>
        <span className="fv-line">schedule-backup.json</span>
      </div>
    );
  }
  if (kind === "export") {
    return (
      <div className="fv-chips" aria-hidden="true">
        <span className="fv-chip">JPG</span>
        <span className="fv-chip">PDF</span>
        <span className="fv-chip">.ics</span>
        <span className="fv-chip">Print</span>
      </div>
    );
  }
  if (kind === "tabs") {
    return (
      <div className="fv-tabs" aria-hidden="true">
        <span className="fv-tab active">Section A</span>
        <span className="fv-tab">Section B</span>
        <span className="fv-tab">Section C</span>
      </div>
    );
  }
  return (
    <div className="fv-offline" aria-hidden="true">
      <span className="fv-dot-row">
        <span className="fv-dot" />
        <span className="fv-dot" />
        <span className="fv-dot" />
      </span>
      <span className="fv-offline-label">localStorage · your device only</span>
    </div>
  );
}

export default function Landing() {
  usePageMeta(
    "Slotly — The timetable builder for college.",
    "index, follow"
  );

  // The marketing page is always editorial light; App re-applies the stored
  // theme for the html element when the planner mounts.
  useEffect(() => {
    const prev = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = "light";
    return () => {
      if (prev !== undefined) document.documentElement.dataset.theme = prev;
    };
  }, []);

  const rootRef = useReveal();

  return (
    <div className="landing" ref={rootRef}>
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <a className="lp-brand" href="#top" aria-label="Slotly home">
            <svg viewBox="0 0 32 32" aria-hidden="true" width="22" height="22">
              <rect x="2" y="6" width="28" height="24" rx="5" fill="#FDE68A" />
              <rect x="2" y="14" width="28" height="3" fill="#78350F" opacity="0.18" />
              <circle cx="10" cy="21" r="2" fill="#78350F" />
              <circle cx="16" cy="21" r="2" fill="#78350F" />
              <circle cx="22" cy="21" r="2" fill="#78350F" />
              <rect x="7" y="2" width="2.5" height="7" rx="1.25" fill="#111111" opacity="0.7" />
              <rect x="22.5" y="2" width="2.5" height="7" rx="1.25" fill="#111111" opacity="0.7" />
            </svg>
            <span>Slotly</span>
          </a>
          <nav className="lp-nav-links" aria-label="Page sections">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link className="lp-btn lp-btn-primary lp-nav-cta" to="/app">
            Open planner
          </Link>
        </div>
      </header>

      <main id="top">
        <section className="lp-hero">
          <p className="lp-eyebrow" data-reveal>
            Free · No account needed
          </p>
          <h1 className="lp-hero-title" data-reveal>
            The timetable builder for college.
          </h1>
          <p className="lp-hero-sub" data-reveal>
            Lay out your week on a grid, catch clashes before the semester does,
            and export the result to JPG, PDF, or Google Calendar.
          </p>
          <div className="lp-hero-cta" data-reveal>
            <Link className="lp-btn lp-btn-primary" to="/app">
              Open the planner
            </Link>
            <a className="lp-btn lp-btn-ghost" href="#how">
              How it works
            </a>
          </div>
          <div className="lp-shot-wrap" data-reveal>
            <ShotGrid />
          </div>
        </section>

        <section className="lp-section" id="features">
          <div className="lp-section-head" data-reveal>
            <p className="lp-kicker">Features</p>
            <h2 className="lp-section-title">What you actually need to build a week.</h2>
          </div>
          <div className="lp-bento">
            {FEATURES.map((f, i) => (
              <article
                key={f.id}
                className={`lp-card lp-card-${f.span}`}
                data-reveal
                style={{ ["--i" as string]: i } as CSSProperties}
              >
                <span className={`lp-tag lp-tag-${f.tagTone}`}>{f.tag}</span>
                <h3 className="lp-card-title">{f.title}</h3>
                <p className="lp-card-body">{f.body}</p>
                <div className="lp-card-visual">
                  <FeatureVisual kind={f.visual} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section" id="how">
          <div className="lp-section-head" data-reveal>
            <p className="lp-kicker">How it works</p>
            <h2 className="lp-section-title">Three steps, one browser tab.</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className="lp-step"
                data-reveal
                style={{ ["--i" as string]: i } as CSSProperties}
              >
                <span className="lp-step-num" aria-hidden="true">
                  {s.n}
                </span>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-body">{s.body}</p>
                {s.kbd && (
                  <p className="lp-kbd-row">
                    {s.kbd.map((k, idx) => (
                      <kbd key={`${k}-${idx}`}>{k}</kbd>
                    ))}
                    <span className="lp-kbd-note">{s.kbdNote}</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-section" id="faq">
          <div className="lp-section-head" data-reveal>
            <p className="lp-kicker">FAQ</p>
            <h2 className="lp-section-title">Straight answers.</h2>
          </div>
          <div className="lp-faq" data-reveal>
            {FAQ.map((item) => (
              <details key={item.q} className="lp-faq-item">
                <summary>
                  <span>{item.q}</span>
                  <span className="lp-faq-icon" aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-final" data-reveal>
          <h2 className="lp-final-title">
            Plan the whole week before your coffee gets cold.
          </h2>
          <Link className="lp-btn lp-btn-primary lp-btn-lg" to="/app">
            Open the planner
          </Link>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-footer-brand">Slotly</span>
          <span className="lp-footer-note">
            Built by{" "}
            <a
              href="https://t.me/drnx64"
              target="_blank"
              rel="noopener noreferrer"
            >
              @drnx64
            </a>
          </span>
          <Link className="lp-footer-link" to="/app">
            Open planner
          </Link>
        </div>
      </footer>
    </div>
  );
}
