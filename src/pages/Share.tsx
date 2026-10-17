import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  decodeShareToken,
  SHARE_SESSION_KEY,
  type ShareData,
} from "../utils/share";
import { formatTime12 } from "../utils/time";
import type { WeekDay } from "../types";
import "./Share.css";

const DAY_ORDER: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DAY_LABEL: Record<WeekDay, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

type ShareState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; data: ShareData };

export default function Share() {
  usePageMeta("Open a shared schedule — Slotly", "noindex, nofollow");
  const { payload } = useParams<{ payload: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<ShareState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    (async () => {
      const data = payload ? await decodeShareToken(payload) : null;
      if (!alive) return;
      setState(data ? { kind: "ready", data } : { kind: "error" });
    })();
    return () => {
      alive = false;
    };
  }, [payload]);

  const openInPlanner = () => {
    if (state.kind !== "ready" || !payload) return;
    try {
      sessionStorage.setItem(SHARE_SESSION_KEY, payload);
    } catch {
      // Storage blocked — opening would silently no-op, so stop here.
      return;
    }
    navigate("/app");
  };

  const dayGroups =
    state.kind === "ready"
      ? DAY_ORDER.map((day) => ({
          day,
          entries: state.data.courses.filter((c) => c.day === day),
        })).filter((g) => g.entries.length > 0)
      : [];

  return (
    <div className="share-page">
      <header className="share-top">
        <Link to="/" className="share-brand">
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
        </Link>
      </header>

      <main className="share-main">
        {state.kind === "loading" && (
          <div className="share-card share-card--center" role="status">
            <p className="share-loading">Opening the schedule…</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="share-card share-card--center">
            <p className="share-kicker">Share link</p>
            <h1 className="share-title">This link doesn't look right.</h1>
            <p className="share-sub">
              It may have been cut off or changed in transit. Ask whoever sent
              it for a fresh link.
            </p>
            <div className="share-actions">
              <Link className="share-btn share-btn-primary" to="/">
                Back to home
              </Link>
            </div>
          </div>
        )}

        {state.kind === "ready" && (
          <div className="share-card">
            <p className="share-kicker">Shared schedule</p>
            <h1 className="share-title">{state.data.tabName}</h1>
            <p className="share-sub">
              {state.data.courses.length} class
              {state.data.courses.length === 1 ? "" : "es"}
              {state.data.breaks.length > 0
                ? ` · ${state.data.breaks.length} break${state.data.breaks.length === 1 ? "" : "s"}`
                : ""}
              {state.data.slotMinutes ? ` · ${state.data.slotMinutes}-min slots` : ""}
            </p>

            <div className="share-days">
              {dayGroups.map((group) => (
                <section key={group.day} className="share-day">
                  <h2 className="share-day-name">{DAY_LABEL[group.day]}</h2>
                  <ul className="share-list">
                    {group.entries.map((c) => (
                      <li key={c.id} className="share-item">
                        <span className="share-item-dot" aria-hidden="true" />
                        <span className="share-item-main">
                          <strong>
                            {c.code}
                            {c.title ? ` — ${c.title}` : ""}
                          </strong>
                          <span className="share-item-meta">
                            {formatTime12(c.startTime)} – {formatTime12(c.endTime)}
                            {c.room ? ` · ${c.room}` : ""}
                            {c.instructor ? ` · ${c.instructor}` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="share-actions">
              <button
                type="button"
                className="share-btn share-btn-primary share-btn-lg"
                onClick={openInPlanner}
              >
                Open in planner
              </button>
              <Link className="share-btn share-btn-ghost share-btn-lg" to="/">
                Back to home
              </Link>
            </div>
            <p className="share-note">
              Opening it asks you to merge with your current schedule or replace
              it — nothing changes until you pick.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
