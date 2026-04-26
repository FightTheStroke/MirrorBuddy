import Script from "next/script";
import type { ScriptProps } from "next/script";

/**
 * NonceScript - Script component with CSP nonce support
 *
 * Usage in Server Component:
 * ```tsx
 * import { getNonce } from '@/lib/security/csp-nonce';
 * import { NonceScript } from '@/components/nonce-script';
 *
 * export default async function MyPage() {
 *   const nonce = await getNonce();
 *   return <NonceScript src="/my-script.js" nonce={nonce} />;
 * }
 * ```
 *
 * For inline scripts:
 * ```tsx
 * <NonceScript nonce={nonce}>
 *   {`console.log('hello');`}
 * </NonceScript>
 * ```
 */
interface NonceScriptProps extends Omit<ScriptProps, "nonce"> {
  /**
   * CSP nonce from getNonce()
   * Pass undefined to render script without nonce (not recommended for inline scripts)
   */
  nonce?: string;
}

export function NonceScript({ nonce, ...props }: NonceScriptProps) {
  // Next.js Script component automatically handles nonce attribute
  // If nonce is undefined, the script will still work but won't have CSP nonce
  return <Script {...props} nonce={nonce} />;
}
