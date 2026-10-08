import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useParams } from 'react-router-dom';
import PdfUploader from '../components/PdfUploader';
import DocumentList from '../components/DocumentList';
import SourceCitation from '../components/SourceCitation';
import {
  getChatMessages,
  getDocuments,
  getSessions,
  renameSession,
  sendMessage,
} from '../services/api';
import { tokens } from '../theme/theme';

const DEFAULT_SESSION_NAMES = new Set([
  'new chat',
]);

const TITLE_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'about',
  'can',
  'could',
  'does',
  'do',
  'explain',
  'for',
  'from',
  'give',
  'how',
  'in',
  'introduce',
  'introduces',
  'is',
  'know',
  'listed',
  'me',
  'of',
  'on',
  'please',
  'section',
  'summarize',
  'summary',
  'tell',
  'the',
  'this',
  'to',
  'what',
  'which',
  'who',
  'why',
  'with',
  'marwan',
]);

function isDefaultSessionName(name) {
  return DEFAULT_SESSION_NAMES.has(
    String(name || '').trim().toLowerCase()
  );
}

function createSessionTitle(question) {
  const cleanedQuestion = String(question || '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const allWords = cleanedQuestion
    .split(' ')
    .filter(Boolean);

  const meaningfulWords = allWords.filter(
    (word) =>
      !TITLE_STOP_WORDS.has(word.toLowerCase())
  );

  let selectedWords = meaningfulWords.slice(0, 5);

  if (selectedWords.length < 2) {
    selectedWords = allWords.slice(0, 5);
  }

  const title = selectedWords
    .map((word) => {
      const normalizedWord = word.toLowerCase();

      return (
        normalizedWord.charAt(0).toUpperCase() +
        normalizedWord.slice(1)
      );
    })
    .join(' ');

  return title || 'New Chat';
}

function MessageBubble({
  message,
  sessionId,
}) {
  const isUser = message.role === 'user';

  const sources = Array.isArray(message.sources)
    ? message.sources
    : [];

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser
          ? 'flex-end'
          : 'flex-start',
      }}
    >
      <Box
        sx={{
          width: 'fit-content',
          maxWidth: {
            xs: '92%',
            sm: '82%',
            md: '76%',
          },
        }}
      >
        <Paper
          sx={{
            px: 2,
            py: 1.5,
            color: 'text.primary',
            backgroundColor: isUser
              ? tokens.accentSoft
              : tokens.surfaceRaised,
            borderColor: isUser
              ? tokens.accentBorder
              : tokens.border,
            borderRadius: isUser
              ? '16px 16px 4px 16px'
              : '16px 16px 16px 4px',
            boxShadow: 'none',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.primary',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {message.content}
          </Typography>
        </Paper>

        {!isUser && sources.length > 0 && (
          <Box
            sx={{
              mt: 1,
              px: 0.5,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {sources.map((source, index) => (
              <SourceCitation
                key={`${source.document_id}-${source.file}-${source.page}-${index}`}
                source={source}
                sessionId={sessionId}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function EmptyChatState() {
  return (
    <Box
      sx={{
        minHeight: 320,
        display: 'grid',
        placeItems: 'center',
        px: 3,
        py: 6,
        textAlign: 'center',
      }}
    >
      <Box>
        <Box
          sx={{
            width: 54,
            height: 54,
            mx: 'auto',
            mb: 2,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '16px',
            color: tokens.accent,
            backgroundColor: tokens.accentSoft,
            border: `1px solid ${tokens.accentBorder}`,
            boxShadow: tokens.glow,
          }}
        >
          <ChatIcon />
        </Box>

        <Typography variant="h6">
          Start a conversation
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            maxWidth: 420,
          }}
        >
          Upload one or more PDFs for this session, then ask questions about
          their content. Answers and document citations will appear here.
        </Typography>
      </Box>
    </Box>
  );
}

function TypingIndicator() {
  return (
    <Box
      role="status"
      aria-label="Assistant is generating a response"
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <Paper
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.65,
          borderRadius: '16px 16px 16px 4px',
          backgroundColor: tokens.surfaceRaised,
          boxShadow: 'none',
        }}
      >
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: tokens.textSecondary,
              animation:
                'typingPulse 1.2s ease-in-out infinite',
              animationDelay: `${index * 0.16}s`,

              '@keyframes typingPulse': {
                '0%, 60%, 100%': {
                  opacity: 0.35,
                  transform: 'translateY(0)',
                },
                '30%': {
                  opacity: 1,
                  transform: 'translateY(-3px)',
                },
              },
            }}
          />
        ))}
      </Paper>
    </Box>
  );
}

