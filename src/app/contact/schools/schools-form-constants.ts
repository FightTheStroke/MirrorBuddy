export interface FormOption {
  value: string;
  label: string;
}

export interface FormData {
  name: string;
  email: string;
  role: string;
  schoolName: string;
  schoolType: string;
  studentCount: string;
  specificNeeds: string;
  message: string;
}

export const ROLES: FormOption[] = [
  { value: "dirigente", label: "Dirigente" },
  { value: "docente", label: "Docente" },
  { value: "segreteria", label: "Segreteria" },
  { value: "altro", label: "Altro" },
];

export const SCHOOL_TYPES: FormOption[] = [
  { value: "primaria", label: "Scuola Primaria" },
  { value: "secondaria-i", label: "Secondaria I grado" },
  { value: "secondaria-ii", label: "Secondaria II grado" },
  { value: "università", label: "Università" },
];

export const STUDENT_COUNTS: FormOption[] = [
  { value: "100", label: "Meno di 100" },
  { value: "100-500", label: "100-500" },
  { value: "500-1000", label: "500-1000" },
  { value: "1000+", label: "Più di 1000" },
];
