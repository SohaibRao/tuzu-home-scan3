import { Session, Image } from '@/types';

// In-memory session store (MVP - replace with Redis/database in production)
const sessions = new Map<string, Session>();

// Clean up expired sessions periodically
const SESSION_EXPIRY_HOURS = parseInt(process.env.SESSION_EXPIRY_HOURS || '24');

export function createSession(id: string): Session {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const session: Session = {
    id,
    createdAt: now,
    expiresAt,
    images: [],
    analysisStatus: 'pending',
  };

  sessions.set(id, session);
  cleanupExpiredSessions();

  return session;
}

export function getSession(id: string): Session | undefined {
  const session = sessions.get(id);

  if (session && new Date() > session.expiresAt) {
    sessions.delete(id);
    return undefined;
  }

  return session;
}

export function updateSession(id: string, updates: Partial<Session>): Session | undefined {
  const session = getSession(id);
  if (!session) return undefined;

  const updatedSession = { ...session, ...updates };
  sessions.set(id, updatedSession);

  return updatedSession;
}

export function addImageToSession(sessionId: string, image: Image): Session | undefined {
  const session = getSession(sessionId);
  if (!session) return undefined;

  session.images.push(image);
  sessions.set(sessionId, session);

  return session;
}

export function updateImageInSession(
  sessionId: string,
  imageId: string,
  updates: Partial<Image>
): Session | undefined {
  const session = getSession(sessionId);
  if (!session) return undefined;

  const imageIndex = session.images.findIndex(img => img.id === imageId);
  if (imageIndex === -1) return undefined;

  session.images[imageIndex] = { ...session.images[imageIndex], ...updates };
  sessions.set(sessionId, session);

  return session;
}

export function getImageFromSession(sessionId: string, imageId: string): Image | undefined {
  const session = getSession(sessionId);
  if (!session) return undefined;

  return session.images.find(img => img.id === imageId);
}

export function removeImageFromSession(sessionId: string, imageId: string): Session | undefined {
  const session = getSession(sessionId);
  if (!session) return undefined;

  // Remove the image
  session.images = session.images.filter(img => img.id !== imageId);

  // Also remove any child images that reference this image as parent
  session.images = session.images.filter(img => img.parentImageId !== imageId);

  sessions.set(sessionId, session);

  return session;
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

function cleanupExpiredSessions(): void {
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(id);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
}
