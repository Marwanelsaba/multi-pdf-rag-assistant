import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import { NavLink } from 'react-router-dom';
import { tokens } from '../theme/theme';

function getSessionTitle(session) {
  return (
    session.name ||
    session.title ||
    `Session ${session.id}`
  );
}

export default function SessionList({
  sessions = [],
  onNavigate,
  onDeleteSession,
}) {
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteClick = (event, session) => {
    event.preventDefault();
    event.stopPropagation();

    setDeleteError('');
    setSessionToDelete(session);
  };

  const handleCloseDialog = () => {
    if (deleting) {
      return;
    }

    setSessionToDelete(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete || deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      await onDeleteSession?.(sessionToDelete.id);
      setSessionToDelete(null);
    } catch (requestError) {
      setDeleteError(
        requestError.message ||
          'Unable to delete this session. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!sessions.length) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          px: 1,
        }}
      >
        No conversations yet.
      </Typography>
    );
  }

  return (
    <>
      <List
        disablePadding
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {sessions.map((session) => (
          <Box
            key={session.id}
            sx={{
              position: 'relative',

              '&:hover .session-delete-button': {
                opacity: 1,
                pointerEvents: 'auto',
              },

              '&:focus-within .session-delete-button': {
                opacity: 1,
                pointerEvents: 'auto',
              },
            }}
          >
            <ListItemButton
              component={NavLink}
              to={`/chat/${session.id}`}
              onClick={onNavigate}
              sx={{
                minHeight: 42,
                px: 1.25,
                pr: 5,
                py: 0.9,
                gap: 1.25,
                borderRadius: 2,
                color: tokens.textSecondary,
                border: '1px solid transparent',
                transition:
                  'background-color 0.2s, border-color 0.2s, color 0.2s',

                '& .MuiListItemText-primary': {
                  color: 'inherit',
                  fontWeight: 500,
                },

                '&:hover': {
                  color: tokens.textPrimary,
                  backgroundColor: tokens.surfaceHover,
                },

                '&.active': {
                  color: tokens.textPrimary,
                  backgroundColor: tokens.accentSoft,
                  borderColor: tokens.accentBorder,
                },

                '&.active svg': {
                  color: tokens.accent,
                },
              }}
            >
              <ChatIcon
                sx={{
                  flexShrink: 0,
                  fontSize: 16,
                }}
              />

              <ListItemText
                primary={getSessionTitle(session)}
                primaryTypographyProps={{
                  noWrap: true,
                  fontSize: 14,
                  lineHeight: 1.35,
                }}
              />
            </ListItemButton>

            <Tooltip title="Delete session">
              <IconButton
                className="session-delete-button"
                size="small"
                onClick={(event) =>
                  handleDeleteClick(event, session)
                }
                aria-label={`Delete ${getSessionTitle(session)}`}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  right: 7,
                  zIndex: 1,
                  opacity: {
                    xs: 1,
                    md: 0,
                  },
                  pointerEvents: {
                    xs: 'auto',
                    md: 'none',
                  },
                  color: 'text.secondary',
                  transform: 'translateY(-50%)',
                  transition:
                    'opacity 0.2s ease, color 0.2s ease, background-color 0.2s ease',

                  '&:hover': {
                    color: 'error.light',
                    backgroundColor:
                      'rgba(244, 67, 54, 0.1)',
                  },
                }}
              >
                <DeleteIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </List>

      <Dialog
        open={Boolean(sessionToDelete)}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: tokens.surfaceRaised,
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle>
          Delete session?
        </DialogTitle>

        <DialogContent>
          <DialogContentText color="text.secondary">
            This will permanently delete{' '}
            <Box
              component="span"
              sx={{
                color: 'text.primary',
                fontWeight: 600,
              }}
            >
              {sessionToDelete
                ? getSessionTitle(sessionToDelete)
                : ''}
            </Box>
            , including its chat messages, documents, and indexed
            vector data.
          </DialogContentText>

          {deleteError && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
              }}
            >
              {deleteError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
          }}
        >
          <Button
            onClick={handleCloseDialog}
            disabled={deleting}
            color="inherit"
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirmDelete}
            disabled={deleting}
            color="error"
            variant="contained"
            startIcon={
              deleting ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : (
                <DeleteIcon />
              )
            }
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}