'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Session, Location, Image, AnalysisProgress } from '@/types';

interface SessionContextType {
  sessionId: string | null;
  session: Session | null;
  location: Location | null;
  images: Image[];
  analysisProgress: AnalysisProgress | null;
  isLoading: boolean;
  error: string | null;
  initSession: () => Promise<void>;
  setLocation: (location: Location) => Promise<void>;
  addImage: (image: Image) => void;
  updateImage: (imageId: string, updates: Partial<Image>) => void;
  removeImage: (imageId: string) => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'tuzu_session_id';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [location, setLocationState] = useState<Location | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [analysisProgress, setAnalysisProgressState] = useState<AnalysisProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check for existing session in localStorage
      const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);

      if (storedSessionId) {
        // Try to retrieve existing session
        const response = await fetch(`/api/session?id=${storedSessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSessionId(storedSessionId);
            setSession(data.data);
            setLocationState(data.data.location || null);
            setImages(data.data.images || []);
            setIsLoading(false);
            return;
          }
        }
        // Session expired or invalid, remove from storage
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }

      // Create new session
      const newSessionId = uuidv4();
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newSessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      if (data.success) {
        localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
        setSessionId(newSessionId);
        setSession(data.data);
        setImages([]);
        setLocationState(null);
      } else {
        throw new Error(data.error || 'Failed to create session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setLocation = useCallback(async (newLocation: Location) => {
    if (!sessionId) return;

    try {
      setError(null);
      const response = await fetch('/api/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, location: newLocation }),
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      const data = await response.json();
      if (data.success) {
        setLocationState(newLocation);
        setSession(prev => prev ? { ...prev, location: newLocation } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set location');
    }
  }, [sessionId]);

  const addImage = useCallback((image: Image) => {
    setImages(prev => [...prev, image]);
  }, []);

  const updateImage = useCallback((imageId: string, updates: Partial<Image>) => {
    setImages(prev =>
      prev.map(img => (img.id === imageId ? { ...img, ...updates } : img))
    );
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => {
      // Remove the image and any child images that have this image as parent
      return prev.filter(img => img.id !== imageId && img.parentImageId !== imageId);
    });
  }, []);

  const setAnalysisProgress = useCallback((progress: AnalysisProgress | null) => {
    setAnalysisProgressState(progress);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/session?id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSession(data.data);
          setImages(data.data.images || []);
          setLocationState(data.data.location || null);
        }
      }
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  }, [sessionId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        session,
        location,
        images,
        analysisProgress,
        isLoading,
        error,
        initSession,
        setLocation,
        addImage,
        updateImage,
        removeImage,
        setAnalysisProgress,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
