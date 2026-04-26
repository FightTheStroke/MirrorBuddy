import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TosModalProps {
  open: boolean;
  title?: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function TosModal({
  open,
  title = 'Terms of Service',
  onOpenChange,
  children,
}: TosModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
