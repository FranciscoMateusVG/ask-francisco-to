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

/** Helper: fill in the minimum required fields */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  // Type
  await user.selectOptions(screen.getByTestId('ticket-type'), 'improvement')
  // Title
  await user.type(screen.getByTestId('title'), 'My request title')
  // Description
  await user.type(screen.getByTestId('message'), 'Detailed description here')
}

describe('RequestForm', () => {
  it('renders the form with all core fields', () => {
    render(<RequestForm />)

    expect(screen.getByTestId('ticket-type')).toBeInTheDocument()
    expect(screen.getByTestId('title')).toBeInTheDocument()
    expect(screen.getByTestId('message')).toBeInTheDocument()
    expect(screen.getByTestId('priority')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/João Silva/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Request/i })).toBeInTheDocument()
  })

  it('shows validation error when submitting without a title', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    // Only fill type + description, skip title
    await user.selectOptions(screen.getByTestId('ticket-type'), 'bug')
    await user.type(screen.getByTestId('message'), 'some description')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    expect(screen.getByText(/Please provide a title/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows validation error when description is empty', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    await user.selectOptions(screen.getByTestId('ticket-type'), 'bug')
    await user.type(screen.getByTestId('title'), 'Some title')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    expect(screen.getByText(/Please describe your request/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows validation error when ticket type is not selected', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    await user.type(screen.getByTestId('title'), 'Some title')
    await user.type(screen.getByTestId('message'), 'Some description')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    expect(screen.getByText(/Please select a request type/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('clears validation error on re-submit attempt', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    // First: submit without title → error
    await user.selectOptions(screen.getByTestId('ticket-type'), 'question')
    await user.type(screen.getByTestId('message'), 'desc')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))
    expect(screen.getByText(/Please provide a title/i)).toBeInTheDocument()

    // Fill title and resubmit
    mockFetch.mockResolvedValueOnce({ ok: true })
    await user.type(screen.getByTestId('title'), 'Now has title')
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    expect(screen.queryByText(/Please provide a title/i)).not.toBeInTheDocument()
  })

  it('submits form successfully and shows success state', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: true })

    render(<RequestForm />)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(screen.getByText(/Got it, thanks/i)).toBeInTheDocument()
    })
  })

  it('sends all fields to the API on submit', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: true })

    render(<RequestForm />)

    await user.selectOptions(screen.getByTestId('ticket-type'), 'bug')
    await user.type(screen.getByTestId('title'), 'Login crash')
    await user.type(screen.getByTestId('message'), 'It crashes when I click submit')
    await user.selectOptions(screen.getByTestId('priority'), 'high')
    await user.type(screen.getByTestId('affected-area'), 'Login page')
    await user.type(screen.getByTestId('steps-to-reproduce'), '1. Open login')
    await user.type(screen.getByTestId('expected-behavior'), 'Should log in')
    await user.type(screen.getByTestId('actual-behavior'), 'Crashes')
    await user.type(screen.getByPlaceholderText(/João Silva/i), 'Maria')
    await user.type(screen.getByPlaceholderText(/WhatsApp/i), 'maria@test.com')

    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Maria',
          contact: 'maria@test.com',
          title: 'Login crash',
          message: 'It crashes when I click submit',
          ticket_type: 'bug',
          priority: 'high',
          affected_area: 'Login page',
          steps_to_reproduce: '1. Open login',
          expected_behavior: 'Should log in',
          actual_behavior: 'Crashes',
        }),
      })
    })
  })

  it('shows error state when fetch fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<RequestForm />)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    })
  })

  it('shows error state when server returns non-ok response', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    render(<RequestForm />)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    })
  })

  it('disables the submit button while loading', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: { ok: boolean }) => void
    mockFetch.mockReturnValueOnce(new Promise(resolve => { resolvePromise = resolve }))

    render(<RequestForm />)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Send Request/i }))

    // Should show "Sending..." and be disabled
    expect(screen.getByRole('button', { name: /Sending/i })).toBeDisabled()

    // Resolve to avoid hanging
    resolvePromise!({ ok: true })
    await waitFor(() => {
      expect(screen.getByText(/Got it, thanks/i)).toBeInTheDocument()
    })
  })

  it('shows bug-specific fields only when type is bug', async () => {
    const user = userEvent.setup()
    render(<RequestForm />)

    // Bug fields should NOT be visible before selecting bug type
    expect(screen.queryByTestId('steps-to-reproduce')).not.toBeInTheDocument()

    // Select bug type
    await user.selectOptions(screen.getByTestId('ticket-type'), 'bug')

    // Bug fields should appear
    expect(screen.getByTestId('steps-to-reproduce')).toBeInTheDocument()
    expect(screen.getByTestId('expected-behavior')).toBeInTheDocument()
    expect(screen.getByTestId('actual-behavior')).toBeInTheDocument()

    // Switch to non-bug type
    await user.selectOptions(screen.getByTestId('ticket-type'), 'question')
    expect(screen.queryByTestId('steps-to-reproduce')).not.toBeInTheDocument()
  })

  it('has maxLength=2000 on the description textarea', () => {
    render(<RequestForm />)
    expect(screen.getByTestId('message')).toHaveAttribute('maxLength', '2000')
  })

  it('defaults priority to medium', () => {
    render(<RequestForm />)
    expect(screen.getByTestId('priority')).toHaveValue('medium')
  })
})
