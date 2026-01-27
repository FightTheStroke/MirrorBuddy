/**
 * MirrorBuddycation Maestri - Index
 * Auto-generated from CLI markdown files
 */
import type { MaestroFull } from "./types";
import { leonardo } from "./leonardo";
import { galileo } from "./galileo";
import { curie } from "./curie";
import { cicerone } from "./cicerone";
import { lovelace } from "./lovelace";
import { smith } from "./smith";
import { shakespeare } from "./shakespeare";
import { humboldt } from "./humboldt";
import { erodoto } from "./erodoto";
import { manzoni } from "./manzoni";
import { euclide } from "./euclide";
import { mozart } from "./mozart";
import { socrate } from "./socrate";
import { ippocrate } from "./ippocrate";
import { feynman } from "./feynman";
import { darwin } from "./darwin";
import { chris } from "./chris";
import { omero } from "./omero";
import { alexPina } from "./alex-pina";
import { mascetti } from "./mascetti";
import { simone } from "./simone";
import { cassese } from "./cassese";
import { moliere } from "./moliere";
import { goethe } from "./goethe";
import { cervantes } from "./cervantes";

export type { MaestroFull } from "./types";
export { SAFETY_GUIDELINES } from "./types";

export const maestri: MaestroFull[] = [
  leonardo,
  galileo,
  curie,
  cicerone,
  lovelace,
  smith,
  shakespeare,
  humboldt,
  erodoto,
  manzoni,
  euclide,
  mozart,
  socrate,
  ippocrate,
  feynman,
  darwin,
  chris,
  omero,
  alexPina,
  mascetti,
  simone,
  cassese,
  moliere,
  goethe,
  cervantes,
];

export const getMaestroById = (id: string): MaestroFull | undefined => {
  return maestri.find((m) => m.id === id);
};

export const getMaestriBySubject = (subject: string): MaestroFull[] => {
  return maestri.filter((m) => m.subject === subject);
};

export const getAllMaestri = (): MaestroFull[] => {
  return maestri;
};

export const getAllSubjects = (): string[] => {
  return Array.from(new Set(maestri.map((m) => m.subject))).sort();
};

export const SUBJECT_NAMES: Record<string, string> = {
  chemistry: "Chimica",
  history: "Storia",
  physics: "Fisica",
  astronomy: "Astronomia",
  geography: "Geografia",
  "physical-education": "Educazione Fisica",
  art: "Arte",
  "computer-science": "Informatica",
  italian: "Italiano",
  music: "Musica",
  english: "Inglese",
  spanish: "Spagnolo",
  french: "Francese",
  german: "Tedesco",
  economics: "Economia",
  philosophy: "Filosofia",
  "civic-education": "Educazione Civica",
  storytelling: "Storytelling",
  mathematics: "Matematica",
  biology: "Biologia",
  civics: "Educazione Civica",
  computerScience: "Informatica",
  health: "Salute",
  internationalLaw: "Diritto Internazionale",
  supercazzola: "Supercazzola",
  sport: "Sport",
};
