import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import LegalLayout from "./LegalLayout";

const REPO = "https://github.com/psychiotric-sudo/Slotly";

export default function Terms() {
  usePageMeta("Terms & Conditions — Slotly", "index, follow");

  return (
    <LegalLayout
      kicker="Terms"
      title="Terms &amp; Conditions"
      updated="18 October 2026"
      lede="These Terms &amp; Conditions govern your access to and use of Slotly, a free timetable planner that runs entirely in your web browser. Please read them carefully. By visiting or using the Service, you agree to be bound by these Terms."
    >
      <h2>1. Introduction and acceptance</h2>
      <p>
        These Terms &amp; Conditions (the &ldquo;Terms&rdquo;) form a binding
        agreement between you (&ldquo;you&rdquo; or &ldquo;your&rdquo;) and the
        operator of Slotly (&ldquo;Slotly&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;, or &ldquo;our&rdquo;) regarding your use of the Slotly
        website, timetable planner, share pages, and document pages (together,
        the &ldquo;Service&rdquo;).
      </p>
      <p>
        By accessing or using the Service, you confirm that you have read,
        understood, and agree to these Terms. If you do not agree with any part
        of them, you must not use the Service.
      </p>
      <p>
        Your use of the Service is also governed by our{" "}
        <Link to="/privacy">Privacy Policy</Link>, which explains how the
        Service handles information. The Privacy Policy forms part of these
        Terms by reference.
      </p>

      <h2>2. Definitions</h2>
      <ul>
        <li>
          <strong>Service</strong> — the Slotly website, planner, share links,
          exports, and document pages.
        </li>
        <li>
          <strong>Planner</strong> — the browser-based tool for building a
          weekly timetable.
        </li>
        <li>
          <strong>Your content</strong> — the classes, breaks, tabs, times,
          rooms, instructors, colours, notes, and settings you enter into the
          Planner.
        </li>
        <li>
          <strong>Export</strong> — a file the Service generates for you, such
          as a JPG, PDF, <code>.ics</code>, or JSON file.
        </li>
        <li>
          <strong>Share link</strong> — a web address that contains a schedule
          encoded within it.
        </li>
      </ul>

      <h2>3. About Slotly</h2>
      <p>
        Slotly is a free, open-source study tool that lets you sketch out a
        university timetable that matches the shape of your actual term. It
        runs entirely in your browser, requires no account, and stores your
        work on your own device.
      </p>
      <p>
        Slotly is an independent project. It is{" "}
        <strong>
          not affiliated with, endorsed by, sponsored by, or connected to any
          university, college, registrar, department, or other institution
        </strong>
        , and it is not an official service of any of them. Any names of
        institutions that appear in example content are used descriptively
        only.
      </p>

      <h2>4. Eligibility</h2>
      <p>
        You may use the Service only if you can form a binding contract with us
        and are not barred from doing so under applicable law. If you use the
        Service on behalf of an organisation, you represent that you have
        authority to bind that organisation to these Terms.
      </p>

      <h2>5. Licence granted to you</h2>
      <p>
        Subject to your compliance with these Terms, we grant you a personal,
        non-exclusive, non-transferable, revocable, royalty-free licence to
        access and use the Service for your own personal, non-commercial study
        planning. All rights not expressly granted are reserved.
      </p>
      <p>
        This licence does not permit you to resell the Service, charge others
        for access to it, or present it as your own product. The source code is
        separately available under an open-source licence, as described in
        section 10.
      </p>

      <h2>6. No account and no fees</h2>
      <p>
        The Service does not require registration and does not charge a fee.
        Because there is no account, there is nothing to log in to and no
        credentials for us to manage. Any limits described in these Terms apply
        to your conduct rather than to a user account.
      </p>

      <h2>7. Your content</h2>
      <p>
        You retain all rights to your content. We do not claim ownership of the
        timetable you build. Because the Planner runs locally and stores your
        work on your device, your content is never transmitted to or stored by
        us.
      </p>
      <p>
        You are solely responsible for your content and for ensuring that you
        have the right to use it. You should not enter information that you are
        not permitted to hold, and you should avoid entering confidential or
        sensitive information, because a share link can expose whatever you
        put into the Planner (see section 12).
      </p>

      <h2>8. Your responsibilities and the accuracy of your schedule</h2>
      <p>
        Slotly is a drafting aid. It does not know your enrolment rules, it
        does not connect to any official timetable, and it cannot verify that
        the schedule you build is correct or achievable. In particular:
      </p>
      <ul>
        <li>
          every class, time, room, and instructor is entered by you, and
          Slotly does not check it against any authoritative source;
        </li>
        <li>
          overlap warnings, free-window hints, and totals are aids to help you
          think, not guarantees or records;
        </li>
        <li>
          exports are generated from what you entered and are only as accurate
          as your input;
        </li>
        <li>
          nothing in the Service constitutes academic, enrolment, legal,
          financial, or professional advice.
        </li>
      </ul>
      <p>
        You are responsible for confirming your final schedule against your
        institution&rsquo;s official timetable and enrolment systems, and for
        keeping a backup of any schedule you rely on.
      </p>

      <h2>9. Acceptable use</h2>
      <p>
        You agree to use the Service lawfully and reasonably. Among other
        things, you must not:
      </p>
      <ul>
        <li>use the Service for any unlawful purpose, or to store unlawful content;</li>
        <li>
          attempt to interfere with, disrupt, overload, or gain unauthorised
          access to the Service or the infrastructure that hosts it;
        </li>
        <li>
          scrape, probe, or automate requests to the Service in a way that
          imposes an unreasonable load on it;
        </li>
        <li>
          remove, obscure, or misrepresent any copyright, attribution, or
          licence notice that accompanies the Service or its content;
        </li>
        <li>
          misrepresent the Service as an official offering of any institution,
          or imply that we endorse or sponsor you or your organisation;
        </li>
        <li>
          use any linked third-party service, such as the Gemini import, to
          process content you do not have the right to process.
        </li>
      </ul>

      <h2>10. Intellectual property and open source</h2>
      <p>
        The Slotly <strong>source code</strong> is open source and is published
        on{" "}
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        , released under the{" "}
        <a
          href={`${REPO}/blob/main/LICENSE`}
          target="_blank"
          rel="noopener noreferrer"
        >
          MIT License
        </a>
        . You are free to use, copy, modify, and distribute the code subject to
        the conditions of that licence.
      </p>
      <p>
        The MIT License covers the code. It does not grant you rights to the{" "}
        <strong>Slotly name, wordmark, logo, written copy, or visual design</strong>
        , which remain the property of the project and may not be used in a way
        that suggests endorsement or creates confusion about origin. The
        photographs shown on the home page belong to their respective authors,
        are credited on that page and in the footer, and are used under their
        stated licences (Creative Commons).
      </p>
      <p>
        Nothing in these Terms transfers any intellectual property rights to
        you other than the limited licence described in section 5.
      </p>

      <h2>11. Third-party services and links</h2>
      <p>
        The Service links to, or interoperates with, services operated by third
        parties, including Google Calendar, Gemini, Telegram, GitHub, and Google
        Fonts. These services are governed by their own terms and policies. We
        do not control them and are not responsible for their content,
        availability, or practices.
      </p>
      <p>
        A link or integration is not an endorsement. If you choose to open a
        third-party service, your use of it is between you and that provider,
        and you should review its terms before doing so.
      </p>

      <h2>12. Share links</h2>
      <p>
        Slotly can create a share link that reopens a schedule. This is
        important to understand before you send one.
      </p>
      <p>
        A share link contains the entire schedule, encoded into the web address
        itself. Anyone who has the link can read the schedule it contains — now
        or in the future — because the schedule travels with the link and is
        not protected by any password. We cannot see which links exist, who
        opens them, or prevent the contents of a link that has been shared from
        being read.
      </p>
      <p>
        You are responsible for the links you create and share. Only generate a
        share link for a schedule you are comfortable making readable, and do
        not publish share links in public places such as issue trackers or
        social posts.
      </p>

      <h2>13. Availability, changes, and updates</h2>
      <p>
        The Service is provided free of charge and may change at any time. We
        may add, modify, or remove features, and we may suspend or discontinue
        the Service in whole or in part, without notice and without liability.
        We do not guarantee that the Service will be available, uninterrupted,
        timely, secure, or error-free.
      </p>

      <h2>14. Disclaimers and no warranty</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;, without warranties of any kind, whether express,
        implied, or statutory. To the fullest extent permitted by law, we
        disclaim all implied warranties, including any implied warranties of
        merchantability, fitness for a particular purpose, title, and
        non-infringement.
      </p>
      <p>
        We do not warrant that the Service will meet your requirements, that it
        will be free of bugs or errors, that exports or generated files will be
        accurate or complete, or that any data you store in your browser will
        not be lost. You use the Service at your own risk.
      </p>

      <h2>15. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or
        for any loss of data, missed classes, scheduling mistakes, lost
        opportunities, or lost profits, arising out of or in connection with
        your use of, or inability to use, the Service.
      </p>
      <p>
        Where liability cannot be excluded, our total liability arising out of
        or relating to the Service will not exceed the greater of one hundred
        (100) units of your local currency or the amount you paid us to use the
        Service (which, since the Service is free, is zero). Because some
        jurisdictions do not allow certain exclusions or limitations, some of
        the above may not apply to you.
      </p>

      <h2>16. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless the operator of Slotly from
        and against any claims, liabilities, damages, losses, and expenses
        arising out of or in any way connected with your use of the Service,
        your content, or your breach of these Terms, to the extent permitted by
        applicable law.
      </p>

      <h2>17. Termination</h2>
      <p>
        You may stop using the Service at any time. Because there is no
        account, there is nothing for you to cancel. We may restrict or
        terminate your access to the hosted Service if we reasonably believe
        you have breached these Terms or used the Service unlawfully. The
        provisions of these Terms that by their nature should survive
        termination — including sections on intellectual property, disclaimers,
        limitation of liability, and indemnification — will continue to apply.
      </p>

      <h2>18. Changes to these Terms</h2>
      <p>
        We may revise these Terms from time to time, for example to reflect
        changes to the Service or to the law. When we do, we will update the
        &ldquo;last updated&rdquo; date at the top of this page. Your continued
        use of the Service after a revision takes effect constitutes acceptance
        of the revised Terms, so please review this page periodically. If you
        do not agree to a revision, you should stop using the Service.
      </p>

      <h2>19. Severability and waiver</h2>
      <p>
        If any provision of these Terms is found to be invalid or unenforceable,
        that provision will be limited or removed to the minimum extent
        necessary, and the remaining provisions will remain in full force and
        effect. Our failure to enforce any right or provision of these Terms
        will not be considered a waiver of that right or provision.
      </p>

      <h2>20. Assignment</h2>
      <p>
        You may not assign or transfer your rights under these Terms without
        our prior written consent. We may assign our rights and obligations
        under these Terms, in whole or in part, without restriction, including
        in connection with a reorganisation or transfer of the project.
      </p>

      <h2>21. Entire agreement</h2>
      <p>
        These Terms, together with the Privacy Policy, constitute the entire
        agreement between you and us regarding the Service, and supersede any
        prior or contemporaneous understandings on the same subject. If there
        is a conflict between these Terms and the Privacy Policy on a matter of
        privacy, the Privacy Policy prevails.
      </p>

      <h2>22. Contact</h2>
      <p>
        If you have any questions about these Terms, please reach out through
        our <Link to="/contact">Contact page</Link>. Telegram and GitHub issues
        are both monitored.
      </p>
    </LegalLayout>
  );
}
