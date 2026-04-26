export type BucketRanges = Record<string, readonly [number, number]>;

const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

/**
 * Deterministically maps a user to one of 100 buckets (0..99)
 * using FNV-1a over experiment name + user id.
 */
export function hashBucket(userId: string, experimentName: string): number {
  const input = `${experimentName}:${userId}`;
  let hash = FNV_OFFSET_BASIS_32;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME_32) >>> 0;
  }

  return hash % 100;
}

export function assignBucket(
  userId: string,
  experimentName: string,
  bucketRanges: BucketRanges,
): string {
  const bucket = hashBucket(userId, experimentName);

  for (const [label, [start, end]] of Object.entries(bucketRanges)) {
    if (bucket >= start && bucket <= end) {
      return label;
    }
  }

  throw new Error(`No matching bucket range for bucket ${bucket}`);
}
