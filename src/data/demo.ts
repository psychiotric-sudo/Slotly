import type { CourseEntry, ScheduleBreak } from "../types";
import { newId } from "../utils/id";

export function buildDemoBreaks(): ScheduleBreak[] {
  return [
    { id: newId(), label: "LUNCH BREAK", startTime: "12:00", endTime: "13:00" },
  ];
}

export function buildDemoCourses(): CourseEntry[] {
  const now = Date.now();
  let n = 0;
  const make = (
    title: string,
    code: string,
    instructor: string,
    room: string,
    day: CourseEntry["day"],
    startTime: string,
    endTime: string,
    colorHex: string
  ): CourseEntry => {
    n += 1;
    return {
      id: newId(),
      title,
      code,
      instructor,
      room,
      day,
      startTime,
      endTime,
      colorHex,
      createdAt: now + n,
    };
  };

  return [
    make(
      "Data Structures & Algorithms",
      "CS 202",
      "Prof. A. Reyes",
      "Bldg 3 - Room 204",
      "MON",
      "07:30",
      "09:00",
      "#FCA5A5"
    ),
    make(
      "Linear Algebra",
      "MATH 101",
      "Dr. L. Nguyen",
      "Bldg 2 - Room 118",
      "MON",
      "09:00",
      "10:30",
      "#86EFAC"
    ),
    make(
      "Calculus II",
      "MATH 102",
      "Dr. L. Nguyen",
      "Bldg 2 - Room 120",
      "MON",
      "10:30",
      "12:00",
      "#93C5FD"
    ),
    make(
      "Computer Networks",
      "CS 310",
      "Prof. M. Okafor",
      "Bldg 3 - Lab 5",
      "TUE",
      "08:00",
      "09:30",
      "#D8B4FE"
    ),
    make(
      "Software Engineering",
      "CS 330",
      "Prof. J. Whitfield",
      "Bldg 4 - Room 301",
      "TUE",
      "10:00",
      "12:00",
      "#FDBA74"
    ),
    make(
      "Discrete Mathematics",
      "MATH 220",
      "Dr. S. Kapoor",
      "Bldg 2 - Room 210",
      "WED",
      "08:00",
      "09:30",
      "#FCA5A5"
    ),
    make(
      "Operating Systems",
      "CS 350",
      "Prof. A. Reyes",
      "Bldg 3 - Room 208",
      "WED",
      "10:00",
      "11:30",
      "#86EFAC"
    ),
    make(
      "Intro to Databases",
      "CS 340",
      "Prof. M. Okafor",
      "Bldg 3 - Lab 2",
      "THU",
      "07:30",
      "09:00",
      "#93C5FD"
    ),
    make(
      "Technical Writing",
      "ENG 210",
      "Ms. R. Delgado",
      "Bldg 1 - Room 104",
      "THU",
      "09:30",
      "11:00",
      "#FDE68A"
    ),
    make(
      "Artificial Intelligence",
      "CS 410",
      "Prof. J. Whitfield",
      "Bldg 3 - Room 212",
      "FRI",
      "09:00",
      "10:30",
      "#D8B4FE"
    ),
    make(
      "Physics I Lab",
      "PHYS 130",
      "Dr. T. Haroun",
      "Bldg 5 - Lab 1",
      "FRI",
      "13:00",
      "15:00",
      "#FDBA74"
    ),
    make(
      "PATHFIT 4 — Team Sports",
      "PE 104",
      "Coach D. Ramos",
      "Gymnasium",
      "SAT",
      "09:00",
      "11:00",
      "#FDE68A"
    ),
  ];
}
