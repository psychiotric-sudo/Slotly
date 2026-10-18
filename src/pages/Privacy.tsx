import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import LegalLayout from "./LegalLayout";

export default function Privacy() {
  usePageMeta("Privacy Policy — Slotly", "index, follow");

  return (
    <LegalLayout
      kicker="Privacy"
      title="Privacy Policy"
      updated="18 October 2026"
      lede="This Privacy Policy explains how Slotly handles information when you use our website and timetable planner. We have written it to be readable, but it is a full policy: it describes what we store, where it lives, who else is involved, and the rights you have. Please read it together with our Terms &amp; Conditions."
    >
      <h2>1. Introduction and scope</h2>
      <p>
        This Privacy Policy (&ldquo;Policy&rdquo;) applies to the Slotly
        website, its timetable planner, and the document pages you are reading
        now (together, the &ldquo;Service&rdquo;). It describes how information
        is handled when you visit the Service, build a timetable with it, share
        a timetable, or contact us.
      </p>
      <p>
        By using the Service, you acknowledge that you have read and understood
        this Policy. If you do not agree with it, please do not use the
        Service.
      </p>
      <p>
        This Policy does not apply to third-party websites or services that the
        Service links to, such as Google Calendar, Gemini, or Telegram. Those
        services have their own privacy policies, which we encourage you to
        read. We are not responsible for their practices.
      </p>

      <h2>2. Who we are</h2>
      <p>
        The Service is a free, open-source project operated by{" "}
        <strong>drnx64</strong> (&ldquo;Slotly&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;, or &ldquo;our&rdquo;). For the purposes of data
        protection law, we are the controller of the limited data described in
        this Policy. You can reach us through any of the channels listed on our
        Contact page.
      </p>
      <p>
        Slotly is not operated by, affiliated with, or acting on behalf of any
        university, college, registrar, or other educational institution.
      </p>

      <h2>3. Key definitions</h2>
      <ul>
        <li>
          <strong>Service</strong> — the Slotly website, planner, share pages,
          and document pages.
        </li>
        <li>
          <strong>You</strong> — the person visiting or using the Service.
        </li>
        <li>
          <strong>Schedule data</strong> — the classes, breaks, sections,
          times, rooms, instructors, colours, and settings you enter into the
          planner.
        </li>
        <li>
          <strong>Local storage</strong> — storage built into your web browser
          that keeps data on your own device.
        </li>
        <li>
          <strong>Personal data</strong> — information that relates to an
          identified or identifiable person.
        </li>
      </ul>

      <h2>4. Slotly is designed to need almost no data</h2>
      <p>
        Most timetable tools are built around a server. Slotly is not. The
        planner runs entirely in your web browser, and your schedule is saved
        to your own device rather than to a database we control. There is no
        sign-up, no login, and no account. This design choice is deliberate,
        and it shapes everything that follows: because the Service does not
        receive your schedule, it cannot lose it, sell it, or disclose it.
      </p>
      <p>
        As a result, we do not hold a profile about you, we cannot identify you
        from your use of the planner, and we have no data about your classes to
        hand over, correct, or delete on request.
      </p>

      <h2>5. Information we do not collect</h2>
      <p>
        To be explicit, the Service does not collect, request, or store any of
        the following:
      </p>
      <ul>
        <li>your name, email address, or phone number;</li>
        <li>a username, password, or any account credentials;</li>
        <li>your timetable, courses, rooms, or instructor names;</li>
        <li>
          advertising identifiers, behavioural profiles, or cross-site
          tracking data;
        </li>
        <li>
          payment information, because the Service is free and takes no
          payments;
        </li>
        <li>
          precise location data, contacts, photos, or files from your device.
        </li>
      </ul>
      <p>
        We also do not use analytics, session recording, heat-mapping, or
        advertising tools of any kind.
      </p>

      <h2>6. Information stored on your device</h2>
      <p>
        The Service uses your browser&rsquo;s own storage to remember your
        work. This information is created by the Service on your device, stays
        on your device, and is never transmitted to us. The specific items are
        as follows.
      </p>
      <dl className="legal__defs">
        <div>
          <dt>
            <code>localStorage[&quot;schedule_v1&quot;]</code>
          </dt>
          <dd>
            Your saved workspace: the timetable sections (tabs) you have
            created, the classes and breaks within them, and your planner
            settings such as the visible day range, slot length, starting hour,
            and light or dark theme. This is what allows the planner to reopen
            exactly where you left it. It remains until you clear it or clear
            your browser&rsquo;s site data.
          </dd>
        </div>
        <div>
          <dt>
            <code>sessionStorage[&quot;slotly_share_import&quot;]</code>
          </dt>
          <dd>
            A temporary copy of a shared schedule, written only when you open a
            share link, so that the planner can offer to import it. Session
            storage is cleared automatically by your browser when you close the
            tab.
          </dd>
        </div>
        <div>
          <dt>Theme preference</dt>
          <dd>
            Your choice of light or dark appearance is read when a page loads
            so that the correct theme is applied immediately, and written back
            when you change it. This is stored as part of your workspace and,
            on the marketing and document pages, is read only.
          </dd>
        </div>
      </dl>
      <p>
        None of this information is sent to us, and none of it is shared with
        anyone else. It lives within the storage your browser provides to the
        Slotly origin, and other websites cannot read it.
      </p>

      <h2>7. How the planner uses your information</h2>
      <p>
        Because the planner runs locally, any &ldquo;use&rdquo; of your
        schedule data happens on your own device, in your own browser. Slotly
        uses that data only to do the things you ask of it: rendering the
        weekly grid, arranging and colouring class blocks, detecting overlaps,
        producing the agenda view, and generating the exports you request.
      </p>
      <p>
        We do not receive, read, analyse, or process your schedule on any
        server. There is no server component that your timetable passes
        through.
      </p>

      <h2>8. Legal bases for processing</h2>
      <p>
        Where data protection law such as the UK or EU General Data Protection
        Regulation applies, we rely on the following legal bases for the very
        limited processing that occurs:
      </p>
      <ul>
        <li>
          <strong>Performance of a service you request</strong> — storing your
          schedule on your device so the planner functions as you expect.
        </li>
        <li>
          <strong>Legitimate interests</strong> — serving the website securely
          and keeping it available, including ordinary server logging by our
          host.
        </li>
        <li>
          <strong>Consent</strong> — where you choose to contact us, or choose
          to open a third-party link such as Google Calendar or Telegram.
        </li>
      </ul>
      <p>
        We do not rely on consent for advertising or profiling, because we do
        neither.
      </p>

      <h2>9. Cookies and similar technologies</h2>
      <p>
        The Service does not set advertising or tracking cookies, and it does
        not use cookies to identify you. Where it needs to remember something —
        your schedule, your theme, a shared schedule being imported — it uses{" "}
        <strong>local storage and session storage</strong>, which are part of
        your browser and are not transmitted to us.
      </p>
      <p>
        You can clear this storage at any time through your browser&rsquo;s
        settings. Doing so will remove your saved schedules from that browser.
      </p>

      <h2>10. Share links and public URLs</h2>
      <p>
        Slotly lets you create a share link that reopens a timetable. This is
        important to understand: when you create a share link, the entire
        schedule is <strong>encoded into the link itself</strong>, inside your
        browser. The link is simply a web address.
      </p>
      <p>
        When you open a share link, the schedule is decoded in your browser
        from the address. It is not fetched from a Slotly server, and we cannot
        see which links exist or who opens them.
      </p>
      <p>
        Because the schedule travels inside the address, anyone who has the
        link — now or later, including people you did not intend to share it
        with — can read the schedule it contains. A share link has no password
        and no expiry. Please treat share links as public, and avoid putting
        information you consider sensitive into a course title, room, or
        instructor field before generating one.
      </p>
      <p>
        Note that, if a third-party service obtains a share link (for example,
        because it was pasted into a chat app or a public issue tracker), that
        service may retain the link in its own systems under its own policies.
      </p>

      <h2>11. Exports, backups, and downloads</h2>
      <p>
        Slotly can produce a JPG image, a PDF, an <code>.ics</code> calendar
        file, and a JSON backup. These files are generated entirely on your
        device and handed to your browser&rsquo;s normal download mechanism.
        They are saved wherever your browser saves downloads, under your
        control.
      </p>
      <p>
        We do not receive a copy of any export. Once a file is downloaded, it
        is your responsibility to store, share, or delete it. Files you send to
        other services, such as a calendar app or a messaging service, are
        handled under those services&rsquo; own terms.
      </p>

      <h2>12. Third-party services we rely on</h2>
      <p>
        Slotly is a static website, but a small number of outside providers are
        involved in serving it. Each is described below.
      </p>
      <h3>Hosting</h3>
      <p>
        The website is delivered through Vercel, a hosting provider. Like
        almost all web hosts, Vercel may process standard technical data — such
        as your IP address, browser user-agent, the page requested, and the
        time of the request — in order to serve the site and protect it from
        abuse. This is ordinary server logging and is not used by us to
        identify you. See{" "}
        <a
          href="https://vercel.com/legal/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vercel&rsquo;s privacy policy
        </a>
        .
      </p>
      <h3>Fonts</h3>
      <p>
        The Service loads its typefaces from Google Fonts. When a page loads,
        your browser requests those font files directly from Google, which
        means Google receives technical information such as your IP address and
        user-agent as part of the request. We do not control that request. See{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google&rsquo;s privacy policy
        </a>
        .
      </p>
      <h3>Google Calendar and Gemini</h3>
      <p>
        The Service provides links to Google Calendar (for importing or
        exporting calendar events) and to Gemini (for reading a pasted
        schedule). These links open in a new tab and are followed only when you
        click them. If you paste timetable text into Gemini, that text is
        processed by Google under your Google account and Google&rsquo;s terms,
        and is not sent to us. We encourage you not to paste anything you would
        not want to share with Google.
      </p>
      <h3>Telegram</h3>
      <p>
        The Contact page and footer link to Telegram so you can reach us. If
        you open that link, Telegram receives information in accordance with
        its own policy. See{" "}
        <a
          href="https://telegram.org/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram&rsquo;s privacy policy
        </a>
        .
      </p>
      <h3>GitHub</h3>
      <p>
        The source code and issue tracker are hosted on GitHub. If you visit
        the repository or open an issue, GitHub processes your information
        under its own privacy statement.
      </p>

      <h2>13. International transfers</h2>
      <p>
        The providers named above may process technical data in countries other
        than your own, including the United States. Where required, those
        providers maintain their own safeguards for such transfers, and any
        transfer is governed by their policies. Because we do not receive your
        schedule or any personal data from the planner, we do not ourselves
        transfer personal data internationally.
      </p>

      <h2>14. Data retention</h2>
      <p>
        We do not retain any personal data, because we do not collect it. Your
        schedule stays in your browser for as long as you keep it there.
        Session storage used for share imports is cleared when you close the
        tab. Any message you send us directly (for example, a Telegram message
        or a GitHub issue) is retained by that platform according to that
        platform&rsquo;s settings and, for our part, only as long as needed to
        respond.
      </p>

      <h2>15. How we protect your information</h2>
      <p>
        Because your schedule never leaves your device, its security largely
        depends on the security of your own device and browser. We recommend
        keeping your browser and operating system up to date, and downloading a
        JSON backup of anything important, since clearing your browser storage
        will erase your schedules.
      </p>
      <p>
        The website is served over an encrypted HTTPS connection. While no
        system can be guaranteed perfectly secure, the design of Slotly means
        there is no central store of user schedules for an attacker to target.
      </p>

      <h2>16. Your privacy rights</h2>
      <p>
        Depending on where you live, you may have rights such as the right to
        access, correct, delete, restrict, or object to the processing of your
        personal data, and the right to data portability. Because the Service
        does not collect personal data through the planner, there is generally
        nothing for us to access, correct, or delete on your behalf.
      </p>
      <p>
        Your schedule is under your own control: you can edit any entry in the
        planner, remove it, export a copy as a backup, or erase everything by
        using the Clear All action or by clearing your browser&rsquo;s site
        data. If you believe we hold something about you (for example, an
        email you sent us), you may contact us and we will respond as required
        by applicable law.
      </p>

      <h2>17. Rights for California residents</h2>
      <p>
        If you are a California resident, you may have rights under the CCPA
        and CPRA, including the right to know what personal information is
        collected, the right to delete it, and the right to opt out of the
        &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information. We
        do not sell or share personal information, and we do not collect
        personal information through the planner, so there is no sale or
        sharing to opt out of. We will not discriminate against you for
        exercising any privacy right.
      </p>

      <h2>18. Do Not Track and Global Privacy Control</h2>
      <p>
        Some browsers transmit &ldquo;Do Not Track&rdquo; or Global Privacy
        Control signals. Because the Service does not track visitors across
        sites or build profiles, there is no tracking to disable, and these
        signals do not change how the Service behaves.
      </p>

      <h2>19. Children&rsquo;s privacy</h2>
      <p>
        The Service is a general-purpose study tool and is not directed at
        children under the age of 13 (or the minimum age in your jurisdiction).
        We do not knowingly collect personal information from children, or from
        anyone, because we do not collect personal information at all. If you
        believe a child has provided personal information to us directly,
        please contact us and we will take appropriate steps.
      </p>

      <h2>20. Changes to this Privacy Policy</h2>
      <p>
        We may update this Policy from time to time to reflect changes in the
        Service or in the law. When we do, we will revise the &ldquo;last
        updated&rdquo; date at the top of this page. Material changes will be
        reflected on this page. Your continued use of the Service after a
        change takes effect constitutes acceptance of the revised Policy, so we
        encourage you to review it periodically.
      </p>

      <h2>21. How to contact us</h2>
      <p>
        If you have questions, concerns, or requests relating to this Policy or
        to privacy in general, please reach us through the{" "}
        <Link to="/contact">Contact page</Link>. Telegram and GitHub issues are
        both monitored, and we will do our best to respond promptly.
      </p>
    </LegalLayout>
  );
}
