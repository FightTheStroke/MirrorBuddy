import { X } from "lucide-react";

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  disabled?: boolean;
}

export function ModalHeader({ title, onClose, disabled }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2
        id="limit-override-title"
        className="text-lg font-semibold text-slate-900 dark:text-white"
      >
        {title}
      </h2>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        disabled={disabled}
      >
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>
  );
}
