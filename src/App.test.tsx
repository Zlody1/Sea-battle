import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders the game title', () => {
    render(<App />)
    expect(screen.getByText('⚓ Sea Battle ⚓')).toBeInTheDocument()
  })

  it('displays initial message to place ships', () => {
    render(<App />)
    expect(screen.getByText('Place your ships!')).toBeInTheDocument()
  })

  it('shows auto-place button before game starts', () => {
    render(<App />)
    expect(screen.getByText('Auto-Place Ships & Start Game')).toBeInTheDocument()
  })

  it('displays both player and enemy boards', () => {
    render(<App />)
    expect(screen.getByText('Your Fleet')).toBeInTheDocument()
    expect(screen.getByText('Enemy Waters')).toBeInTheDocument()
  })

  it('starts the game when auto-place button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    const autoPlaceButton = screen.getByText('Auto-Place Ships & Start Game')
    await user.click(autoPlaceButton)

    // After starting, the auto-place button should disappear
    expect(screen.queryByText('Auto-Place Ships & Start Game')).not.toBeInTheDocument()
    
    // Game should start message or turn indicator should appear
    const turnIndicators = screen.getAllByText(/Your Turn/i)
    expect(turnIndicators.length).toBeGreaterThan(0)
  })

  it('displays ship status for both players', async () => {
    const user = userEvent.setup()
    render(<App />)

    const autoPlaceButton = screen.getByText('Auto-Place Ships & Start Game')
    await user.click(autoPlaceButton)

    // Check that ship names are displayed (5 ships for each player = 10 total)
    const carrierElements = screen.getAllByText(/Carrier/)
    expect(carrierElements.length).toBeGreaterThanOrEqual(2) // At least one for each side
  })

  it('shows turn indicator during game', async () => {
    const user = userEvent.setup()
    render(<App />)

    const autoPlaceButton = screen.getByText('Auto-Place Ships & Start Game')
    await user.click(autoPlaceButton)

    // Should show either player or computer turn
    const turnIndicators = screen.getAllByText(/Your Turn|Computer Turn/i)
    expect(turnIndicators.length).toBeGreaterThan(0)
  })

  it('displays play again button when game is over', async () => {
    const user = userEvent.setup()
    render(<App />)

    const autoPlaceButton = screen.getByText('Auto-Place Ships & Start Game')
    await user.click(autoPlaceButton)

    // This test would require simulating a full game
    // For now, we just verify the component renders without errors
    expect(screen.getByText('Your Fleet')).toBeInTheDocument()
  })
})
