import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';
import SessionList from './SessionList';
import {
  APP_NAME,
  APP_TAGLINE,
  MODEL_LABEL,
} from '../constants';
import {
  createSession,
  deleteSession,
  getSessions,
} from '../services/api';
import { tokens } from '../theme/theme';

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setLoadingSessions(true);
      setError('');

      try {
        const sessionData = await getSessions();

        if (!cancelled) {
          setSessions(sessionData);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              'Unable to load conversations.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSessions(false);
        }
      }
    }

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleSessionRenamed = (event) => {
      const renamedSessionId = event.detail?.sessionId;
      const renamedSessionName = event.detail?.name;

      if (
        renamedSessionId == null ||
        !renamedSessionName
      ) {
        return;
      }

      setSessions((previousSessions) =>
        previousSessions.map((session) =>
          String(session.id) === String(renamedSessionId)
            ? {
                ...session,
                name: renamedSessionName,
              }
            : session
        )
      );
    };

    window.addEventListener(
      'session-renamed',
      handleSessionRenamed
    );

    return () => {
      window.removeEventListener(
        'session-renamed',
        handleSessionRenamed
      );
    };
  }, []);

  const handleNewChat = async () => {
    if (creatingSession) {
      return;
    }

    setCreatingSession(true);
    setError('');

    try {
      const newSession = await createSession('New chat');
      const sessionId =
        newSession?.id ?? newSession?.session_id;

      if (sessionId == null) {
        throw new Error(
          'The server created the session but did not return its ID.'
        );
      }

      const normalizedSession = {
        ...newSession,
        id: sessionId,
      };

      setSessions((previousSessions) => [
        normalizedSession,
        ...previousSessions.filter(
          (session) =>
            String(session.id) !== String(sessionId)
        ),
      ]);

      navigate(`/chat/${sessionId}`);
      onNavigate?.();
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to create a new conversation.'
      );
    } finally {
      setCreatingSession(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    await deleteSession(sessionId);

    setSessions((previousSessions) =>
      previousSessions.filter(
        (session) =>
          String(session.id) !== String(sessionId)
      )
    );

    const activeSessionPath = `/chat/${sessionId}`;

    if (location.pathname === activeSessionPath) {
      navigate('/');
      onNavigate?.();
    }
  };

  const handleHomeNavigation = () => {
    navigate('/');
    onNavigate?.();
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2.25,
        gap: 2.5,
        color: 'text.primary',
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
        }}
        onClick={handleHomeNavigation}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '11px',
            color: tokens.accent,
            backgroundColor: tokens.accentSoft,
            border: `1px solid ${tokens.accentBorder}`,
            boxShadow: tokens.glow,
          }}
        >
          <AutoStoriesIcon fontSize="small" />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {APP_NAME}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
          >
            {APP_TAGLINE}
          </Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        startIcon={
          creatingSession ? (
            <CircularProgress
              size={17}
              color="inherit"
            />
          ) : (
            <AddIcon />
          )
        }
        onClick={handleNewChat}
        disabled={creatingSession}
        fullWidth
      >
        {creatingSession ? 'Creating...' : 'New chat'}
      </Button>

      {/* Sessions */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{
            px: 1,
            mb: 1,
          }}
        >
          Recent
        </Typography>

        {error && (
          <Typography
            variant="caption"
            color="error.light"
            sx={{
              display: 'block',
              px: 1,
              mb: 1.5,
              lineHeight: 1.5,
            }}
          >
            {error}
          </Typography>
        )}

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            mx: -0.5,
            px: 0.5,
          }}
        >
          {loadingSessions ? (
            <Box
              sx={{
                py: 3,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : (
            <SessionList
              sessions={sessions}
              onNavigate={onNavigate}
              onDeleteSession={handleDeleteSession}
            />
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: tokens.accent,
            boxShadow: tokens.glow,
          }}
        />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontFamily:
              '"JetBrains Mono Variable", monospace',
          }}
        >
          {MODEL_LABEL}
        </Typography>
      </Box>
    </Box>
  );
}