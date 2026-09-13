/** Safe identity projection. Never contains a bearer, session handle or hash. */
export type ClientIdentity =
  | { status: 'pending' }
  | { status: 'anonymous' }
  | { status: 'unavailable'; reason: string }
  | {
      status: 'authenticated';
      userId: string;
      role: 'USER' | 'ADMIN' | 'ADMIN_READONLY';
      legacyOrigin: boolean;
      needsLegacyUpgrade: boolean;
    };
