/**
 * Deployments that refused a custom temperature in this process.
 *
 * GPT-5/6 class deployments accept only their default temperature. Remembering
 * the refusal spares every later request a guaranteed 400 and a second round-trip.
 */
const refusedTemperature = new Set<string>();

export function acceptsCustomTemperature(deployment: string): boolean {
  return !refusedTemperature.has(deployment);
}

/** Records the refusal and returns false, the new "include temperature" value. */
export function rememberTemperatureRefusal(deployment: string): false {
  refusedTemperature.add(deployment);
  return false;
}

export function forgetTemperatureRefusals(): void {
  refusedTemperature.clear();
}
