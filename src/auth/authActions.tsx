import { createContext, useContext } from 'react'

export interface AuthActions {
  signOut: () => Promise<void>
}

export const AuthActionsContext = createContext<AuthActions>({ signOut: async () => {} })

export const useAuthActions = () => useContext(AuthActionsContext)
