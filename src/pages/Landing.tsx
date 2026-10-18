import { useEffect, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import "./Landing.css";

const NAV = [
  { href: "#grid", label: "The grid" },
  { href: "#clashes", label: "Clashes" },
  { href: "#carry", label: "Export" },
  { href: "#faq", label: "Questions" },
];

/** Inline motion index for CSS stagger delays. */
const stagger = (i: number): CSSProperties =>
  ({ ["--i" as string]: i } as CSSProperties);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00"];

type Block = {
  day: number;
  row: number;
  span: number;
  tone: "blue" | "green" | "amber" | "rose";
  code: string;
  note: string;
};

const BLOCKS: Block[] = [
  { day: 1, row: 2, span: 2, tone: "blue", code: "CS 301", note: "Operating Systems" },
  { day: 1, row: 4, span: 1, tone: "green", code: "MATH 214", note: "Linear Algebra" },
  { day: 1, row: 6, span: 1, tone: "green", code: "PHYS 112", note: "Mechanics" },
  { day: 2, row: 3, span: 2, tone: "amber", code: "ENG 105", note: "Academic Writing" },
  { day: 2, row: 7, span: 1, tone: "blue", code: "CS 301", note: "Lab · B-210" },
  { day: 3, row: 2, span: 2, tone: "rose", code: "HIST 201", note: "Modern Europe" },
  { day: 3, row: 4, span: 1, tone: "green", code: "MATH 214", note: "Tutorial" },
  { day: 4, row: 2, span: 2, tone: "amber", code: "ENG 105", note: "Seminar" },
  { day: 4, row: 5, span: 1, tone: "green", code: "PHYS 112", note: "Lab · S-12" },
  { day: 5, row: 4, span: 2, tone: "blue", code: "CS 301", note: "Project studio" },
];

const FACTS = [
  { head: "Free, complete", body: "Every feature, no paid tier, no trial timer." },
  { head: "No account", body: "There is nothing to sign up for and nothing to sign in to." },
  { head: "Your device only", body: "The timetable is stored in your browser, not on a server." },
  { head: "JPG · PDF · .ics", body: "Export, print, or copy a share link for the group chat." },
];

const STEPS = [
  {
    title: "Put the term in",
    body: "Add classes by hand, or paste the messy list the registrar handed you and let Gemini read it into clean blocks.",
  },
  {
    title: "Arrange until it fits",
    body: "Drag a block to move it, pull an edge to make it longer. Move one class and the rest of the week re-settles around it.",
    kbd: ["Ctrl", "Z"],
    kbdNote: "Undo, and redo, everything.",
  },
  {
    title: "Take it with you",
    body: "Export a JPG for the group chat, a PDF for the wall, a .ics for your calendar — or copy a link that reopens the whole week.",
  },
];

const FAQ = [
  {
    q: "Is Slotly free?",
    a: "Yes. Every feature is available with no paid tier and no trial. The planner runs entirely in your browser.",
  },
  {
    q: "Do I need an account?",
    a: "No. There is no sign-up and no sign-in. Open the planner and start adding classes.",
  },
  {
    q: "Where is my data stored?",
    a: "In your browser's local storage, on your device. Nothing is uploaded. Download a JSON backup whenever you want a copy you can restore later, even on another machine.",
  },
  {
    q: "My classes start at odd times and keep changing — will it cope?",
    a: "That is the whole point. Slot size, day range, and starting hour are all yours to set, so a week made of half-hours, evening labs, and a slot that moved in week four still fits on one grid.",
  },
  {
    q: "I'm taking subjects across different years. Can I put them together?",
    a: "Yes. Drop in whatever mix of classes you actually have this term, even when they come from different years or different sections. Nothing expects you to be on one tidy track.",
  },
  {
    q: "Can I import my Google Calendar?",
    a: "Yes. Export a .ics file from Google Calendar and import it here — weekly recurring events become class blocks on the grid. You can send the finished schedule back the same way.",
  },
  {
    q: "My schedule is just a wall of text. Can I still use it?",
    a: "Screenshot or copy the list, paste it into Gemini with the built-in prompt, and Slotly turns it into blocks on the grid.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. The grid pinch-zooms, a quick-actions button covers add, import, and export, and a Fit all days setting squeezes the whole week onto a small screen.",
  },
];

function WeekPanel() {
  return (
    <div className="lp-week-crop">
      <div
        className="lp-week"
        data-ui
        role="img"
        aria-label="The Slotly planner: a five-day timetable with class blocks placed on the week, from an 8am Operating Systems lecture to a Friday project studio."
      >
        <div className="lp-week__cells" aria-hidden="true">
          <div className="lp-week__head" />
          {DAYS.map((d) => (
            <div className="lp-week__head" key={d}>
              {d}
            </div>
          ))}
          {HOURS.map((h) => (
            <div key={h} style={{ display: "contents" }}>
              <div className="lp-week__time">{h}</div>
              {DAYS.map((d) => (
                <div className="lp-week__cell" key={d} />
              ))}
            </div>
          ))}
        </div>
        <div className="lp-week__blocks">
          {BLOCKS.map((b, index) => (
            <div
              key={`${b.code}-${b.day}-${b.row}`}
              className={`lp-week__block lp-week__block--${b.tone}`}
              style={{
                gridColumn: b.day + 1,
                gridRow: `${b.row} / span ${b.span}`,
                ...stagger(index),
              }}
            >
              <strong>{b.code}</strong>
              <span>{b.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConflictPanel() {
  return (
    <div className="lp-conflict" data-ui aria-hidden="true">
      <span className="lp-conflict__rule lp-conflict__rule--1" />
      <span className="lp-conflict__rule lp-conflict__rule--2" />
      <div className="lp-conflict__bar lp-conflict__bar--a" style={stagger(0)}>
        <strong>ENG 105</strong>
        <span>Academic Writing · 10:00–12:00</span>
      </div>
      <div className="lp-conflict__bar lp-conflict__bar--b" style={stagger(1)}>
        <strong>HIST 201</strong>
        <span>Modern Europe · 10:30–12:00</span>
      </div>
      <span className="lp-conflict__badge">overlap · 90 min</span>
    </div>
  );
}

function AgendaPanel() {
  return (
    <div className="lp-agenda" data-ui aria-hidden="true">
      <div className="lp-agenda__day" style={stagger(0)}>
        <span className="lp-agenda__label">Monday</span>
        <ul>
          <li>
            <span className="lp-agenda__time">8:00</span>
            <span>CS 301 · Operating Systems</span>
          </li>
          <li>
            <span className="lp-agenda__time">10:00</span>
            <span>MATH 214 · Linear Algebra</span>
          </li>
          <li>
            <span className="lp-agenda__time">12:00</span>
            <span>PHYS 112 · Mechanics</span>
          </li>
        </ul>
      </div>
      <div className="lp-agenda__day" style={stagger(1)}>
        <span className="lp-agenda__label">Tuesday</span>
        <ul>
          <li>
            <span className="lp-agenda__time">9:00</span>
            <span>ENG 105 · Academic Writing</span>
          </li>
          <li>
            <span className="lp-agenda__time">1:00</span>
            <span>CS 301 · Lab, room B-210</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ComparePanel() {
  return (
    <div className="lp-compare" data-ui aria-hidden="true">
      <div className="lp-compare__row" style={stagger(0)}>
        <span />
        <span className="lp-compare__head">Section A</span>
        <span className="lp-compare__head">Section B</span>
      </div>
      <div className="lp-compare__row" style={stagger(1)}>
        <span>Clashes with your classes</span>
        <span>2</span>
        <span>1</span>
      </div>
      <div className="lp-compare__row" style={stagger(2)}>
        <span>Earliest start</span>
        <span>7:30</span>
        <span>9:00</span>
      </div>
      <div className="lp-compare__row" style={stagger(3)}>
        <span>Free afternoon on Friday</span>
        <span>No</span>
        <span>Yes</span>
      </div>
      <div className="lp-compare__row" style={stagger(4)}>
        <span>Fits your week</span>
        <span />
        <span className="lp-compare__pick">Section B</span>
      </div>
    </div>
  );
}

export default function Landing() {
  usePageMeta(
    "Slotly — The timetable builder for the term you actually have.",
    "index, follow"
  );

  useRevealOnScroll();

  // The marketing page is always editorial light; App re-applies the stored
  // theme for the html element when the planner mounts.
  useEffect(() => {
    const prev = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = "light";
    return () => {
      if (prev !== undefined) document.documentElement.dataset.theme = prev;
    };
  }, []);

  return (
    <div className="landing">
      <SiteHeader nav={NAV} />

      <main id="top">
        {/* ---- Hero diptych ---- */}
        <section className="lp-hero" id="grid">
          <div className="lp-wrap">
            <div className="lp-diptych">
              <div className="lp-diptych__copy">
                <h1 className="lp-display lp-hero__title" style={stagger(0)}>
                  The term you actually have.
                </h1>
                <p className="lp-lede lp-hero__lede" style={stagger(1)}>
                  Slotly lays a term of classes onto one weekly grid — the
                  cross-year subject, the two sections you are torn between,
                  the lab that moved to Thursday. Move things until the week
                  reads like something you can live with.
                </p>
                <div className="lp-hero__cta" style={stagger(2)}>
                  <Link className="lp-btn lp-btn--solid" to="/app">
                    Open the planner
                  </Link>
                  <a className="lp-link" href="#clashes">
                    See how it handles clashes
                  </a>
                </div>
                <p className="lp-hero__hint" style={stagger(3)}>
                  No account, no sign-in. Runs in your browser.
                </p>
              </div>
              <div className="lp-diptych__media">
                <WeekPanel />
                <p className="lp-panel-cap" style={stagger(2)}>
                  A sample term, laid out on the grid.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Clashes ---- */}
        <section className="lp-section" id="clashes" data-reveal>
          <div className="lp-wrap">
            <div className="lp-diptych lp-diptych--flip">
              <div className="lp-diptych__copy">
                <h2 className="lp-h2">See the clash before the registrar does.</h2>
                <p className="lp-body">
                  Two classes in the same hour are flagged on the grid with the
                  exact overlap written on them, so you sort it out on paper
                  instead of discovering it in week three when both roll calls
                  land on the same slot.
                </p>
                <p className="lp-body">
                  The check runs as you move blocks — drag a class onto another
                  and the overlap appears, then disappears the moment you find
                  it a home.
                </p>
              </div>
              <div className="lp-diptych__media">
                <ConflictPanel />
                <p className="lp-panel-cap">Two blocks, one hour, flagged.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Carry it with you ---- */}
        <section className="lp-section" id="carry" data-reveal>
          <div className="lp-wrap">
            <div className="lp-diptych">
              <div className="lp-diptych__copy">
                <h2 className="lp-h2">Read it as a grid, or as a list.</h2>
                <p className="lp-body">
                  Switch the same schedule to Agenda for a running list of the
                  week, day by day, with times down the left. Total hours and
                  free windows fall out of it without you counting anything.
                </p>
                <p className="lp-body">
                  Then take the week wherever it needs to go — a JPG for the
                  group chat, a PDF for the wall above the desk, a .ics for
                  Google Calendar, or a link that reopens the exact schedule.
                </p>
              </div>
              <div className="lp-diptych__media">
                <AgendaPanel />
                <p className="lp-panel-cap">The same two days, read as a list.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Compare sections ---- */}
        <section className="lp-section" id="compare" data-reveal>
          <div className="lp-wrap">
            <div className="lp-diptych lp-diptych--flip">
              <div className="lp-diptych__copy">
                <h2 className="lp-h2">Two sections, side by side.</h2>
                <p className="lp-body">
                  Paste in both section schedules and let Gemini read them. Slotly
                  puts them next to what you already have and shows which one
                  clashes with fewer of your classes, when each starts, and
                  where the free windows fall — before you commit to either.
                </p>
                <p className="lp-body">
                  It does not tell you which to take. It just lays both out,
                  honestly, on the same grid you have been staring at.
                </p>
              </div>
              <div className="lp-diptych__media">
                <ComparePanel />
                <p className="lp-panel-cap">Section A and Section B, measured against your week.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Photographic plate ---- */}
        <figure className="lp-plate" data-reveal>
          <img
            className="lp-plate__img"
            src="/landing/alexandra-road-campus-c-1890s.jpg"
            alt="An archival photograph of a Victorian college building and its grounds."
            loading="lazy"
            decoding="async"
          />
          <figcaption className="lp-plate__cap">
            The timetable is a very old idea — a building, a bell, and a week
            that has to hold together. Alexandra Road campus, c. 1890s. Swansea
            Metropolitan University archive, CC BY-SA 3.0.
          </figcaption>
        </figure>

        {/* ---- Facts ---- */}
        <section className="lp-section" id="quiet" data-reveal>
          <div className="lp-wrap">
            <ul className="lp-facts">
              {FACTS.map((f) => (
                <li key={f.head}>
                  <strong>{f.head}</strong>
                  {f.body}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- How it works + photo ---- */}
        <section className="lp-section" id="how" data-reveal>
          <div className="lp-wrap">
            <div className="lp-diptych">
              <div className="lp-diptych__copy">
                <h2 className="lp-h2">Three moves, one browser tab.</h2>
                <ol className="lp-steps" style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: "var(--space-lg)" }}>
                  {STEPS.map((s) => (
                    <li className="lp-step" key={s.title}>
                      <h3 className="lp-step__title">{s.title}</h3>
                      <p>{s.body}</p>
                      {s.kbd && (
                        <p>
                          {s.kbd.map((k) => (
                            <kbd key={k}>{k}</kbd>
                          ))}
                          <span className="lp-hero__hint">{s.kbdNote}</span>
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="lp-diptych__media">
                <figure className="lp-figure">
                  <img
                    className="lp-figure__img"
                    src="/landing/ohio-university-lecture-hall.jpg"
                    alt="A wide lecture hall with rows of seats facing a chalkboard."
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="lp-figure__cap">
                    A hall that seats a few hundred; your week still only fits
                    one class at a time. Ohio University lecture hall. Garden
                    Sprite, CC0.
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Privacy ---- */}
        <section className="lp-section" data-reveal>
          <div className="lp-wrap">
            <div className="lp-diptych lp-diptych--flip">
              <div className="lp-diptych__copy">
                <h2 className="lp-h2">It never asks who you are.</h2>
                <p className="lp-body">
                  No account, no sign-in, no server quietly holding your
                  timetable. Everything is stored in your browser, on your
                  device, and Download backup gives you a JSON copy you can
                  carry anywhere — including onto the next computer.
                </p>
                <p className="lp-body">
                  That is the whole point of a planner for a week that is
                  already complicated enough.
                </p>
              </div>
              <div className="lp-diptych__media">
                <figure className="lp-figure">
                  <img
                    className="lp-figure__img"
                    src="/landing/sias-library-students-studying-2017.jpg"
                    alt="Two students reading at a library table, surrounded by shelves of books."
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="lp-figure__cap">
                    Nothing about the week leaves the room. Sias University
                    library, 2017. Gary Todd, CC0.
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section className="lp-section" id="faq" data-reveal>
          <div className="lp-wrap">
            <dl className="lp-faq">
              {FAQ.map((item, index) => (
                <div className="lp-faq__item" key={item.q} style={stagger(index)}>
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---- Closing ---- */}
        <section className="lp-closing" data-reveal>
          <div className="lp-wrap">
            <div className="lp-closing__inner">
              <h2 className="lp-display lp-closing__title">
                Plan the week while the kettle boils.
              </h2>
              <Link className="lp-btn lp-btn--solid" to="/app">
                Open the planner
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
