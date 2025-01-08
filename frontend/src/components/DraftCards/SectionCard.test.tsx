import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SectionCard from './SectionCard'
import { AppStateContext } from '../../state/AppProvider'
import { sectionGenerate } from '../../api'
import { MemoryRouter } from 'react-router-dom'

import { ChatHistoryLoadingState } from '../../api/models'
import { act } from 'react-dom/test-utils'

// Mock the API
jest.mock('../../api/api', () => ({
  sectionGenerate: jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          section_content: 'Generated content'
        })
    })
  )
}))

// Mock the Generate Icon
jest.mock('../../assets/Generate.svg', () => 'mocked-generate-icon')

const mockDispatch = jest.fn()
const mockState = {
  draftedDocument: {
    title: 'Draft Document',
    sections: [
      {
        title: 'Introduction',
        description: 'This is an introduction',
        content: ''
      }
    ]
  },
  isChatHistoryOpen: false,
  chatHistoryLoadingState: ChatHistoryLoadingState.Success,
  chatHistory: null,

  filteredChatHistory: null,
  currentChat: null,
  browseChat: null,
  generateChat: null,
  isCosmosDBAvailable: {
    cosmosDB: false,
    status: 'CosmosDB is not configured'
  },
  frontendSettings: null,
  feedbackState: {},
  draftedDocumentTitle: '',

  isGenerating: false,
  isRequestInitiated: false
}

const renderWithContext = (idx = 0) =>
  render(
    <MemoryRouter>
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <SectionCard sectionIdx={idx} />
      </AppStateContext.Provider>
    </MemoryRouter>
  )

describe('SectionCard Component', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('When context not available throws an error', async () => {
    expect(() =>
      render(
        <MemoryRouter>
          <SectionCard sectionIdx={0} />
        </MemoryRouter>
      )
    ).toThrow('useAppState must be used within a AppStateProvider')
  })

  it('When no section available in context throws an error', async () => {
    expect(() => renderWithContext(2)).toThrow('Section not found')
  })

  it('renders section title and description', async () => {
    act(() => {
      renderWithContext()
    })
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument()
      expect(screen.getByText('AI-generated content may be incorrect')).toBeInTheDocument()
    })
  })

  it('displays spinner when loading', async () => {
    const { container } = renderWithContext()
    mockState.draftedDocument.sections[0].content = ''
    const spinnerElement = container.querySelector('#section-card-spinner')
    expect(spinnerElement).toBeInTheDocument()
  })

  it('fetches section content when content is empty', async () => {
    renderWithContext()
    await waitFor(() => {
      expect(sectionGenerate).toHaveBeenCalledWith({
        sectionTitle: 'Introduction',
        sectionDescription: 'This is an introduction'
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SECTION',
        payload: {
          sectionIdx: 0,
          section: expect.objectContaining({
            content: 'Generated content'
          })
        }
      })
    })
  })

  it('allows editing of section content', async () => {
    act(() => {
      renderWithContext()
    })
    await waitFor(() => {
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Updated content' } })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SECTION',
        payload: {
          sectionIdx: 0,
          section: expect.objectContaining({
            content: 'Updated content'
          })
        }
      })
    })
  })

  // it.skip('handles character limit correctly', async () => {
  //   act(() => {
  //     renderWithContext()
  //   })

  //   await waitFor(() => {
  //     const textarea = screen.getByRole('textbox')
  //     fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } })
  //     //expect(textarea.value).toHaveLength(2000)
  //     expect(screen.getByText('0 characters remaining')).toBeInTheDocument()
  //   })
  // })

  it('toggles popover visibility', () => {
    renderWithContext()
    const button = screen.getByRole('button', { name: /generate/i })
    fireEvent.click(button)
    expect(screen.getByText(/Regenerate Introduction/i)).toBeInTheDocument()
    const dismissButton = screen.getByTestId('close-popover-btn')
    fireEvent.click(dismissButton)
    expect(screen.queryByText(/Regenerate Introduction/i)).not.toBeInTheDocument()
  })

  it('regenerates content through popover', async () => {
    renderWithContext()
    const button = screen.getByRole('button', { name: /generate/i })
    act(() => {
      fireEvent.click(button)
    })

    act(() => {
      const generateButton = screen.getByTestId('generate-btn-in-popover')
      fireEvent.click(generateButton)
    })

    await waitFor(() => {
      expect(sectionGenerate).toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SECTION',
        payload: {
          sectionIdx: 0,
          section: expect.objectContaining({
            content: 'Generated content'
          })
        }
      })
    })
  })

  it('Throws an error if no description provided in text area', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    renderWithContext()
    const button = screen.getByRole('button', { name: /generate/i })
    act(() => {
      fireEvent.click(button)
    })

    act(() => {
      const popoverTextAreaElement = screen.getByTestId('popover-textarea-element')
      if (popoverTextAreaElement !== null) {
        popoverTextAreaElement.textContent = ''
        const generateButton = screen.getByTestId('generate-btn-in-popover')
        fireEvent.click(generateButton)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Section description is empty')
        consoleErrorSpy.mockRestore()
      }
    })
  })
})
