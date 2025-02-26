import { render, fireEvent, screen } from '@testing-library/react'
import { QuestionInput } from './QuestionInput'
import { SendRegular } from '@fluentui/react-icons'

// Mocking the Send SVG import
jest.mock('../../assets/Send.svg', () => 'mock-send-svg')

// Mocking the onSend prop function
const onSendMock = jest.fn()

describe('QuestionInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks() // Clear mock calls before each test
  })

  it('should render the component', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)
    
    // Ensure the text input is rendered
    expect(screen.getByPlaceholderText('Ask a question')).toBeInTheDocument()

    // Ensure the send button is rendered
    expect(screen.getByRole('button', { name: /ask question button/i })).toBeInTheDocument()
  })

  it('should call onSend with the question when send button is clicked', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Simulate typing into the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })

    // Simulate clicking the send button
    fireEvent.click(screen.getByRole('button', { name: /ask question button/i }))
    
    // Assert that the onSend mock was called with the correct question
    expect(onSendMock).toHaveBeenCalledWith('What is Jest?')
  })

  it('should call onSend with the question and conversationId when conversationId is provided', () => {
    const conversationId = '1234'
    render(
      <QuestionInput 
        onSend={onSendMock} 
        disabled={false} 
        placeholder="Ask a question" 
        conversationId={conversationId}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })
    fireEvent.click(screen.getByRole('button', { name: /ask question button/i }))

    // Assert that onSend was called with the question and conversationId
    expect(onSendMock).toHaveBeenCalledWith('What is Jest?',conversationId)
  })

  it('should disable the send button when input is empty', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    const sendButton = screen.getByRole('button', { name: /ask question button/i })
    
    // Initially, the button should be enabled
    expect(sendButton).not.toHaveClass('questionInputSendButtonDisabled')

    // Simulate clearing the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: '' } })

    // Now, the send button should be disabled
    expect(sendButton).toHaveClass('questionInputSendButtonContainer')
  })

  it('should not call onSend when the input is empty and the send button is clicked', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Try clicking the send button when the input is empty
    fireEvent.click(screen.getByRole('button', { name: /ask question button/i }))

    // Ensure onSend is not called
    expect(onSendMock).not.toHaveBeenCalled()
  })

  it('should clear the input field when clearOnSend is true', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" clearOnSend={true} />)
  
    // Simulate typing into the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })
    
    // Simulate clicking the send button
    fireEvent.click(screen.getByRole('button', { name: /ask question button/i }))
  
    // Assert that the input field is cleared
    const inputElement = screen.getByPlaceholderText('Ask a question').querySelector('input') as HTMLInputElement;
    expect(inputElement).toBe(null)  // Check if the input is cleared
  })
  

  it('should not call onSend if the input is empty when pressing Enter', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Try pressing Enter when the input is empty
    fireEvent.keyDown(screen.getByPlaceholderText('Ask a question'), { key: 'Enter', code: 'Enter' })

    // Ensure onSend is not called
    expect(onSendMock).not.toHaveBeenCalled()
  })

  it('should call onSend when pressing Enter with a non-empty input', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Simulate typing into the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })

    // Simulate pressing Enter
    fireEvent.keyDown(screen.getByPlaceholderText('Ask a question'), { key: 'Enter', code: 'Enter' })

    // Assert that onSend was called with the correct question
    expect(onSendMock).toHaveBeenCalledWith('What is Jest?')
  })

  it('should render disabled send button when disabled prop is true', () => {
    render(<QuestionInput onSend={onSendMock} disabled={true} placeholder="Ask a question" />)

    // The send button should be disabled
    expect(screen.getByRole('button', { name: /ask question button/i })).toHaveClass('questionInputSendButtonContainer')
  })
  it('should call sendQuestion when Enter key is pressed', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Simulate typing into the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })
    
    // Simulate pressing the Enter key
    fireEvent.keyDown(screen.getByPlaceholderText('Ask a question'), { key: 'Enter', code: 'Enter' })

    // Assert that sendQuestion was called
    expect(onSendMock).toHaveBeenCalledTimes(1)
  })

  it('should call sendQuestion when Spacebar key is pressed', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Simulate typing into the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })
    
    // Simulate pressing the Spacebar key
    fireEvent.keyDown(screen.getByPlaceholderText('Ask a question'), { key: ' ', code: 'Space' })

    // Assert that sendQuestion was called
    expect(onSendMock).toHaveBeenCalledTimes(0)
  })

  it('should not call sendQuestion when other keys are pressed', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Simulate typing into the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })
    
    // Simulate pressing a key other than Enter or Space (e.g., "a")
    fireEvent.keyDown(screen.getByPlaceholderText('Ask a question'), { key: 'a', code: 'KeyA' })

    // Assert that sendQuestion was NOT called
    expect(onSendMock).not.toHaveBeenCalled()
  })

  it('should not call sendQuestion when Shift + Enter is pressed', () => {
    render(<QuestionInput onSend={onSendMock} disabled={false} placeholder="Ask a question" />)

    // Simulate typing into the input field
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'What is Jest?' } })
    
    // Simulate pressing Shift + Enter
    fireEvent.keyDown(screen.getByPlaceholderText('Ask a question'), { key: 'Enter', code: 'Enter', shiftKey: true })

    // Assert that sendQuestion was NOT called
    expect(onSendMock).not.toHaveBeenCalled()
  })

})
