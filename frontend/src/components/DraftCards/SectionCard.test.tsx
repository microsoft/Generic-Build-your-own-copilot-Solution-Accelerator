import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SectionCard from './SectionCard'
import { AppStateContext } from '../../state/AppProvider'
import { sectionGenerate } from '../../api'
import { MemoryRouter } from 'react-router-dom';

import {
    ChatHistoryLoadingState,
    Conversation,
    CosmosDBHealth,
    CosmosDBStatus,
    DraftedDocument,
    Section,
    Feedback,
    FrontendSettings,
  } from '../../api/models'

// Mock the API
jest.mock('../../api/api', () => ({
  sectionGenerate: jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          section_content: 'Generated content',
        }),
    })
  ),
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
        content: '',
      },
    ],
  },
  isChatHistoryOpen : false, 
  chatHistoryLoadingState : ChatHistoryLoadingState.Success,
  chatHistory:null,

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
  isRequestInitiated: false,
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

  it('renders section title and description', () => {
    renderWithContext()
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('AI-generated content may be incorrect')).toBeInTheDocument()
  })

  it('displays spinner when loading', () => {
    renderWithContext()
    mockState.draftedDocument.sections[0].content = ''
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('fetches section content when content is empty', async () => {
    renderWithContext()
    await waitFor(() => {
      expect(sectionGenerate).toHaveBeenCalledWith({
        sectionTitle: 'Introduction',
        sectionDescription: 'This is an introduction',
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SECTION',
        payload: {
          sectionIdx: 0,
          section: expect.objectContaining({
            content: 'Generated content',
          }),
        },
      })
    })
  })

  it('allows editing of section content', () => {
    renderWithContext()
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Updated content' } })
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SECTION',
      payload: {
        sectionIdx: 0,
        section: expect.objectContaining({
          content: 'Updated content',
        }),
      },
    })
  })

  it('handles character limit correctly', () => {
    renderWithContext()
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } })
    //expect(textarea.value).toHaveLength(2000)
    expect(screen.getByText('0 characters remaining')).toBeInTheDocument()
  })

  it('toggles popover visibility', () => {
    renderWithContext()
    const button = screen.getByRole('button', { name: /generate/i })
    fireEvent.click(button)
    expect(screen.getByText(/Regenerate Introduction/i)).toBeInTheDocument()
    const dismissButton = screen.getByRole('button', { name: /Dismiss/i })
    fireEvent.click(dismissButton)
    expect(screen.queryByText(/Regenerate Introduction/i)).not.toBeInTheDocument()
  })

  it('regenerates content through popover', async () => {
    renderWithContext()
    const button = screen.getByRole('button', { name: /generate/i })
    fireEvent.click(button)
    const generateButton = screen.getByRole('button', { name: /generate/i })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(sectionGenerate).toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SECTION',
        payload: {
          sectionIdx: 0,
          section: expect.objectContaining({
            content: 'Generated content',
          }),
        },
      })
    })
  })
})
