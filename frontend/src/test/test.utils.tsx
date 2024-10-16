// test-utils.tsx
import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { AppStateContext } from '../state/AppProvider';
import { Conversation, ChatHistoryLoadingState } from '../api/models'; 
// Default mock state
const defaultMockState = {
  isChatHistoryOpen: true,
  chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
  isCosmosDBAvailable: { cosmosDB: true, status: 'success' },
  chatHistory: [],
  filteredChatHistory: null,
  currentChat: null,
  browseChat: null,
  generateChat:null,
  frontendSettings: null,
  feedbackState: {},
  draftedDocument: null,
  draftedDocumentTitle: ''
};

// Create a custom render function
const renderWithContext = (
  component: React.ReactElement,
  contextState = {}
): RenderResult => {
  const state = { ...defaultMockState, ...contextState };
  return render(
    <AppStateContext.Provider value={{ state, dispatch: jest.fn() }}>
      {component}
    </AppStateContext.Provider>
  );
};

export * from '@testing-library/react';
export { renderWithContext };
