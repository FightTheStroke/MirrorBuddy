/** Browser camera limitations that have actionable, localized UI guidance. */
export function getCameraAccessError(error: unknown) {
  const name =
    error !== null && typeof error === 'object' && 'name' in error ? error.name : undefined;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return { key: 'permission', type: 'permission' } as const;
    case 'NotSupportedError':
      return { key: 'unsupported', type: 'unavailable' } as const;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return { key: 'unavailable', type: 'unavailable' } as const;
    case 'NotReadableError':
    case 'TrackStartError':
      return { key: 'inUse', type: 'unavailable' } as const;
    default:
      return null;
  }
}
