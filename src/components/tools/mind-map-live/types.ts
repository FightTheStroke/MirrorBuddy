export interface MindMapLiveProps {
  sessionId: string;
  toolId?: string;
  title?: string;
  initialContent?: string;
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export type LiveStatus = 'connecting' | 'waiting' | 'building' | 'complete' | 'error';

export interface UseMindMapLiveOptions {
  sessionId: string;
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
}