export default function Chat() {
  const { sessionId } = useParams();

  const [sessionName, setSessionName] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [sendError, setSendError] = useState('');

  const [sessionDocuments, setSessionDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState('');

  const isAssistantTyping = sendingMessage;

  useEffect(() => {
    let cancelled = false;

    async function loadChatHistory() {
      setLoadingMessages(true);
      setHistoryError('');
      setSendError('');

      try {
        const messageData =
          await getChatMessages(sessionId);

        if (!cancelled) {
          setMessages(messageData);
        }
      } catch (requestError) {
        if (!cancelled) {
          setMessages([]);
          setHistoryError(
            requestError.message ||
              'Unable to load this conversation.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadChatHistory();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentSession() {
      try {
        const sessionData = await getSessions();

        const currentSession = sessionData.find(
          (session) =>
            String(session.id) === String(sessionId)
        );

        if (!cancelled) {
          setSessionName(currentSession?.name || '');
        }
      } catch {
        if (!cancelled) {
          setSessionName('');
        }
      }
    }

    loadCurrentSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionDocuments() {
      setLoadingDocuments(true);
      setDocumentsError('');

      try {
        const allDocuments = await getDocuments();

        const currentSessionDocuments =
          allDocuments.filter(
            (document) =>
              Number(document.session_id) ===
              Number(sessionId)
          );

        if (!cancelled) {
          setSessionDocuments(
            currentSessionDocuments
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setSessionDocuments([]);
          setDocumentsError(
            requestError.message ||
              'Unable to load documents for this session.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      }
    }

    loadSessionDocuments();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleUploadComplete = async () => {
    setLoadingDocuments(true);
    setDocumentsError('');

    try {
      const allDocuments = await getDocuments();

      const currentSessionDocuments =
        allDocuments.filter(
          (document) =>
            Number(document.session_id) ===
            Number(sessionId)
        );

      setSessionDocuments(currentSessionDocuments);
    } catch (requestError) {
      setDocumentsError(
        requestError.message ||
          'The upload succeeded, but the document list could not be refreshed.'
      );
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const question = draft.trim();

    if (
      !question ||
      sendingMessage ||
      loadingMessages
    ) {
      return;
    }

    const isFirstUserQuestion = !messages.some(
      (message) => message.role === 'user'
    );

    const shouldRenameSession =
      isFirstUserQuestion &&
      isDefaultSessionName(sessionName);

    const temporaryUserId = `user-${Date.now()}`;

    const optimisticUserMessage = {
      id: temporaryUserId,
      role: 'user',
      content: question,
      sources: [],
    };

    setDraft('');
    setSendError('');
    setSendingMessage(true);

    setMessages((previousMessages) => [
      ...previousMessages,
      optimisticUserMessage,
    ]);

    try {
      const response = await sendMessage(
        question,
        sessionId
      );

      const persistedUserMessage = {
        ...optimisticUserMessage,
        id:
          response.user_message_id ??
          temporaryUserId,
      };

      const assistantMessage = {
        id:
          response.assistant_message_id ??
          `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: Array.isArray(response.sources)
          ? response.sources
          : [],
      };

      setMessages((previousMessages) => {
        const updatedMessages =
          previousMessages.map((message) =>
            message.id === temporaryUserId
              ? persistedUserMessage
              : message
          );

        return [
          ...updatedMessages,
          assistantMessage,
        ];
      });

      if (shouldRenameSession) {
        const generatedTitle =
          createSessionTitle(question);

        try {
          const renamedSession =
            await renameSession(
              sessionId,
              generatedTitle
            );

          setSessionName(renamedSession.name);

          window.dispatchEvent(
            new CustomEvent('session-renamed', {
              detail: {
                sessionId: renamedSession.id,
                name: renamedSession.name,
              },
            })
          );
        } catch (renameError) {
          console.warn(
            'The chat succeeded, but the session could not be renamed.',
            renameError
          );
        }
      }
    } catch (requestError) {
      setSendError(
        requestError.message ||
          'Unable to send your message. Please try again.'
      );
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        minHeight: '100%',
        px: {
          xs: 2,
          sm: 3,
          lg: 4,
        },
        py: {
          xs: 2.5,
          md: 4,
        },
      }}
    >
      {/* Session header */}
      <Box
        component="header"
        sx={{
          mb: 3,
        }}
      >
        <Typography
          variant="overline"
          color="primary.main"
        >
          Chat workspace
        </Typography>

        <Typography
          variant="h5"
          component="h1"
          sx={{
            mt: 0.5,
          }}
        >
          {sessionName || `Session #${sessionId}`}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.75,
          }}
        >
          Ask questions about the PDFs uploaded to this session.
        </Typography>
      </Box>

      {/* Main workspace */}
      <Box
        sx={{
          display: 'grid',
          alignItems: 'start',
          gap: 3,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            lg: 'minmax(0, 1fr) 380px',
          },
        }}
      >
        {/* Chat panel */}
        <Paper
          component="section"
          aria-label="Conversation"
          sx={{
            minWidth: 0,
            minHeight: {
              xs: 600,
              md: 'calc(100vh - 160px)',
            },
            maxHeight: {
              md: 'calc(100vh - 160px)',
            },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: tokens.surface,
          }}
        >
          {/* Conversation heading */}
          <Box
            sx={{
              px: {
                xs: 2,
                sm: 2.5,
              },
              py: 1.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              borderBottom: `1px solid ${tokens.border}`,
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                }}
              >
                Conversation
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                {messages.length === 0
                  ? 'No messages yet'
                  : `${messages.length} ${
                      messages.length === 1
                        ? 'message'
                        : 'messages'
                    }`}
              </Typography>
            </Box>

            <Chip
              size="small"
              label="Local RAG"
              sx={{
                color: tokens.accent,
                backgroundColor: tokens.accentSoft,
                borderColor: tokens.accentBorder,
              }}
            />
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              px: {
                xs: 2,
                sm: 2.5,
              },
              py: 2.5,
            }}
          >
            {loadingMessages ? (
              <Box
                sx={{
                  minHeight: 320,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={30} />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 2,
                    }}
                  >
                    Loading conversation...
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                {historyError && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                    }}
                  >
                    {historyError}
                  </Alert>
                )}

                {messages.length === 0 &&
                !isAssistantTyping ? (
                  <EmptyChatState />
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        sessionId={sessionId}
                      />
                    ))}

                    {isAssistantTyping && (
                      <TypingIndicator />
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Message composer */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: {
                xs: 1.5,
                sm: 2,
              },
              borderTop: `1px solid ${tokens.border}`,
              backgroundColor: tokens.sidebar,
            }}
          >
            {sendError && (
              <Alert
                severity="error"
                sx={{
                  mb: 1.5,
                }}
              >
                {sendError}
              </Alert>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 1.25,
              }}
            >
              <TextField
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);

                  if (sendError) {
                    setSendError('');
                  }
                }}
                placeholder={
                  sendingMessage
                    ? 'Waiting for the assistant...'
                    : 'Ask a question about your documents...'
                }
                multiline
                maxRows={5}
                fullWidth
                disabled={
                  loadingMessages ||
                  sendingMessage
                }
                aria-label="Message"
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    alignItems: 'flex-start',
                    borderRadius: 3,
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={
                  !draft.trim() ||
                  sendingMessage ||
                  loadingMessages
                }
                sx={{
                  minWidth: {
                    xs: 84,
                    sm: 100,
                  },
                  height: 44,
                  flexShrink: 0,
                }}
              >
                {sendingMessage ? (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CircularProgress
                      size={16}
                      color="inherit"
                    />
                    Sending
                  </Box>
                ) : (
                  'Send'
                )}
              </Button>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: {
                  xs: 'none',
                  sm: 'block',
                },
                mt: 1,
                px: 0.5,
              }}
            >
              Press Enter to send · Shift + Enter for a new line
            </Typography>
          </Box>
        </Paper>

        {/* Session documents */}
        <Paper
          component="aside"
          aria-label="Session documents"
          sx={{
            p: 2,
            minWidth: 0,
            maxHeight: {
              lg: 'calc(100vh - 160px)',
            },
            overflowY: {
              lg: 'auto',
            },
            backgroundColor: tokens.surface,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography variant="h6">
              Session documents
            </Typography>

            {!loadingDocuments && (
              <Chip
                size="small"
                label={sessionDocuments.length}
                sx={{
                  color: 'text.secondary',
                  backgroundColor:
                    tokens.surfaceRaised,
                  borderColor: tokens.border,
                }}
              />
            )}
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              mb: 2,
            }}
          >
            Add PDFs that should be available to this conversation.
          </Typography>

          <PdfUploader
            sessionId={sessionId}
            onUploadComplete={handleUploadComplete}
          />

          <Box
            sx={{
              mt: 3,
              pt: 2.5,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1.5,
                fontWeight: 600,
              }}
            >
              Uploaded documents
            </Typography>

            {documentsError && (
              <Alert
                severity="error"
                sx={{
                  mb: 1.5,
                }}
              >
                {documentsError}
              </Alert>
            )}

            {loadingDocuments ? (
              <Box
                sx={{
                  minHeight: 100,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : (
              <DocumentList
                documents={sessionDocuments}
                showDeleteAction={false}
                singleColumn
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}