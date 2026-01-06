'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSession } from '@/contexts/SessionContext';
import { Location } from '@/types';

export default function LocationPage() {
  const router = useRouter();
  const { sessionId, setLocation, location: savedLocation, isLoading: sessionLoading } = useSession();

  const [locationMode, setLocationMode] = useState<'auto' | 'manual' | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<Location | null>(null);
  const [manualCity, setManualCity] = useState('');
  const [manualSuburb, setManualSuburb] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // If location is already saved, show confirmation
  useEffect(() => {
    if (savedLocation) {
      setDetectedLocation(savedLocation);
      setLocationMode(savedLocation.source);
      if (savedLocation.source === 'manual') {
        setManualCity(savedLocation.city || '');
        setManualSuburb(savedLocation.suburb || '');
      }
    }
  }, [savedLocation]);

  const handleAutoDetect = async () => {
    setLocationMode('auto');
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get city/suburb (using free Nominatim API)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();

          const location: Location = {
            coordinates: { lat: latitude, lng: longitude },
            city: data.address?.city || data.address?.town || data.address?.village || '',
            suburb: data.address?.suburb || data.address?.neighbourhood || '',
            source: 'auto',
          };

          setDetectedLocation(location);
        } catch {
          // If reverse geocoding fails, still use coordinates
          setDetectedLocation({
            coordinates: { lat: latitude, lng: longitude },
            source: 'auto',
          });
        }

        setIsLocating(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enter your location manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        setIsLocating(false);
        setLocationMode('manual');
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const handleManualEntry = () => {
    setLocationMode('manual');
    setLocationError(null);
  };

  const handleContinue = async () => {
    if (!sessionId) return;

    setIsSaving(true);

    let location: Location;

    if (locationMode === 'auto' && detectedLocation) {
      location = detectedLocation;
    } else if (locationMode === 'manual' && (manualCity || manualSuburb)) {
      location = {
        city: manualCity,
        suburb: manualSuburb,
        source: 'manual',
      };
    } else {
      setLocationError('Please provide a location');
      setIsSaving(false);
      return;
    }

    try {
      await setLocation(location);
      router.push('/upload');
    } catch {
      setLocationError('Failed to save location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!sessionId) return;

    setIsSaving(true);

    try {
      await setLocation({
        source: 'manual',
        city: 'Unknown',
      });
      router.push('/upload');
    } catch {
      setLocationError('Failed to continue. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white py-6">
        <div className="max-w-2xl mx-auto px-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-blue-100 hover:text-white mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold">Set Your Location</h1>
          <p className="text-blue-100 mt-1">
            We use your location to provide relevant security insights for your area.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-bold">1</div>
          <div className="w-12 h-1 bg-gray-300 rounded" />
          <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center text-sm font-bold">2</div>
          <div className="w-12 h-1 bg-gray-300 rounded" />
          <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center text-sm font-bold">3</div>
        </div>

        {/* Location Options */}
        {!locationMode && (
          <div className="space-y-4">
            <Card className="cursor-pointer hover:border-[#1e3a5f] transition-colors" onClick={handleAutoDetect}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Auto-detect Location</h3>
                  <p className="text-sm text-gray-600">Use your device&apos;s GPS to find your location</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>

            <Card className="cursor-pointer hover:border-[#1e3a5f] transition-colors" onClick={handleManualEntry}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Enter Manually</h3>
                  <p className="text-sm text-gray-600">Type your suburb or city name</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          </div>
        )}

        {/* Auto-detect in progress */}
        {locationMode === 'auto' && isLocating && (
          <Card className="text-center py-8">
            <LoadingSpinner size="lg" className="text-[#1e3a5f] mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900">Detecting your location...</h3>
            <p className="text-sm text-gray-600 mt-1">Please allow location access if prompted</p>
          </Card>
        )}

        {/* Location detected */}
        {locationMode === 'auto' && !isLocating && detectedLocation && (
          <Card>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Location Detected</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#1e3a5f] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <div>
                  {detectedLocation.suburb && (
                    <p className="font-medium text-gray-900">{detectedLocation.suburb}</p>
                  )}
                  {detectedLocation.city && (
                    <p className="text-gray-600">{detectedLocation.city}</p>
                  )}
                  {detectedLocation.coordinates && (
                    <p className="text-xs text-gray-400 mt-1">
                      {detectedLocation.coordinates.lat.toFixed(4)}, {detectedLocation.coordinates.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button fullWidth onClick={handleContinue} isLoading={isSaving}>
                Continue with this location
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => {
                  setLocationMode('manual');
                  setDetectedLocation(null);
                }}
              >
                Enter different location
              </Button>
            </div>
          </Card>
        )}

        {/* Manual entry form */}
        {locationMode === 'manual' && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Enter Your Location</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="suburb" className="block text-sm font-medium text-gray-700 mb-1">
                  Suburb / Neighbourhood
                </label>
                <input
                  type="text"
                  id="suburb"
                  value={manualSuburb}
                  onChange={(e) => setManualSuburb(e.target.value)}
                  placeholder="e.g., Bondi, Richmond"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="e.g., Sydney, Melbourne"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                fullWidth
                onClick={handleContinue}
                isLoading={isSaving}
                disabled={!manualCity && !manualSuburb}
              >
                Continue
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => setLocationMode(null)}
              >
                Back
              </Button>
            </div>
          </Card>
        )}

        {/* Error message */}
        {locationError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{locationError}</p>
          </div>
        )}

        {/* Skip option */}
        {!isLocating && (
          <div className="mt-6 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              disabled={isSaving}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
