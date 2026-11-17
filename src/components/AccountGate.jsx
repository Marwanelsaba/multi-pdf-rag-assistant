import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { authenticate, getAuthStatus, signOut } from '../services/api';

const AccountContext = createContext(null);
export const useAccount = () => useContext(AccountContext);

export default function AccountGate({ children }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    setError('');
    try {
      setStatus(await getAuthStatus());
    } catch {
      setError('Cannot reach the workspace. Check that the API is running and retry.');
    }
  }

  useEffect(() => {
    loadStatus();
    const expire = () => setStatus((current) => current?.enabled ? { ...current, username: null } : current);
    window.addEventListener('authentication-required', expire);
    return () => window.removeEventListener('authentication-required', expire);
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      const account = await authenticate(fields, register);
      setStatus({ ...status, username: account.username });
      setRegister(false);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOut();
    setStatus({ ...status, username: null });
  }

  if (status && (!status.enabled || status.username)) {
    return (
      <AccountContext.Provider value={status.enabled ? { username: status.username, logout } : null}>
        {children}
      </AccountContext.Provider>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Stack spacing={2} component="form" onSubmit={submit}>
          <Typography variant="h5" component="h1">Multi-PDF RAG Assistant</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {!status && (error
            ? <Button variant="outlined" onClick={loadStatus}>Retry</Button>
            : <CircularProgress size={24} aria-label="Checking workspace" />)}
          {status && (
            <>
              <TextField label="Username" name="username" autoComplete="username" required />
              <TextField
                label="Password"
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                helperText={register ? 'Use at least 12 characters.' : undefined}
                slotProps={{ htmlInput: { minLength: 12, maxLength: 256 } }}
                required
              />
              <Button variant="contained" type="submit" disabled={busy}>
                {register ? 'Create account' : 'Sign in'}
              </Button>
              {status.registration_enabled && (
                <Button disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>
                  {register ? 'Already have an account? Sign in' : 'Create an account'}
                </Button>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
