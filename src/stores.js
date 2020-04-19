import { writable } from "svelte/store";

export const about = writable(
  "I help IDEMIA develop and test Card Personalization System Mobile Card Configurator."
);
export const skills = writable([
  { id: 0, text: "Python" },
  { id: 1, text: "JavaScript" },
]);
export const blockId = writable(0);
export const xpList = writable([
  {
    id: 0,
    title: "Web developer",
    employment: "Full-time",
    location: "Jakarta",
    start: "2020-04-30",
    end: {
      present: false,
      endDate: "2025-01-31",
    },
    desc: "Various projects.",
  },
  {
    id: 1,
    title: "Senior Engineer",
    employment: "Part-time",
    location: "Lampung",
    start: "2005-06-04",
    end: {
      present: true,
      endDate: "2000-01-01",
    },
    desc: "Responsible for core functionality.",
  },
]);
