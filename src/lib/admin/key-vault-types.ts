/**
 * Key Vault Types
 * Type definitions for encrypted API key storage
 */

export interface SecretVaultEntry {
  id: string;
  service: string;
  keyName: string;
  encrypted: string;
  iv: string;
  authTag: string;
  status: "active" | "expired" | "rotated";
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaskedSecretVaultEntry {
  id: string;
  service: string;
  keyName: string;
  maskedValue: string;
  status: "active" | "expired" | "rotated";
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSecretRequest {
  service: string;
  keyName: string;
  value: string;
}

export interface UpdateSecretRequest {
  value?: string;
  status?: "active" | "expired" | "rotated";
}

export interface DecryptSecretResponse {
  value: string;
}
