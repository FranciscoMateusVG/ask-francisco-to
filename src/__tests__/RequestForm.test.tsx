/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { RequestForm } from '@/components/RequestForm'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('RequestForm', () => {
  it('renders the form with all fields', () => {
    render(<RequestForm />)

    expect(screen.getByPlaceholderText(/João Silva/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask Francisco to/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Request/i })).toBeInTheDocument()
  })

  it('shows validation error when submitting with empty message', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    expect(screen.getByText(/Please write your request before sending/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows validation error when message is whitespace-only', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    await user.type(screen.getByPlaceholderText(/Ask Francisco to/i), '   ')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    expect(screen.getByText(/Please write your request before sending/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('clears validation error on re-submit attempt', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    // First: submit empty → error
    await user.click(screen.getByRole('button', { name: /Send Request/i }))
    expect(screen.getByText(/Please write your request/i)).toBeInTheDocument()

    // Type a message and submit → should clear validation error and call fetch
    mockFetch.mockResolvedValueOnce({ ok: true })
    await user.type(screen.getByPlaceholderText(/Ask Francisco to/i), 'Fix the thing')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    expect(screen.queryByText(/Please write your request/i)).not.toBeInTheDocument()
  })

  it('submits form successfully and shows success state', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: true })

    render(<RequestForm />)

    await user.type(screen.getByPlaceholderText(/Ask Francisco to/i), 'Help me!')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(screen.getByText(/Got it, thanks/i)).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', contact: '', message: 'Help me!' }),
    })
  })

  it('sends name and contact along with message', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: true })

    render(<RequestForm />)

    await user.type(screen.getByPlaceholderText(/João Silva/i), 'Maria')
    await user.type(screen.getByPlaceholderText(/WhatsApp/i), 'maria@test.com')
    await user.type(screen.getByPlaceholderText(/Ask Francisco to/i), 'Debug this')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Maria', contact: 'maria@test.com', message: 'Debug this' }),
      })
    })
  })

  it('shows error state when fetch fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<RequestForm />)

    await user.type(screen.getByPlaceholderText(/Ask Francisco to/i), 'Test request')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    })
  })

  it('shows error state when server returns non-ok response', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    render(<RequestForm />)

    await user.type(screen.getByPlaceholderText(/Ask Francisco to/i), 'Test request')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    })
  })

  it('disables the submit button while loading', async () => {
    const user = userEvent.setup()
    // Create a promise we control so we can check the loading state
    let resolvePromise: (value: { ok: boolean }) => void
    mockFetch.mockReturnValueOnce(new Promise(resolve => { resolvePromise = resolve }))

    render(<RequestForm />)

    await user.type(screen.getByPlaceholderText(/Ask Francisco to/i), 'Test')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    // Should show "Sending..." and be disabled
    expect(screen.getByRole('button', { name: /Sending/i })).toBeDisabled()

    // Resolve to avoid hanging
    resolvePromise!({ ok: true })
    await waitFor(() => {
      expect(screen.getByText(/Got it, thanks/i)).toBeInTheDocument()
    })
  })

  it('has maxLength=2000 on the textarea', () => {
    render(<RequestForm />)

    const textarea = screen.getByPlaceholderText(/Ask Francisco to/i)
    expect(textarea).toHaveAttribute('maxLength', '2000')
  })
})
