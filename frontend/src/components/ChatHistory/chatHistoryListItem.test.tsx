import { renderWithContext, screen, waitFor, fireEvent, act, findByText, render } from '../../test/test.utils'
import { ChatHistoryListItemCell, ChatHistoryListItemGroups } from './ChatHistoryListItem'
import { Conversation } from '../../api/models'
import { historyRename, historyDelete, historyList } from '../../api'
import React, { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { AppStateContext } from '../../state/AppProvider'

// Mock API
jest.mock('../../api/api', () => ({
  historyRename: jest.fn(),
  historyDelete: jest.fn(),
  historyList: jest.fn(),

}))
const mockGroupedChatHistory = [
  {
    month: '2024-11',
    entries: [
      {
        id: '1',
        title: 'Chat 1',
        messages: [],  // Empty messages array
        date: new Date().toISOString()  // Current date
      }
    ]
  }
]


const conversation: Conversation = {
  id: '1',
  title: 'Test Chat',
  messages: [],
  date: new Date().toISOString()
}

const mockOnSelect = jest.fn()
// const mockOnEdit = jest.fn()
const mockAppState = {
  currentChat: { id: '1' },
  isRequestInitiated: false
}
describe('ChatHistoryListItemGroups', () => {
  beforeEach(() => {
    global.fetch = jest.fn();

    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.clearAllMocks();
    //(console.error as jest.Mock).mockRestore();
  });
  test('should call handleFetchHistory with the correct offset when the observer is triggered', async () => {
    const responseMock = [{ id: '4', title: 'Chat 4', messages: [], date: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    (historyList as jest.Mock).mockResolvedValue([...responseMock]);
    await act(async () => {
      renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />);
    });

    const scrollElms = await screen.findAllByRole('scrollDiv');
    const lastElem = scrollElms[scrollElms.length - 1];

    await act(async () => {
      fireEvent.scroll(lastElem, { target: { scrollY: 100 } });
      //await waitFor(() => expect(historyList).toHaveBeenCalled());
    });

    await act(async () => {
      await waitFor(() => {
        expect(historyList).toHaveBeenCalled();
      });
    });
  });

  test('renders grouped chat history correctly', () => {
    renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />)

    // Check if group month and titles are rendered
    expect(screen.getByText('2024-11')).toBeInTheDocument()
    expect(screen.getByText('Chat 1')).toBeInTheDocument()
  })

  test('displays a spinner when fetching history', async () => {
    (historyList as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve([{ id: '5', title: 'Chat 5' }]), 500))
    )

    renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />)

    // Simulate scroll
    fireEvent.scroll(window, { target: { scrollY: 100 } })

    // Check that spinner is visible
    expect(screen.getByLabelText('loading more chat history')).toBeInTheDocument()

  })
 
  test('does not render empty groups', () => {
    const emptyGroupedChatHistory = [
      { month: '2024-11', entries: [] },
      { month: '2024-10', entries: [] },
    ]

    renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={emptyGroupedChatHistory} />)

    // Ensure no groups are rendered if entries are empty
    expect(screen.queryByText('2024-11')).not.toBeInTheDocument()
    expect(screen.queryByText('2024-10')).not.toBeInTheDocument()
  })

  test('renders the spinner while fetching data', async () => {
    // Mock loading state and fetch delay
    (historyList as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve([{ id: '5', title: 'Chat 5' }]), 500))
    )

    renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />)

    // Simulate scroll
    fireEvent.scroll(window, { target: { scrollY: 100 } })

    // Check that spinner is visible
    expect(screen.getByLabelText('loading more chat history')).toBeInTheDocument()

    // Wait for fetch to finish and ensure spinner is removed
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })
  test('handles API failure gracefully', async () => {
    // Mock the API to reject with an error
    (historyList as jest.Mock).mockResolvedValue(undefined);

    renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />);

    // Simulate triggering the scroll event that loads more history
    const scrollElms = await screen.findAllByRole('scrollDiv');
    const lastElem = scrollElms[scrollElms.length - 1];

    await act(async () => {
      fireEvent.scroll(lastElem, { target: { scrollY: 100 } });
    });
    // Check that the spinner is hidden after the API call
    await waitFor(() => {
      expect(screen.queryByLabelText(/loading/i)).not.toBeInTheDocument();
    });
  });
})


