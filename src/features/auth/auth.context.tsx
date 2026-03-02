import React, { createContext, useContext } from 'react';

import { useAuthSession } from './use-auth-session';

const AuthContext = createContext<ReturnType<typeof useAuthSession> | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const auth = useAuthSession();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
