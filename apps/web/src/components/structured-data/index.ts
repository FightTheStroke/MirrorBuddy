/**
 * Structured Data Components
 * JSON-LD schema generation and rendering for SEO
 */

export { JsonLdScript } from "./json-ld-script";
export {
  generateOrganizationSchema,
  generateEducationalOrganizationSchema,
  serializeSchemaToJson,
} from "./json-ld-organization";
export type {
  OrganizationSchema,
  EducationalOrganizationSchema,
} from "./json-ld-organization";
export { generateSoftwareApplicationSchema } from "./json-ld-software-app";
export type { SoftwareApplicationSchema } from "./json-ld-software-app";
export { generateFaqPageSchema } from "./json-ld-faq";
export type { FaqPageSchema } from "./json-ld-faq";
