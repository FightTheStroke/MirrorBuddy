/**
 * @file create-mindmap-modal.tsx
 * @brief Create mindmap modal component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subjectNames, subjectIcons } from '@/data';
import type { Subject } from '@/types';

interface Topic {
  name: string;
  subtopics: string[];
}

interface CreateMindmapModalProps {
  isOpen: boolean;
  title: string;
  subject: Subject;
  topics: Topic[];
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onSubjectChange: (subject: Subject) => void;
  onAddTopic: () => void;
  onUpdateTopicName: (index: number, name: string) => void;
  onRemoveTopic: (index: number) => void;
  onAddSubtopic: (topicIndex: number) => void;
  onUpdateSubtopic: (topicIndex: number, subtopicIndex: number, value: string) => void;
  onRemoveSubtopic: (topicIndex: number, subtopicIndex: number) => void;
  onCreate: () => void;
}

export function CreateMindmapModal({
  isOpen,
  title,
  subject,
  topics,
  onClose,
  onTitleChange,
  onSubjectChange,
  onAddTopic,
  onUpdateTopicName,
  onRemoveTopic,
  onAddSubtopic,
  onUpdateSubtopic,
  onRemoveSubtopic,
  onCreate,
}: CreateMindmapModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold">Crea Nuova Mappa Mentale</h3>
              <button
                onClick={onClose}
                className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titolo della mappa
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Es: Rivoluzione Francese, Teorema di Pitagora..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Materia</label>
                <select
                  value={subject}
                  onChange={(e) => onSubjectChange(e.target.value as Subject)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(subjectNames).map(([key, name]) => (
                    <option key={key} value={key}>
                      {subjectIcons[key as Subject]} {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Argomenti principali
                </label>
                <div className="space-y-4">
                  {topics.map((topic, topicIndex) => (
                    <div
                      key={topicIndex}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={topic.name}
                          onChange={(e) =>
                            onUpdateTopicName(topicIndex, e.target.value)
                          }
                          placeholder={`Argomento ${topicIndex + 1}`}
                          className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {topics.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveTopic(topicIndex)}
                            className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="ml-4 space-y-2">
                        {topic.subtopics.map((subtopic, subtopicIndex) => (
                          <div key={subtopicIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={subtopic}
                              onChange={(e) =>
                                onUpdateSubtopic(
                                  topicIndex,
                                  subtopicIndex,
                                  e.target.value
                                )
                              }
                              placeholder={`Sotto-argomento ${subtopicIndex + 1}`}
                              className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {topic.subtopics.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  onRemoveSubtopic(topicIndex, subtopicIndex)
                                }
                                className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddSubtopic(topicIndex)}
                          className="text-slate-600 dark:text-slate-400"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Aggiungi sotto-argomento
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddTopic}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Aggiungi argomento
                </Button>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button
                onClick={onCreate}
                disabled={!title.trim() || !topics.some((t) => t.name.trim())}
              >
                <Save className="w-4 h-4 mr-2" />
                Crea Mappa
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

