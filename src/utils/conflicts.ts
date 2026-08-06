import type { CourseEntry, ScheduleBreak, WeekDay } from "../types";
import { timeToMinutes } from "./time";
import { courseGroupKey, subjectKey } from "./colors";

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  return as < be && bs < ae;
}

export function findConflicts(courses: CourseEntry[], candidate: CourseEntry): CourseEntry[] {
  return courses.filter((existing) => {
    if (existing.id === candidate.id) return false;
    if (existing.day !== candidate.day) return false;
    return rangesOverlap(existing.startTime, existing.endTime, candidate.startTime, candidate.endTime);
  });
}

export interface ConflictPair {
  kind: "overlap" | "break";
  /** First course in the clash (for a break clash, the course that hits the break). */
  a: CourseEntry;
  /** The other course, when two courses overlap. */
  b?: CourseEntry;
  /** The break a course runs into, when `kind` is "break". */
  br?: ScheduleBreak;
  day: WeekDay;
  startMin: number;
  endMin: number;
  overlapMinutes: number;
}

const DAY_ORDER: Record<WeekDay, number> = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6,
};

/**
 * Lists every actual clash in the schedule:
 * - two courses overlapping on the same day (each pair once), and
 * - a course that runs into a scheduled break.
 * Sorted by weekday then by the start of the overlap.
 */
export function findConflictPairs(
  courses: CourseEntry[],
  breaks: ScheduleBreak[] = []
): ConflictPair[] {
  const pairs: ConflictPair[] = [];

  const byDay = new Map<WeekDay, CourseEntry[]>();
  for (const course of courses) {
    const list = byDay.get(course.day) ?? [];
    list.push(course);
    byDay.set(course.day, list);
  }

  for (const [, dayCourses] of byDay) {
    for (let i = 0; i < dayCourses.length; i++) {
      for (let j = i + 1; j < dayCourses.length; j++) {
        const a = dayCourses[i];
        const b = dayCourses[j];
        if (!rangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
        const startMin = Math.max(timeToMinutes(a.startTime), timeToMinutes(b.startTime));
        const endMin = Math.min(timeToMinutes(a.endTime), timeToMinutes(b.endTime));
        pairs.push({
          kind: "overlap",
          a,
          b,
          day: a.day,
          startMin,
          endMin,
          overlapMinutes: endMin - startMin,
        });
      }
    }
  }

  for (const course of courses) {
    for (const br of breaks) {
      if (!rangesOverlap(course.startTime, course.endTime, br.startTime, br.endTime)) continue;
      const startMin = Math.max(timeToMinutes(course.startTime), timeToMinutes(br.startTime));
      const endMin = Math.min(timeToMinutes(course.endTime), timeToMinutes(br.endTime));
      pairs.push({
        kind: "break",
        a: course,
        br,
        day: course.day,
        startMin,
        endMin,
        overlapMinutes: endMin - startMin,
      });
    }
  }

  return pairs.sort(
    (x, y) => DAY_ORDER[x.day] - DAY_ORDER[y.day] || x.startMin - y.startMin
  );
}

export interface SectionFit {
  /** courseGroupKey of the section. */
  key: string;
  /** Total clashes in the schedule when THIS section is the one kept (alternatives excluded). */
  conflicts: number;
  /** True when this section has the fewest clashes among its subject's alternatives. */
  best: boolean;
  /** Number of alternative sections the subject offers. */
  total: number;
}

/**
 * For subjects that offer multiple sections (e.g. "Surveying" Sec A and Sec B),
 * evaluates each section against a schedule that keeps only that section, so a
 * back-subject section clashing with the fixed load can be spotted and the best
 * (fewest-clash) section recommended. Returns a map keyed by courseGroupKey.
 */
export function findBestSectionFits(
  courses: CourseEntry[],
  breaks: ScheduleBreak[] = []
): Map<string, SectionFit> {
  const fits = new Map<string, SectionFit>();
  const bySubject = new Map<string, Set<string>>();
  for (const c of courses) {
    const subject = subjectKey(c);
    let set = bySubject.get(subject);
    if (!set) {
      set = new Set();
      bySubject.set(subject, set);
    }
    set.add(courseGroupKey(c));
  }

  for (const [subject, keys] of bySubject) {
    if (keys.size < 2) continue;
    const scores = new Map<string, number>();
    for (const key of keys) {
      const kept = courses.filter(
        (c) => courseGroupKey(c) === key || subjectKey(c) !== subject
      );
      scores.set(key, findConflictPairs(kept, breaks).length);
    }
    const min = Math.min(...scores.values());
    for (const [key, conflicts] of scores) {
      fits.set(key, { key, conflicts, best: conflicts === min, total: keys.size });
    }
  }
  return fits;
}

export interface LaidOutCourse extends CourseEntry {
  widthPercent: number;
  leftOffsetPercent: number;
  conflictCount: number;
  /** True when this course overlaps a scheduled break (recess/lunch). */
  overlapsBreak: boolean;
}

/**
 * Groups courses per-day, clusters overlapping sets, and splits each cluster
 * into equal fractional columns so conflicting blocks render side-by-side.
 * Also flags any course that overlaps a break as a conflict.
 */
export function layoutCourses(
  courses: CourseEntry[],
  breaks: { startTime: string; endTime: string }[] = []
): LaidOutCourse[] {
  const byDay = new Map<string, CourseEntry[]>();
  for (const course of courses) {
    const list = byDay.get(course.day) ?? [];
    list.push(course);
    byDay.set(course.day, list);
  }

  const result: LaidOutCourse[] = [];

  for (const [, dayCourses] of byDay) {
    const sorted = [...dayCourses].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const clusters: CourseEntry[][] = [];
    for (const course of sorted) {
      let placed = false;
      for (const cluster of clusters) {
        const touches = cluster.some((c) =>
          rangesOverlap(c.startTime, c.endTime, course.startTime, course.endTime)
        );
        if (touches) {
          cluster.push(course);
          placed = true;
          break;
        }
      }
      if (!placed) {
        clusters.push([course]);
      }
    }

    const indexInCluster = new Map<string, number>();
    const clusterSize = new Map<string, number>();
    for (const cluster of clusters) {
      cluster.forEach((course, i) => {
        indexInCluster.set(course.id, i);
        clusterSize.set(course.id, cluster.length);
      });
    }

    for (const course of sorted) {
      const i = indexInCluster.get(course.id) ?? 0;
      const n = clusterSize.get(course.id) ?? 1;
      result.push({
        ...course,
        widthPercent: 100 / n,
        leftOffsetPercent: (100 / n) * i,
        conflictCount: n - 1,
        overlapsBreak: breaks.some((b) =>
          rangesOverlap(course.startTime, course.endTime, b.startTime, b.endTime)
        ),
      });
    }
  }

  return result;
}
