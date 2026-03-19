/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AdminPanel } from '@/components/AdminPanel'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

const sampleRequests = [
  { id: 1, name: 'Alice', contact: 'alice@test.com', message: 'Fix printer', done: false, createdAt: new Date().toISOString() },
  { id: 2, name: null, contact: null, message: 'Update server', done: false, createdAt: new Date().toISOString() },
  { id: 3, name: 'Bob', contact: null, message: 'Old task', done: true, createdAt: '2026-03-01T12:00:00Z' },
]

describe('AdminPanel', () => {
  it('renders the unlock form', () => {
    render(<AdminPanel />)

    expect(screen.getByPlaceholderText(/enter secret word/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlock/i)).toBeInTheDocument()
    expect(screen.getByText(/0 pending/i)).toBeInTheDocument()
  })

  it('unlocks and shows requests on valid secret', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: sampleRequests }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText('✓ unlocked')).toBeInTheDocument()
    })

    // Should show pending requests
    expect(screen.getByText('Fix printer')).toBeInTheDocument()
    expect(screen.getByText('Update server')).toBeInTheDocument()
    // Pending count
    expect(screen.getByText('2 pending')).toBeInTheDocument()
  })

  it('does not unlock on invalid secret', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, data: null }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'wrong')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    expect(screen.queryByText('✓ unlocked')).not.toBeInTheDocument()
  })

  it('sends x-admin-secret header on unlock', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: [] }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'mypassword')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/requests', {
        headers: { 'x-admin-secret': 'mypassword' },
      })
    })
  })

  it('supports Enter key to unlock', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: sampleRequests }),
    })

    render(<AdminPanel />)

    const input = screen.getByPlaceholderText(/enter secret word/i)
    await user.type(input, 'banana123')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('✓ unlocked')).toBeInTheDocument()
    })
  })

  it('shows "Anonymous" for requests without a name', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: [sampleRequests[1]] }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText(/Anonymous/i)).toBeInTheDocument()
    })
  })

  it('shows contact info when provided', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: [sampleRequests[0]] }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText(/alice@test.com/)).toBeInTheDocument()
    })
  })

  it('marks a request as done', async () => {
    const user = userEvent.setup()
    mockFetch
      // Unlock call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: [sampleRequests[0]] }),
      })
      // PATCH call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText('Fix printer')).toBeInTheDocument()
    })

    await user.click(screen.getByText('✓ Done'))

    // PATCH was called with correct endpoint
    expect(mockFetch).toHaveBeenCalledWith('/api/requests/1', {
      method: 'PATCH',
      headers: { 'x-admin-secret': 'banana123' },
    })

    // Request should move out of pending (optimistic update)
    await waitFor(() => {
      expect(screen.getByText('0 pending')).toBeInTheDocument()
    })
  })

  it('deletes a request', async () => {
    const user = userEvent.setup()
    mockFetch
      // Unlock call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: [sampleRequests[0]] }),
      })
      // DELETE call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText('Fix printer')).toBeInTheDocument()
    })

    await user.click(screen.getByText('✕'))

    // DELETE was called
    expect(mockFetch).toHaveBeenCalledWith('/api/requests/1', {
      method: 'DELETE',
      headers: { 'x-admin-secret': 'banana123' },
    })

    // Request should be removed from list (optimistic update)
    await waitFor(() => {
      expect(screen.queryByText('Fix printer')).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no pending requests', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: [] }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText(/No pending requests/i)).toBeInTheDocument()
    })
  })

  it('toggles completed requests visibility', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: sampleRequests }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText(/Show completed/i)).toBeInTheDocument()
    })

    // Completed request should NOT be visible initially
    expect(screen.queryByText('Old task')).not.toBeInTheDocument()

    // Click to show completed
    await user.click(screen.getByText(/Show completed/i))
    expect(screen.getByText('Old task')).toBeInTheDocument()

    // Click again to hide
    await user.click(screen.getByText(/Show completed/i))
    expect(screen.queryByText('Old task')).not.toBeInTheDocument()
  })

  it('does not show completed section when there are no completed requests', async () => {
    const user = userEvent.setup()
    const pendingOnly = sampleRequests.filter(r => !r.done)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: pendingOnly }),
    })

    render(<AdminPanel />)

    await user.type(screen.getByPlaceholderText(/enter secret word/i), 'banana123')
    await user.click(screen.getByText(/Unlock/i))

    await waitFor(() => {
      expect(screen.getByText('Fix printer')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Show completed/i)).not.toBeInTheDocument()
  })
})
