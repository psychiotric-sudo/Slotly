import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import LegalLayout from "./LegalLayout";

const TELEGRAM = "https://t.me/drnx64";
const ISSUES = "https://github.com/psychiotric-sudo/Slotly/issues";
const REPO = "https://github.com/psychiotric-sudo/Slotly";

export default function Contact() {
  usePageMeta("Contact — Slotly", "index, follow");

  return (
    <LegalLayout
      kicker="Contact"
      title="Contact"
      updated="18 October 2026"
      lede="Slotly is a small, open-source project maintained in spare time. Bug reports, questions, ideas, and corrections are all genuinely welcome. This page explains the best route for each kind of message, what to include, and what to expect in return."
    >
      <h2>1. About this page</h2>
      <p>
        Slotly is built and maintained by a single developer,{" "}
        <strong>drnx64</strong>, as a free tool for students whose terms do not
        fit the usual timetable shape. There is no support team, no ticket
        desk, and no company behind the project — just one person, a
        repository, and an inbox.
      </p>
      <p>
        Because of that, the most useful thing you can do is send a clear,
        specific message through the right channel. This page is written to
        make that easy.
      </p>

      <h2>2. Ways to reach us</h2>
      <p>
        There are two channels, and each is best suited to different things.
      </p>
      <dl className="legal__defs">
        <div>
          <dt>
            <a href={ISSUES} target="_blank" rel="noopener noreferrer">
              GitHub issues &mdash; the preferred channel
            </a>
          </dt>
          <dd>
            Best for bug reports, feature requests, accessibility problems, and
            anything else that benefits from being public and searchable. An
            issue can be tracked, referenced by a fix, and found by someone
            else with the same problem. If your message is about the product
            rather than something private, please start here.
          </dd>
        </div>
        <div>
          <dt>
            <a href={TELEGRAM} target="_blank" rel="noopener noreferrer">
              Telegram &mdash; @drnx64
            </a>
          </dt>
          <dd>
            Best for a quick question, a short note, or anything that does not
            fit neatly into an issue. Please use it for matters that are
            genuinely private or conversational, and prefer the issue tracker
            for anything a future reader might search for.
          </dd>
        </div>
        <div>
          <dt>
            <a href={REPO} target="_blank" rel="noopener noreferrer">
              GitHub repository
            </a>
          </dt>
          <dd>
            The full source code, released under the MIT License. Read it,
            fork it, or open a pull request if you would like to contribute
            directly.
          </dd>
        </div>
      </dl>

      <h2>3. Before you get in touch</h2>
      <p>
        A few quick checks will often answer your question faster than waiting
        for a reply:
      </p>
      <ul>
        <li>
          open the planner afresh and try to reproduce the problem, so you know
          the exact steps that trigger it;
        </li>
        <li>
          if something looks wrong in your timetable, check the same entries in
          your official timetable first — Slotly only knows what you typed into
          it;
        </li>
        <li>
          if a schedule has disappeared, remember that Slotly stores your work
          in your browser and that clearing site data or using a different
          browser or device will not carry it over;
        </li>
        <li>
          try a hard refresh, in case an older version of the page is cached
          in the tab.
        </li>
      </ul>

      <h2>4. Reporting a bug</h2>
      <p>
        Bug reports are the single most valuable thing you can send. To make
        one that is easy to act on, please include:
      </p>
      <ul>
        <li>
          <strong>What you expected to happen</strong>, and{" "}
          <strong>what actually happened</strong>.
        </li>
        <li>
          <strong>The exact steps to reproduce it</strong> — the sequence of
          clicks or entries that leads to the problem, if you can find one.
        </li>
        <li>
          <strong>Your browser and device</strong>, for example
          &ldquo;Chrome on Windows&rdquo; or &ldquo;Safari on iPhone&rdquo;,
          and whether you were on desktop or mobile.
        </li>
        <li>
          <strong>A screenshot or short recording</strong>, if the problem is
          visual. A picture removes a great deal of guesswork.
        </li>
        <li>
          <strong>The size of the schedule involved</strong>, for example how
          many classes, if the problem seems to relate to a large timetable or
          a particular export.
        </li>
        <li>
          <strong>Any error text</strong> you saw, copied verbatim rather than
          paraphrased.
        </li>
      </ul>

      <h2>5. Requesting a feature or improvement</h2>
      <p>
        Ideas for how Slotly could work better are welcome. When you suggest
        something, it helps to describe the problem you are trying to solve
        rather than only the solution you have in mind — the problem is often
        solvable in a way neither of us expected. If you can, mention how you
        currently work around the issue today, since that shows how much it
        matters.
      </p>
      <p>
        Slotly deliberately keeps a narrow scope: it is a local, browser-only,
        no-account planner. Requests that push it toward accounts, cloud
        storage, advertising, or paid tiers are unlikely to be adopted, however
        useful they might be in another product.
      </p>

      <h2>6. Reporting a security or privacy concern</h2>
      <p>
        If you believe you have found a security issue, please report it
        privately rather than opening a public issue, so that others are not
        exposed before a fix is available. A message on Telegram is the fastest
        way to reach us. Please describe the issue, the steps to reproduce it,
        and the potential impact, and give us a reasonable opportunity to
        respond before disclosing it publicly.
      </p>
      <p>
        On privacy, it is worth remembering that the planner holds no data on
        any server: your schedule stays in your browser. If you have a privacy
        question, it is most likely answered in the{" "}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>7. Privacy and data requests</h2>
      <p>
        Because Slotly does not collect personal data through the planner,
        there is normally nothing for us to retrieve, correct, or delete on
        your behalf. Your schedule is under your own control: you can edit it,
        export a JSON backup, or remove it entirely by clearing your
        browser&rsquo;s site data for Slotly. If you have sent us a message and
        would like it removed, say so and we will honour the request.
      </p>

      <h2>8. Accessibility feedback</h2>
      <p>
        Slotly aims to work well with a keyboard, with screen readers, and at
        small screen sizes. If you encounter a barrier — a control that cannot
        be reached, a focus indicator that is hard to see, text that is too
        small, or anything else that gets in the way — please tell us. Include
        the browser, assistive technology, and device you were using, and the
        page or control involved. Accessibility reports are taken seriously.
      </p>

      <h2>9. Licensing, reuse, and sponsorship</h2>
      <p>
        The Slotly source code is released under the MIT License, and you are
        free to use it within those terms. The Slotly name, wordmark, and
        visual design are not covered by that licence; if you would like to use
        them, please ask first. For anything to do with reuse, attribution, or
        a commercial or sponsored arrangement, a direct message on Telegram is
        the right starting point.
      </p>

      <h2>10. What not to send</h2>
      <p>
        Please help keep the project and its channels safe by not sending or
        posting the following:
      </p>
      <ul>
        <li>
          <strong>A full personal schedule.</strong> Slotly stores everything
          on your device, so there is rarely any need to share your real
          timetable. A short, invented example is almost always enough to
          illustrate a problem.
        </li>
        <li>
          <strong>Share links in public.</strong> A Slotly share link contains
          the whole schedule inside the web address, and anyone with the link
          can read it. Never paste a share link into a public issue or post. If
          you must show a shared example, build a throwaway schedule with no
          personal details.
        </li>
        <li>
          <strong>Sensitive or identifying information.</strong> Do not include
          names of other people, student numbers, addresses, or anything you
          would not want a stranger to read.
        </li>
        <li>
          <strong>Content you have no right to share</strong>, such as material
          belonging to your institution or to another person.
        </li>
      </ul>

      <h2>11. What to expect</h2>
      <p>
        This is a hobby project, so replies may take a little while — please be
        patient rather than sending the same message repeatedly. Clear,
        self-contained reports tend to move to the front of the queue. Bug
        fixes and small, well-scoped improvements are the most likely to land
        quickly, while large feature requests may not fit the project&rsquo;s
        scope at all. Every message is read, even when a reply takes time.
      </p>

      <h2>12. The source code</h2>
      <p>
        Slotly is open source. At the repository listed above you can read the
        code, follow development, and open a pull request. Contributions are
        welcome, and review is best-effort; opening an issue first is a good
        way to check that a change would be useful before you invest time in
        it.
      </p>
    </LegalLayout>
  );
}
