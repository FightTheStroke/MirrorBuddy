export function describeCameraError(error: unknown) {
  const details = error && typeof error === 'object' ? error : {};
  const name =
    'name' in details && typeof details.name === 'string' ? details.name : 'UnknownError';
  const message =
    'message' in details && typeof details.message === 'string' ? details.message : String(error);
  const matches = (names: string[], hints: string[]) =>
    names.includes(name) || hints.some((hint) => message.includes(hint));
  if (
    matches(
      ['NotAllowedError', 'PermissionDeniedError'],
      ['Permission', 'NotAllowedError', 'permission denied'],
    )
  ) {
    return {
      name,
      message,
      type: 'permission' as const,
      retryDevice: false,
      text: "Permesso fotocamera negato. Abilita l'accesso alla fotocamera nelle impostazioni del browser.",
    };
  }
  if (
    matches(
      ['NotFoundError', 'DevicesNotFoundError'],
      ['NotFoundError', 'DevicesNotFoundError', 'no camera'],
    )
  ) {
    return {
      name,
      message,
      type: 'unavailable' as const,
      retryDevice: false,
      text: 'Nessuna fotocamera trovata. Collega una webcam o usa un dispositivo con fotocamera.',
    };
  }
  if (matches(['NotReadableError', 'TrackStartError'], ['NotReadableError', 'in use', 'busy'])) {
    return {
      name,
      message,
      type: 'unavailable' as const,
      retryDevice: false,
      text: "La fotocamera è già in uso da un'altra applicazione. Chiudi le altre app e riprova.",
    };
  }
  return {
    name,
    message,
    type: 'unavailable' as const,
    retryDevice: true,
    text: 'Impossibile accedere alla fotocamera. Riprova.',
  };
}
