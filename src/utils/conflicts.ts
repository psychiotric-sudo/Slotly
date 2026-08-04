import type { CourseEntry } from "../types";
import { timeToMinutes } from "./time";

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

export interface LaidOutCourse extends CourseEntry {
  widthPercent: number;
  leftOffsetPercent: number;
  conflictCount: number;
}

/**
 * Groups courses per-day, clusters overlapping sets, and splits each cluster
 * into equal fractional columns so conflicting blocks render side-by-side.
 */
export function layoutCourses(courses: CourseEntry[]): LaidOutCourse[] {
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
      });
    }
  }

  return result;
}
