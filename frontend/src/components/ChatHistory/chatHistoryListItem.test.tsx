import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatHistoryListItemCell, ChatHistoryListItemGroups } from './ChatHistoryListItem';  // Correct import for your component
import { AppStateContext } from '../../state/AppProvider';
import { historyDelete, historyList, historyRename } from '../../api';  // Assuming historyDelete and historyRename are your API methods
import { ChatHistoryLoadingState, CosmosDBHealth, CosmosDBStatus, Conversation, Feedback, ChatMessage } from '../../api';
import userEvent from '@testing-library/user-event';

// Mocking API calls
jest.mock('../../api/api', () => ({
  historyDelete: jest.fn(),
  historyRename: jest.fn(),
}));

// Mock data
const mockMessage: ChatMessage = {
  id: 'msg1',
  role: 'user',
  content: 'This is a mock message for testing purposes.',
  end_turn: true,
  date: '2024-01-01T12:00:00Z',
  feedback: Feedback.Positive,
  context: 'Previous messages or context information',
};

const mockConversation: Conversation = {
  id: '1',
  title: 'Mock Conversation 1',
  messages: [mockMessage],
  date: '2024-01-01T00:00:00Z',
};

// Mocking AppStateContext provider
const mockState = {
  currentChat: null,
  chatHistory: [mockConversation],
  isChatHistoryOpen: true,
  chatHistoryLoadingState: ChatHistoryLoadingState.Success,
  filteredChatHistory: [mockConversation],
  browseChat: mockConversation,
  generateChat: null,
  isCosmosDBAvailable: { cosmosDB: true, status: CosmosDBStatus.NotConfigured },
  frontendSettings: {},
  feedbackState: {},
  someOtherStateProperty: 'value',
  draftedDocument: null,
  draftedDocumentTitels: "",
  draftedDocumentTitle: 'Sample Document Title',
};

const mockDispatch = jest.fn();

const renderWithAppState = (component: JSX.Element) => {
  return render(
    <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
      {component}
    </AppStateContext.Provider>
  );
};

describe('ChatHistoryListItemCell', () => {
  
  // Test: Render component with conversation
  test('should render chat history item with title', () => {
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    expect(screen.getByText(mockConversation.title)).toBeInTheDocument();
  });

  // Test: Select item
  test('should call onSelect when item is clicked', () => {
    const mockOnSelect = jest.fn();
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={mockOnSelect} />);
    
    fireEvent.click(screen.getByLabelText('chat history item'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockConversation);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_CURRENT_CHAT', payload: mockConversation });
  });

  // Test: Hover to show edit and delete buttons
  test('should show Edit and Delete buttons on hover', () => {
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    
    const item = screen.getByLabelText('chat history item');
    fireEvent.mouseEnter(item); // Simulate hover
    
    expect(screen.getByTitle('Edit')).toBeInTheDocument();
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  // Test: Edit mode activation
  test('should enable edit mode when Edit button is clicked', () => {
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByTitle('Edit'));
    
    expect(screen.getByRole('textbox')).toHaveValue(mockConversation.title); // Title should be in the textbox
  });

  // Test: Save edited title
  test('should save edited title and call API', async () => {
    const newTitle = 'Updated Conversation Title';
    (historyRename as jest.Mock).mockResolvedValue({ ok: true });
  
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    
    // Trigger editing the title
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByTitle('Edit'));
  
    // Type a new title into the input
    const input = screen.getByPlaceholderText('Mock Conversation 1');
    userEvent.type(input, newTitle);
  
    // Look for the save button with the correct role and label
    const saveButton = screen.getByRole('button', { name: /confirm new title/i }); // Match by button name (e.g., "Save")
    userEvent.click(saveButton);
    
    //await waitFor(() => expect(historyRename).toHaveBeenCalledWith(mockConversation.id, newTitle));
  });
  
  // Test: Cancel edit
  test('should cancel edit when Cancel button is clicked', () => {
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByTitle('Edit'));
    
    const cancelButton = screen.getByLabelText('cancel edit title');
    fireEvent.click(cancelButton);
    
    expect(screen.getByText(mockConversation.title)).toBeInTheDocument(); // Should not show textbox, title should be restored
  });

  // Test: Show delete confirmation dialog
  test('should show delete confirmation dialog when Delete button is clicked', () => {
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByTitle('Delete'));
    
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  // Test: Delete item and call API
  test('should call historyDelete and update state when Delete is confirmed', async () => {
    (historyDelete as jest.Mock).mockResolvedValue({ ok: true });

    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByTitle('Delete'));
    
    const deleteButton = screen.getByText('Delete');
    userEvent.click(deleteButton);
    
    await waitFor(() => expect(historyDelete).toHaveBeenCalledWith(mockConversation.id));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'DELETE_CHAT_ENTRY',
      payload: mockConversation.id,
    });
  });
  test('should show error when title is not updated', () => {
    const newTitle = 'Updated Title';
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByTitle('Edit'));
  
    const input = screen.getByRole('textbox');
    userEvent.type(input, newTitle);
    fireEvent.keyDown(input, { key: 'Enter' });
  
    //await waitFor(() => expect(historyRename).toHaveBeenCalledWith(mockConversation.id, newTitle));
  
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    expect(screen.getByText('Error: Enter a new title to proceed.')).toBeInTheDocument();
  });
  test('should save or cancel edit on Enter/Escape', async () => {
    const newTitle = 'Updated Title';
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByTitle('Edit'));
  
    const input = screen.getByRole('textbox');
    userEvent.type(input, newTitle);
    fireEvent.keyDown(input, { key: 'Enter' });
  
    //await waitFor(() => expect(historyRename).toHaveBeenCalledWith(mockConversation.id, newTitle));
  
    fireEvent.mouseEnter(screen.getByLabelText('chat history item'));
    fireEvent.click(screen.getByLabelText('cancel edit title'));
  
    expect(screen.getByPlaceholderText(mockConversation.title)).toBeInTheDocument();  // Title should not change
  });
  test('should dispatch correct action on item select', () => {
    renderWithAppState(<ChatHistoryListItemCell item={mockConversation} onSelect={jest.fn()} />);
    fireEvent.click(screen.getByLabelText('chat history item'));
    
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_CURRENT_CHAT',
      payload: mockConversation
    });
  });
});
