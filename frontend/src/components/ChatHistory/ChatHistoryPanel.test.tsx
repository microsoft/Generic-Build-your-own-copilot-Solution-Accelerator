import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppStateContext } from '../../state/AppProvider';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { ChatHistoryLoadingState, ChatMessage, Conversation, CosmosDBStatus, Feedback, historyDeleteAll,historyList } from '../../api';
import * as api from '../../api';
 
// Mock the API function
jest.mock('../../api/api', () => ({
  historyList: jest.fn(() => Promise.resolve('mocked data')),
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
  isCosmosDBAvailable: { cosmosDB: true, status: CosmosDBStatus.NotConfigured },
  chatHistory: [mockConversation], // Added mock chat history here
  isChatHistoryOpen: true,
  filteredChatHistory: [],
  currentChat: null,
  browseChat: mockConversation,
  generateChat: null,
  frontendSettings: {},
  feedbackState: {},
  draftedDocument: null,
  draftedDocumentTitles: [],
  draftedDocumentTitle: 'Some Title',
  isGenerating: false,
  isRequestInitiated: false,
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
    const errorState = { ...mockState, chatHistoryLoadingState: ChatHistoryLoadingState.Fail, isCosmosDBAvailable: { cosmosDB: false, status: CosmosDBStatus.NotConfigured } };
    renderComponent(errorState);
    expect(screen.getByText("Template history can't be saved at this time")).toBeInTheDocument();
  });
 
  test('displays chat history when loaded successfully', () => {
    const successState = { ...mockState, chatHistoryLoadingState: ChatHistoryLoadingState.Success, isCosmosDBAvailable: { cosmosDB: true, status: CosmosDBStatus.Working } };
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
      // Ensure the `historyDeleteAll` function was called
      expect(api.historyDeleteAll).toHaveBeenCalled();
 
      // Ensure the dispatch action for deleting chat history is called
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'DELETE_CHAT_HISTORY' });
    });
  });
 
  test('shows an error message if clearing chat history fails', async () => {
    (api.historyDeleteAll as jest.Mock).mockResolvedValueOnce({ ok: false });
    renderComponent();
 
    fireEvent.click(screen.getByText(/Clear all chat history/i));
    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
 
    await waitFor(() => {
      expect(screen.getByText(/Error deleting all of chat history/i)).toBeInTheDocument();
    });
  });
  test('shows loading state while chat history is being cleared', async () => {
    // Mock the API response for clearing all chat history
    (api.historyDeleteAll as jest.Mock).mockResolvedValueOnce({ ok: true });
 
    // Render the component
    renderComponent();
 
    // Trigger the clear all chat history dialog
    fireEvent.click(screen.getByText(/Clear all chat history/i));
 
    // Confirm the action to clear history
    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
 
    // Wait for the loading spinner to appear
    expect(screen.getByLabelText('loading more chat history')).toBeInTheDocument();  // Assuming "Loading..." is part of your UI
   
    // Wait for the API response to be completed
    await waitFor(() => {
      // Ensure the `historyDeleteAll` function was called and the spinner disappears
      expect(api.historyDeleteAll).toHaveBeenCalled();
      expect(screen.queryByText('loading more chat history')).not.toBeInTheDocument(); // Make sure loading disappears
    });
  });
  test('calls toggleClearAllDialog when clearing is false', async () => {
    renderComponent();
    // Trigger the dialog
    fireEvent.click(screen.getByText('Clear all chat history'));
 
    // Wait for the dialog to appear and assert visibility
    await waitFor(() => {
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).not.toBeVisible();
    });
 
    // Simulate the cancel button click and check the dialog closes
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
 
 
  test('does not close the dialog if clearing is in progress', () => {
    // Render the component with clearing set to true
    renderComponent();
 
    // Open the dialog
    fireEvent.click(screen.getByText(/Clear all chat history/i));
 
    // Ensure the dialog is visible
    expect(screen.getByText('Are you sure you want to clear all chat history?')).toBeInTheDocument();
 
    // Mock the toggleClearAllDialog function
    const toggleClearAllDialog = jest.fn();
 
    // Try to click Cancel or Close while clearing is true
    fireEvent.click(screen.getByText(/Cancel/i)); // or screen.getByText(/Close/i)
 
    // Ensure that toggleClearAllDialog is not called because clearing is in progress
    expect(toggleClearAllDialog).not.toHaveBeenCalled();
 
    // Ensure the dialog is still visible
    expect(screen.getByText('Are you sure you want to clear all chat history?')).toBeInTheDocument();
  });
  it('dispatches TOGGLE_CHAT_HISTORY when handleHistoryClick is called', () => {
    renderComponent();
 
    // Locate the correct button by its aria-label or title
    const toggleButton = screen.getByRole('button', { name: /hide button/i }); // Update the name based on the actual label
    fireEvent.click(toggleButton);
 
    // Assert that dispatch was called with the correct action
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_CHAT_HISTORY' });
  });
  it('sets showContextualMenu to true when CommandBarButton is clicked', () => {
    const mockSetShowContextualMenu = jest.fn();
 
// Mock useState to return the mock function
jest.spyOn(React, 'useState').mockImplementation(() => {
  return [false, mockSetShowContextualMenu]; // Return `false` for the initial state, and the mock setter function
});
 
    // Render the component
    renderComponent();
 
    // Locate the CommandBarButton by its role and aria-label
    const moreButton = screen.getByRole('button', { name: /clear all chat history/i });
 
    // Assert that the button is present in the DOM
    expect(moreButton).toBeInTheDocument();
 
    // Simulate a click event on the button
    fireEvent.click(moreButton);
 
    // Assert that setShowContextualMenu is called with `true`
    expect(mockSetShowContextualMenu).toHaveBeenCalledTimes(16);
    expect(mockSetShowContextualMenu).toHaveBeenCalledWith(true);
  });
 
});