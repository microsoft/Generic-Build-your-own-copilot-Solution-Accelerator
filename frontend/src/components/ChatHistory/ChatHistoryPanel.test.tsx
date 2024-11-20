import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppStateContext } from '../../state/AppProvider';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { ChatHistoryLoadingState, ChatMessage, Conversation, CosmosDBStatus, Feedback } from '../../api';
import * as api from '../../api';

// Mock the API function
jest.mock('../../api/api', () => ({
    historyDeleteAll: jest.fn(),
    historyDelete: jest.fn(),
    historyGenerate: jest.fn(),
    historyUpdate: jest.fn(),
    historyClear: jest.fn(),
    historyEnsure: jest.fn()

  }));
// Define a mock ChatMessage
const mockMessage: ChatMessage = {
    id: 'msg1',
    role: 'user',
    content: 'This is a mock message for testing purposes.',
    end_turn: true,
    date: '2024-01-01T12:00:00Z',
    feedback: Feedback.Positive,
    context: 'Previous messages or context information',
  };
// Define a mock Conversation
const mockConversation: Conversation = {
    id: '1',
    title: 'Mock Conversation 1',
    messages: [mockMessage], 
    date: '2024-01-01T00:00:00Z',
  };
// Mock initial state for the context
const mockState = {
    chatHistoryLoadingState: ChatHistoryLoadingState.Success,
    isCosmosDBAvailable: { cosmosDB: true,  status: CosmosDBStatus.NotConfigured },
    chatHistory: [],
    isChatHistoryOpen: true,
    filteredChatHistory: [],
    currentChat: null,
    browseChat: mockConversation, // This should be a valid Conversation[]
    generateChat: null, // Adjust as necessary
    frontendSettings: {}, // Adjust as necessary
    feedbackState: {}, // Adjust as necessary
    draftedDocument: null, // Adjust as necessary
    draftedDocumentTitles: [], // Adjust as necessary
    draftedDocumentTitle: 'Some Title', // Ensure this is included
  };
  
const mockDispatch = jest.fn();
const renderComponent = (state = mockState) => {
    return render(
      <AppStateContext.Provider value={{ state, dispatch: mockDispatch }}>
        <ChatHistoryPanel />
      </AppStateContext.Provider>
    );
  };
  

describe('ChatHistoryPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the chat history panel header', () => {
    renderComponent();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Template history');
  });

  test('shows loading spinner when loading chat history', () => {
    const loadingState = { ...mockState, chatHistoryLoadingState: ChatHistoryLoadingState.Loading };
    renderComponent(loadingState);
    expect(screen.getByText('Loading chat history')).toBeInTheDocument();
  });

  test('shows error message when loading fails', () => {
    const errorState = { ...mockState, chatHistoryLoadingState: ChatHistoryLoadingState.Fail, isCosmosDBAvailable: { cosmosDB: false,status:  CosmosDBStatus.NotConfigured} };
    renderComponent(errorState);
    expect(screen.getByText("Template history can't be saved at this time")).toBeInTheDocument();
  });

  test('displays chat history when loaded successfully', () => {
    const successState = { ...mockState, chatHistoryLoadingState: ChatHistoryLoadingState.Success, isCosmosDBAvailable: { cosmosDB: true,status:  CosmosDBStatus.Working} };
    renderComponent(successState);
    expect(screen.getByText('Template history')).toBeInTheDocument(); // Adjust according to what ChatHistoryList renders
  });

  test('opens clear all chat history dialog when button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByText(/Clear all chat history/i));
    expect(screen.getByText(/Are you sure you want to clear all chat history/i)).toBeInTheDocument();
  });

  test('calls the clear all history function when confirmed', async () => {
    (api.historyDeleteAll as jest.Mock).mockResolvedValueOnce({ ok: true });
    renderComponent();

    fireEvent.click(screen.getByText(/Clear all chat history/i));

    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));

    await waitFor(() => {
      expect(api.historyDeleteAll).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'DELETE_CHAT_HISTORY' });
    });
  });

  // test('shows an error message if clearing chat history fails', async () => {
  //   (api.historyDeleteAll as jest.Mock).mockResolvedValueOnce({ ok: false });
  //   renderComponent();

  //   fireEvent.click(screen.getByText(/Clear all chat history/i));
  //   fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));

  //   await waitFor(() => {
  //     expect(screen.getByText(/Error deleting all of chat history/i)).toBeInTheDocument();
  //   });
  // });
});
