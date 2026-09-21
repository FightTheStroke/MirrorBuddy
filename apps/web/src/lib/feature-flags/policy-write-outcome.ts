import type { PolicyWriteReceipt } from './policy-write-types';

export class PolicyWriteSuperseded extends Error {
  constructor(readonly receipt: PolicyWriteReceipt) {
    super('Policy write superseded by another operation');
    this.name = 'PolicyWriteSuperseded';
  }
}

export function requireConfirmedPolicy(receipt: PolicyWriteReceipt): PolicyWriteReceipt {
  if (receipt.persistence !== 'confirmed' || receipt.superseded) {
    throw new PolicyWriteSuperseded(receipt);
  }
  return receipt;
}
