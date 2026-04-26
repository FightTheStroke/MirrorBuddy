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

// Translation keys for form options
// These are used with useTranslations('contact.schools_form.options')

export const ROLES: FormOption[] = [
  { value: "dirigente", label: "contact.schools_form.options.roles.dirigente" },
  { value: "docente", label: "contact.schools_form.options.roles.docente" },
  {
    value: "segreteria",
    label: "contact.schools_form.options.roles.segreteria",
  },
  { value: "altro", label: "contact.schools_form.options.roles.altro" },
];

export const SCHOOL_TYPES: FormOption[] = [
  {
    value: "primaria",
    label: "contact.schools_form.options.schoolTypes.primaria",
  },
  {
    value: "secondaria-i",
    label: "contact.schools_form.options.schoolTypes.secondariaI",
  },
  {
    value: "secondaria-ii",
    label: "contact.schools_form.options.schoolTypes.secondariaII",
  },
  {
    value: "università",
    label: "contact.schools_form.options.schoolTypes.universita",
  },
];

export const STUDENT_COUNTS: FormOption[] = [
  {
    value: "100",
    label: "contact.schools_form.options.studentCounts.lessThan100",
  },
  {
    value: "100-500",
    label: "contact.schools_form.options.studentCounts.range100To500",
  },
  {
    value: "500-1000",
    label: "contact.schools_form.options.studentCounts.range500To1000",
  },
  {
    value: "1000+",
    label: "contact.schools_form.options.studentCounts.moreThan1000",
  },
];