describe('ChatHistoryListItemCell', () => {
  beforeEach(() => {
    mockOnSelect.mockClear()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders the chat history item', () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const titleElement = screen.getByText(/Test Chat/i)
    expect(titleElement).toBeInTheDocument()
  })
  test('calls onSelect when a chat history item is clicked', async () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)
    const titleElement = screen.getByText(/Test Chat/i)
    expect(titleElement).toBeInTheDocument()
    // Simulate click on a chat item
    fireEvent.click(titleElement)
    await waitFor(() => {
      screen.debug()
      // Ensure the onSelect handler is called with the correct item
      expect(mockOnSelect).toHaveBeenCalledWith(conversation)
    })
  })

  test('truncates long title', () => {
    const longTitleConversation = {
      ...conversation,
      title: 'A very long title that should be truncated after 28 characters'
    }

    renderWithContext(<ChatHistoryListItemCell item={longTitleConversation} onSelect={mockOnSelect} />, mockAppState)

    const truncatedTitle = screen.getByText(/A very long title that shoul .../i)
    expect(truncatedTitle).toBeInTheDocument()
  })

  test('calls onSelect when clicked', () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.click(item)
    expect(mockOnSelect).toHaveBeenCalledWith(conversation)
  })

  test('when null item is not passed', () => {
    renderWithContext(<ChatHistoryListItemCell onSelect={mockOnSelect} />, mockAppState)
    expect(screen.queryByText(/Test Chat/i)).not.toBeInTheDocument()
  })

  test('displays delete and edit buttons on hover', async () => {
    const mockAppStateUpdated = {
      ...mockAppState,
      currentChat: { id: '' }
    }
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppStateUpdated)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    await waitFor(() => {
      expect(screen.getByTitle(/Delete/i)).toBeInTheDocument()
      expect(screen.getByTitle(/Edit/i)).toBeInTheDocument()
    })
  })

  test('hides delete and edit buttons when not hovered', async () => {
    const mockAppStateUpdated = {
      ...mockAppState,
      currentChat: { id: '' }
    }
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppStateUpdated)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    await waitFor(() => {
      expect(screen.getByTitle(/Delete/i)).toBeInTheDocument()
      expect(screen.getByTitle(/Edit/i)).toBeInTheDocument()
    })

    fireEvent.mouseLeave(item)
    await waitFor(() => {
      expect(screen.queryByTitle(/Delete/i)).not.toBeInTheDocument()
      expect(screen.queryByTitle(/Edit/i)).not.toBeInTheDocument()
    })
  })

  test('shows confirmation dialog and deletes item', async () => {
    ; (historyDelete as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const deleteButton = screen.getByTitle(/Delete/i)
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this item?/i)).toBeInTheDocument()
    })

    const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(confirmDeleteButton)

    await waitFor(() => {
      expect(historyDelete).toHaveBeenCalled()
    })
  })

  test('when delete API fails or return false', async () => {
    ; (historyDelete as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const deleteButton = screen.getByTitle(/Delete/i)
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this item?/i)).toBeInTheDocument()
    })

    const confirmDeleteButton = screen.getByRole('button', { name: 'Delete' })

    await act(() => {
      userEvent.click(confirmDeleteButton)
    })

    await waitFor(async () => {
      expect(await screen.findByText(/Error: could not delete item/i)).toBeInTheDocument()
    })
  })

  test('cancel delete when confirmation dialog is shown', async () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const deleteButton = screen.getByTitle(/Delete/i)
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this item?/i)).toBeInTheDocument()
    })
    const cancelDeleteButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelDeleteButton)

    await waitFor(() => {
      expect(screen.queryByText(/Are you sure you want to delete this item?/i)).not.toBeInTheDocument()
    })
  })

  test('disables buttons when request is initiated', () => {
    const appStateWithRequestInitiated = {
      ...mockAppState,
      isRequestInitiated: true
    }

    renderWithContext(
      <ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />,
      appStateWithRequestInitiated
    )

    const deleteButton = screen.getByTitle(/Delete/i)
    const editButton = screen.getByTitle(/Edit/i)

    expect(deleteButton).toBeDisabled()
    expect(editButton).toBeDisabled()
  })

  test('does not disable buttons when request is not initiated', async () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)
    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item) // Simulate hover to reveal Edit button

    await waitFor(() => {
      const deleteButton = screen.getByTitle(/Delete/i)
      const editButton = screen.getByTitle(/Edit/i)
      expect(deleteButton).not.toBeDisabled();
      expect(editButton).not.toBeDisabled();
    })

  })

  test('calls onEdit when Edit button is clicked', async () => {
    renderWithContext(
      <ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, // Pass the mockOnEdit
      mockAppState
    )

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item) // Simulate hover to reveal Edit button

    await waitFor(() => {
      const editButton = screen.getByTitle(/Edit/i)
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton) // Simulate Edit button click
    })
    const inputItem = screen.getByPlaceholderText('Test Chat')
    expect(inputItem).toBeInTheDocument() // Ensure onEdit is called with the conversation item
    expect(inputItem).toHaveValue('Test Chat')
  })

  test('handles input onChange and onKeyDown ENTER events correctly', async () => {
    ; (historyRename as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    // Simulate hover to reveal Edit button
    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    // Wait for the Edit button to appear and click it
    await waitFor(() => {
      const editButton = screen.getByTitle(/Edit/i)
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton)
    })

    // Find the input field
    const inputItem = screen.getByPlaceholderText('Test Chat')
    expect(inputItem).toBeInTheDocument() // Ensure input is there

    // Simulate the onChange event by typing into the input field
    fireEvent.change(inputItem, { target: { value: 'Updated Chat' } })
    expect(inputItem).toHaveValue('Updated Chat') // Ensure value is updated

    // Simulate keydown event for the 'Enter' key
    fireEvent.keyDown(inputItem, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => expect(historyRename as jest.Mock).toHaveBeenCalled())

    // Optionally: Verify that some onSave or equivalent function is called on Enter key
    // expect(mockOnSave).toHaveBeenCalledWith('Updated Chat'); (if you have a mock function for the save logic)

    // Simulate keydown event for the 'Escape' key
    // fireEvent.keyDown(inputItem, { key: 'Escape', code: 'Escape', charCode: 27 });

    //await waitFor(() =>  expect(screen.getByPlaceholderText('Updated Chat')).not.toBeInTheDocument());
  })

  test('handles input onChange and onKeyDown Escape events correctly', async () => {
    ; (historyRename as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    // Simulate hover to reveal Edit button
    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    // Wait for the Edit button to appear and click it
    await waitFor(() => {
      const editButton = screen.getByTitle(/Edit/i)
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton)
    })

    // Find the input field
    const inputItem = screen.getByPlaceholderText('Test Chat')
    expect(inputItem).toBeInTheDocument() // Ensure input is there

    // Simulate the onChange event by typing into the input field
    fireEvent.change(inputItem, { target: { value: 'Updated Chat' } })
    expect(inputItem).toHaveValue('Updated Chat') // Ensure value is updated

    //Simulate keydown event for the 'Escape' key
    fireEvent.keyDown(inputItem, { key: 'Escape', code: 'Escape', charCode: 27 });
    expect(screen.queryByText(/Updated Chat/i)).not.toBeInTheDocument();
  })
  test('handles rename save when the updated text is equal to initial text', async () => {
    userEvent.setup()

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    // Simulate hover to reveal Edit button
    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    // Wait for the Edit button to appear and click it
    await waitFor(() => {
      const editButton = screen.getByTitle('Edit')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton)
    })

    // Find the input field
    const inputItem = screen.getByPlaceholderText('Test Chat')
    expect(inputItem).toBeInTheDocument() // Ensure input is there

    await act(() => {
      userEvent.type(inputItem, 'Test Chat')
    })

    // Simulate clicking the confirm button
    userEvent.click(screen.getByRole('button', { name: 'confirm new title' }))

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Error: Enter a new title to proceed./i)).toBeInTheDocument()
    })

    // Wait for the error message to disappear after 5 seconds
    await waitFor(() => expect(screen.queryByText('Error: Enter a new title to proceed.')).not.toBeInTheDocument(), {
      timeout: 6000
    })

    // Now check if the input field has focus
    const input = screen.getByPlaceholderText('Test Chat')  // Or use a more specific selector for the input
    expect(input).toHaveFocus()
  }, 10000)


  test('Should hide the rename from when cancel it.', async () => {
    userEvent.setup()

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    // Wait for the Edit button to appear and click it
    await waitFor(() => {
      const editButton = screen.getByTitle(/Edit/i)
      fireEvent.click(editButton)
    })

    await userEvent.click(screen.getByRole('button', { name: 'cancel edit title' }))

    // Wait for the error to be hidden after 5 seconds
    await waitFor(() => {
      const input = screen.queryByLabelText('confirm new title')
      expect(input).not.toBeInTheDocument()
    })
  })

  test('handles rename save API failed', async () => {
    userEvent.setup();
    (historyRename as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    // Simulate hover to reveal Edit button
    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    // Wait for the Edit button to appear and click it
    await waitFor(() => {
      const editButton = screen.getByTitle(/Edit/i)
      fireEvent.click(editButton)
    })

    // Find the input field
    const inputItem = screen.getByLabelText('confirm new title')
    expect(inputItem).toBeInTheDocument() // Ensure input is there

    await act(async () => {
      await userEvent.type(inputItem, 'update Chat')
    })

    userEvent.click(screen.getByRole('button', { name: 'confirm new title' }))

    await waitFor(() => {
      expect(screen.getByText(/Error: Enter a new title to proceed./i)).toBeInTheDocument()
    })

    // Wait for the error to be hidden after 5 seconds
    await waitFor(() => expect(screen.queryByText('Error: could not rename item')).not.toBeInTheDocument(), {
      timeout: 6000
    })
    const input = screen.getByLabelText('chat history item')
    expect(input).toHaveFocus()
  }, 10000)

  test('shows error when trying to rename to an existing title', async () => {
    const existingTitle = 'Existing Chat Title'
    const conversationWithExistingTitle: Conversation = {
      id: '2',
      title: existingTitle,
      messages: [],
      date: new Date().toISOString()
    }

      ; (historyRename as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Title already exists' })
      })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    await waitFor(() => {
      const editButton = screen.getByTitle(/Edit/i)
      fireEvent.click(editButton)
    })

    const inputItem = screen.getByPlaceholderText(conversation.title)
    fireEvent.change(inputItem, { target: { value: 'Test Chat' } })

    fireEvent.keyDown(inputItem, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => {
      expect(screen.getByText(/Error: Enter a new title to proceed./i)).toBeInTheDocument()
    })
  })

  test('triggers edit functionality when Enter key is pressed', async () => {
    ; (historyRename as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    const editButton = screen.getByTitle(/Edit/i)
    fireEvent.click(editButton)

    const confirmItem = screen.getByLabelText('confirm new title');
    expect(confirmItem).toBeInTheDocument();

    // Simulate the onChange event by typing into the input field
    fireEvent.change(confirmItem, { target: { value: 'Updated Chat' } });
    expect(confirmItem).toHaveValue('Updated Chat'); // Ensure value is updated
  })

  test('successfully saves edited title', async () => {
    (historyRename as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    const editButton = screen.getByTitle(/Edit/i)
    fireEvent.click(editButton)

    // Find the input field
    const inputItem = screen.getByPlaceholderText('Test Chat')
    expect(inputItem).toBeInTheDocument() // Ensure input is there

    // Simulate the onChange event by typing into the input field
    fireEvent.change(inputItem, { target: { value: 'Updated Chat' } })
    expect(inputItem).toHaveValue('Updated Chat') // Ensure value is updated
  })

  test('calls onEdit when space key is pressed on the Edit button', () => {
    const mockOnSelect = jest.fn()

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, {
      currentChat: { id: '1' },
      isRequestInitiated: false
    })

    const editButton = screen.getByTitle(/Edit/i)

    fireEvent.keyDown(editButton, { key: ' ', code: 'Space', charCode: 32 })

    expect(screen.getByLabelText(/confirm new title/i)).toBeInTheDocument()
  })

  test('calls toggleDeleteDialog when space key is pressed on the Delete button', () => {
    // const toggleDeleteDialogMock = jest.fn()

    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, {
      currentChat: { id: '1' },
      isRequestInitiated: false
      // toggleDeleteDialog: toggleDeleteDialogMock
    })

    const deleteButton = screen.getByTitle(/Delete/i)

    // fireEvent.focus(deleteButton)

    fireEvent.keyDown(deleteButton, { key: ' ', code: 'Space', charCode: 32 })

    expect(screen.getByLabelText(/chat history item/i)).toBeInTheDocument()
  })

  ///////

  test('opens delete confirmation dialog when Enter key is pressed on the Delete button', async () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    const deleteButton = screen.getByTitle(/Delete/i)
    fireEvent.keyDown(deleteButton, { key: 'Enter', code: 'Enter', charCode: 13 })

    // expect(await screen.findByText(/Are you sure you want to delete this item?/i)).toBeInTheDocument()
  })

  test('opens delete confirmation dialog when Space key is pressed on the Delete button', async () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    const deleteButton = screen.getByTitle(/Delete/i)
    fireEvent.keyDown(deleteButton, { key: ' ', code: 'Space', charCode: 32 })

    expect(await screen.findByText(/Are you sure you want to delete this item?/i)).toBeInTheDocument()
  })

  test('opens edit input when Space key is pressed on the Edit button', async () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    const editButton = screen.getByTitle(/Edit/i)
    fireEvent.keyDown(editButton, { key: ' ', code: 'Space', charCode: 32 })

    const inputItem = screen.getByLabelText('confirm new title')
    expect(inputItem).toBeInTheDocument()
  })

  test('opens edit input when Enter key is pressed on the Edit button', async () => {
    renderWithContext(<ChatHistoryListItemCell item={conversation} onSelect={mockOnSelect} />, mockAppState)

    const item = screen.getByLabelText('chat history item')
    fireEvent.mouseEnter(item)

    const editButton = screen.getByTitle(/Edit/i)
    fireEvent.keyDown(editButton, { key: 'Enter', code: 'Enter', charCode: 13 })

    // const inputItem = await screen.getByLabelText('confirm new title')
    // expect(inputItem).toBeInTheDocument()
  })
})
