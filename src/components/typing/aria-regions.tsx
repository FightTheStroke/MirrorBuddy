'use client';

export function ARIARegions() {
  return (
    <div className="hidden">
      <div id="typing-status" role="status" aria-live="polite">
      </div>
      <div id="typing-alert" role="alert" aria-live="assertive">
      </div>
      <div id="typing-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
      </div>
      <div id="typing-instruction" role="note">
      </div>
    </div>
  );
}

export function useARIALiveRegions() {
  return {
    announceStatus: (message: string) => {
      const el = document.getElementById('typing-status');
      if (el) {
        el.textContent = '';
        setTimeout(() => el.textContent = message, 100);
      }
    },
    announceAlert: (message: string) => {
      const el = document.getElementById('typing-alert');
      if (el) {
        el.textContent = '';
        setTimeout(() => el.textContent = message, 100);
      }
    },
    updateProgress: (value: number) => {
      const el = document.getElementById('typing-progress');
      if (el) {
        el.setAttribute('aria-valuenow', value.toString());
      }
    },
    updateInstruction: (message: string) => {
      const el = document.getElementById('typing-instruction');
      if (el) {
        el.textContent = message;
      }
    },
  };
}
