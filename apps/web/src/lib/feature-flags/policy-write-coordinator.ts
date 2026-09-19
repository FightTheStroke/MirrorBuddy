import {
  isBlocked,
  restrictivePatch,
  PolicyWriteError,
  type PolicyActivationToken,
  type PolicyPatch,
  type PolicyState,
  type PolicyWriteOperation,
  type PolicyWriteReceipt,
  type PolicyWriteSource,
} from './policy-write-types';

interface Control {
  versions: Map<string, number>;
  safety: number;
  token?: PolicyActivationToken;
}

function fields(patch: PolicyPatch): string[] {
  return [
    ...Object.keys(patch).filter((key) => key !== 'metadata' && key !== 'killSwitchReason'),
    ...Object.keys(patch.metadata ?? {}).map((key) => `metadata:${key}`),
  ];
}

export class PolicyWriteCoordinator {
  private controls = new Map<string, Control>();
  private queues = new Map<string, Promise<void>>();
  private clock = 0;
  private epoch = 0;

  constructor(
    private readonly read: (key: string) => PolicyState,
    private readonly apply: (key: string, patch: PolicyPatch) => void,
  ) {}

  write(
    key: string,
    input: PolicyPatch,
    source: PolicyWriteSource,
    persist: (patch: PolicyPatch) => Promise<void>,
    token?: PolicyActivationToken,
  ): PolicyWriteOperation {
    if (typeof key !== 'string' || !key || !input || typeof input !== 'object') {
      throw new TypeError('A policy control and patch are required');
    }
    const patch = structuredClone(input);
    const before = this.read(key);
    const restrictions = restrictivePatch(before, patch);
    const restrictiveFields = fields(restrictions);
    const permissive = ['killSwitch', 'status', 'enabledPercentage'].some(
      (field) => fields(patch).includes(field) && !restrictiveFields.includes(field),
    );
    const control: Control = this.controls.get(key) ?? {
      versions: new Map<string, number>(),
      safety: 0,
    };
    this.controls.set(key, control);
    const receipt = (
      persistence: PolicyWriteReceipt['persistence'],
      superseded: boolean,
    ): PolicyWriteReceipt => ({
      persistence,
      superseded,
      scope: 'instance',
      effective: structuredClone(this.read(key)),
    });
    if (permissive && source !== 'admin' && (!token || control.token !== token)) {
      if (restrictiveFields.length) {
        const protection = this.write(
          key,
          { ...restrictions, updatedBy: patch.updatedBy },
          source,
          persist,
        );
        return {
          activation: protection.activation,
          completion: protection.completion.then((result) => ({ ...result, superseded: true })),
        };
      }
      return { completion: Promise.resolve(receipt('skipped', true)) };
    }
    const generation = ++this.clock;
    const epoch = this.epoch;
    let activation: PolicyActivationToken | undefined;
    if (restrictiveFields.length) {
      if (
        before.safetyKnown !== false &&
        (!isBlocked(before) || control.token?.source === source)
      ) {
        activation = Object.freeze({ key, source, generation });
      }
      control.token = activation;
      control.safety = generation;
      this.apply(key, restrictions);
    }
    const safety = control.safety;
    const changed = fields(patch);
    changed.forEach((field) => control.versions.set(field, generation));
    const current = (field: string) =>
      epoch === this.epoch &&
      control.versions.get(field) === generation &&
      (!permissive || control.safety === safety);
    const superseded = () => changed.some((field) => field !== 'updatedBy' && !current(field));
    const unsafeRelease = () =>
      epoch !== this.epoch ||
      control.safety !== safety ||
      ['killSwitch', 'status', 'enabledPercentage'].some(
        (field) => changed.includes(field) && control.versions.get(field) !== generation,
      );
    const run = async (): Promise<PolicyWriteReceipt> => {
      if (epoch !== this.epoch || (permissive && unsafeRelease())) return receipt('skipped', true);
      try {
        await persist(structuredClone(patch));
        const metadata = Object.fromEntries(
          Object.entries(patch.metadata ?? {}).filter(([field]) => current(`metadata:${field}`)),
        );
        const acknowledged: PolicyPatch = {
          ...(patch.killSwitch !== undefined &&
            current('killSwitch') && {
              killSwitch: patch.killSwitch,
              killSwitchReason: patch.killSwitchReason,
            }),
          ...(patch.status !== undefined && current('status') && { status: patch.status }),
          ...(patch.enabledPercentage !== undefined &&
            current('enabledPercentage') && {
              enabledPercentage: patch.enabledPercentage,
            }),
          ...(patch.updatedBy !== undefined &&
            current('updatedBy') && { updatedBy: patch.updatedBy }),
          ...(Object.keys(metadata).length > 0 && { metadata }),
        };
        if (epoch === this.epoch) {
          if (Object.keys(acknowledged).length) this.apply(key, acknowledged);
          if (!isBlocked(this.read(key))) control.token = undefined;
        }
        return receipt('confirmed', superseded());
      } catch (cause) {
        throw new PolicyWriteError(structuredClone(this.read(key)), cause);
      }
    };
    const completion = (this.queues.get(key) ?? Promise.resolve()).then(run);
    const settled = completion
      .then(
        () => undefined,
        () => undefined,
      )
      .finally(() => {
        if (this.queues.get(key) === settled) this.queues.delete(key);
      });
    this.queues.set(key, settled);
    return { activation, completion };
  }

  reset(): void {
    this.epoch++;
    this.controls.clear();
    this.queues.clear();
  }
}
