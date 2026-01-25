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
