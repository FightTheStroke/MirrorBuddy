'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { SubjectConfirmationDialog } from './subject-confirmation-dialog';
import { useHomeworkHelp } from './homework-help-view/hooks/use-homework-help';
import { useMaieuticChat } from './homework-help-view/hooks/use-maieutic-chat';
import { HomeworkHeader } from './homework-help-view/components/homework-header';
import { HistoryPanel } from './homework-help-view/components/history-panel';
import { MaieuticChatPanel } from './homework-help-view/components/maieutic-chat-panel';
import { cn } from '@/lib/utils';

const HomeworkHelp = dynamic(
  () => import('./homework-help').then((mod) => mod.HomeworkHelp),
  { ssr: false }
);

export function HomeworkHelpView() {
  const {
    currentHomework,
    showHistory,
    setShowHistory,
    showSubjectDialog,
    setShowSubjectDialog,
    detectedSubject,
    pendingHomework,
    setPendingHomework,
    connectedMaestro,
    displayHistory,
    historyLoading,
    handleSubjectConfirm,
    handleSubmitPhoto,
    handleCompleteStep,
    loadHomework,
    deleteHomework,
    startNew,
  } = useHomeworkHelp();

  const {
    maieuticChat,
    isLoadingChat,
    sendMaieuticMessage,
    addMessage,
    clearChat: _clearChat,
  } = useMaieuticChat(currentHomework, connectedMaestro);

  const [chatInput, setChatInput] = useState('');

  const handleAskQuestion = useCallback((question: string) => {
    addMessage({
      role: 'user',
      content: question,
      timestamp: new Date(),
    });
    setChatInput('');
    setTimeout(() => sendMaieuticMessage(question), 0);
  }, [addMessage, sendMaieuticMessage]);

  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim() || isLoadingChat) return;
    handleAskQuestion(chatInput);
  }, [chatInput, isLoadingChat, handleAskQuestion]);

  return (
    <div className="space-y-6">
      <HomeworkHeader
        connectedMaestro={connectedMaestro}
        hasCurrentHomework={!!currentHomework}
        historyCount={displayHistory.length}
        showHistory={showHistory}
        onNewProblem={startNew}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn('lg:col-span-2', showHistory && 'lg:col-span-2')}>
          {showSubjectDialog ? (
            <SubjectConfirmationDialog
              key={pendingHomework?.id || detectedSubject}
              detectedSubject={detectedSubject}
              isOpen={showSubjectDialog}
              photoPreview={pendingHomework?.photoUrl}
              onConfirm={handleSubjectConfirm}
              onClose={() => {
                setShowSubjectDialog(false);
                setPendingHomework(null);
              }}
            />
          ) : (
            <HomeworkHelp
              homework={currentHomework || undefined}
              onSubmitPhoto={handleSubmitPhoto}
              onCompleteStep={handleCompleteStep}
              onAskQuestion={handleAskQuestion}
            />
          )}
        </div>

        <div className="space-y-4">
          <HistoryPanel
            isOpen={showHistory}
            history={displayHistory}
            currentHomework={currentHomework}
            isLoading={historyLoading}
            onClose={() => setShowHistory(false)}
            onSelect={loadHomework}
            onDelete={deleteHomework}
          />

          {currentHomework && (
            <MaieuticChatPanel
              chat={maieuticChat}
              input={chatInput}
              isLoading={isLoadingChat}
              onInputChange={setChatInput}
              onSubmit={handleChatSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
