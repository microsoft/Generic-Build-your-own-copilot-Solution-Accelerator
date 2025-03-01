import { render, screen, fireEvent } from '@testing-library/react'
import { ShareButton, HistoryButton } from './Button'

// Mock the CSS module
jest.mock('./Button.module.css', () => ({
  shareButtonRoot: 'shareButtonRoot',
  historyButtonRoot: 'historyButtonRoot',
}))

describe('Button Components', () => {
  const mockOnClick = jest.fn()

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('ShareButton', () => {
    test('renders ShareButton with provided text', () => {
      render(<ShareButton onClick={mockOnClick} text="Share this" />)
      
      const button = screen.getByRole('button', { name: 'Share this' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('shareButtonRoot')
    })

    test('renders ShareButton without text when no text is provided', () => {
      render(<ShareButton onClick={mockOnClick} text={undefined} />)
      
      const button = screen.getByRole('button', { name: '' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('shareButtonRoot')
    })

    test('calls onClick when ShareButton is clicked', () => {
      render(<ShareButton onClick={mockOnClick} text="Share this" />)
      
      const button = screen.getByRole('button', { name: 'Share this' })
      fireEvent.click(button)
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('HistoryButton', () => {
    test('renders HistoryButton with provided text', () => {
      render(<HistoryButton onClick={mockOnClick} text="View History" />)
      
      const button = screen.getByRole('button', { name: 'View History' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('historyButtonRoot')
    })

    test('renders HistoryButton without text when no text is provided', () => {
      render(<HistoryButton onClick={mockOnClick} text={undefined} />)
      
      const button = screen.getByRole('button', { name: '' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('historyButtonRoot')
    })

    test('calls onClick when HistoryButton is clicked', () => {
      render(<HistoryButton onClick={mockOnClick} text="View History" />)
      
      const button = screen.getByRole('button', { name: 'View History' })
      fireEvent.click(button)
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })
})
