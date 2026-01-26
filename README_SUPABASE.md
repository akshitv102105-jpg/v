
# Supabase Integration

This project has been integrated with Supabase for cloud persistence.

## Setup

1.  **Environment Variables**: A `.env` file has been created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2.  **Database Schema**: The following tables have been created:
    -   `profiles`: User profile data (level, hp, xp, theme).
    -   `trades`: Trading journal data.
    -   `strategies`: Trading strategies.
    -   `habits` & `habit_logs`: Habit tracking.
    -   `journal_entries`: Daily reflections.
    -   `accounts` & `transactions`: Portfolio management.
    -   `achievements`: Gamification system.

## Authentication

Authentication is handled via Supabase Magic Link (Passwordless). 
-   On the login screen, enter your email.
-   Check your email for the login link.
-   Once logged in, your data will be synced to the cloud.

## Data Migration

A **Data Migration** tool has been built into the **Settings** page.
-   Go to Settings.
-   Click "Start Migration" to transfer your existing LocalStorage data to the Supabase cloud database.
-   This supports Trades, Strategies, Habits, Journals, and Preferences.

## Hooks

New hooks in `src/hooks/`:
-   `useAuth`: User session management.
-   `useTrades`: CRUD for trades.
-   `useProfile`: Sync user profile / avatar.
-   `useStrategies`: Manage strategies.
-   `useHabits`: Track habit streaks.
-   `useJournals`: Daily journal entries.
-   `useAccounts`: Portfolio accounts.
-   `useTransactions`: Deposits/Withdrawals.
-   `useAchievements`: Gamification tracking.

## Next Steps

-   **Realtime**: Supabase Realtime can be enabled in the hooks to sync data live across devices.
