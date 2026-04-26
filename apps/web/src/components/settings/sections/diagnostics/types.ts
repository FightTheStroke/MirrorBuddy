export type DiagnosticStatus = 'idle' | 'running' | 'success' | 'error';

export interface DiagnosticResult {
  status: DiagnosticStatus;
  message?: string;
  details?: string;
}
