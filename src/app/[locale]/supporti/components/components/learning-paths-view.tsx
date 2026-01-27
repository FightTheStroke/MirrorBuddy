/**
 * @file learning-paths-view.tsx
 * @brief Learning paths view component
 */

import { motion } from "framer-motion";
import {
  LearningPathsList,
  LearningPathView,
  TopicDetail,
} from "@/components/education/learning-path";

interface LearningPathsViewProps {
  selectedPathId: string | null;
  selectedTopicId: string | null;
  onPathSelect: (pathId: string) => void;
  onTopicSelect: (topicId: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function LearningPathsView({
  selectedPathId,
  selectedTopicId,
  onPathSelect,
  onTopicSelect,
  onBack,
  onComplete,
}: LearningPathsViewProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {selectedTopicId && selectedPathId ? (
        <TopicDetail
          pathId={selectedPathId}
          topicId={selectedTopicId}
          onBack={onBack}
          onComplete={onComplete}
        />
      ) : selectedPathId ? (
        <LearningPathView
          pathId={selectedPathId}
          onBack={onBack}
          onTopicSelect={onTopicSelect}
        />
      ) : (
        <LearningPathsList onSelect={onPathSelect} />
      )}
    </motion.div>
  );
}
