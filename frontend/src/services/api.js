const API_BASE_URL = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data = null;

  if (isJson) {
    data = await response.json();
  } else if (response.status !== 204) {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function extractList(data, key) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  return [];
}

function extractItem(data, key) {
  if (data?.[key] && typeof data[key] === 'object') {
    return data[key];
  }

  return data;
}

export async function getSessions() {
  const data = await request('/sessions');
  return extractList(data, 'sessions');
}

export async function createSession(name = 'New Chat') {
  const query = new URLSearchParams({
    name,
  });

  const data = await request(`/sessions?${query.toString()}`, {
    method: 'POST',
  });

  return extractItem(data, 'session');
}

export async function deleteSession(sessionId) {
  if (sessionId == null || String(sessionId).trim() === '') {
    throw new Error('A valid session is required.');
  }

  return request(
    `/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'DELETE',
    }
  );
}

export async function renameSession(sessionId, name) {
  if (sessionId == null || String(sessionId).trim() === '') {
    throw new Error('A valid session is required.');
  }

  const cleanedName = String(name || '').trim();

  if (!cleanedName) {
    throw new Error('A session name is required.');
  }

  return request(
    `/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: cleanedName,
      }),
    }
  );
}

export async function getDocuments() {
  const data = await request('/documents');
  return extractList(data, 'documents');
}

export async function deleteDocument(documentId) {
  return request(`/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export async function uploadPdf(sessionId, file) {
  if (sessionId == null || String(sessionId).trim() === '') {
    throw new Error('A valid session is required before uploading a PDF.');
  }

  if (!file) {
    throw new Error('A PDF file is required.');
  }

  const query = new URLSearchParams({
    session_id: String(sessionId),
  });

  const formData = new FormData();
  formData.append('file', file);

  return request(`/upload?${query.toString()}`, {
    method: 'POST',
    body: formData,
  });
}
export async function getChatMessages(sessionId) {
  if (sessionId == null || String(sessionId).trim() === '') {
    throw new Error('A valid session is required to load chat history.');
  }

  const data = await request(
    `/chat/${encodeURIComponent(sessionId)}/messages`
  );

  return Array.isArray(data) ? data : [];
}
export async function sendMessage(question, sessionId) {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error('Please enter a question.');
  }

  if (sessionId == null || String(sessionId).trim() === '') {
    throw new Error('A valid session is required to send a message.');
  }

  return request('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: trimmedQuestion,
      session_id: Number(sessionId),
    }),
  });
}