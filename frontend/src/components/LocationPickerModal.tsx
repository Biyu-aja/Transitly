import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, X, Loader2, Navigation, LocateFixed } from 'lucide-react';

// ─── Custom Marker Icon (inline SVG, no external images) ────────────────────
const MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="#f5533d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

const customIcon = L.divIcon({
  html: MARKER_SVG,
  className: 'custom-leaflet-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// ─── Types ──────────────────────────────────────────────────────────────────
interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address: string) => void;
  defaultLocation?: { lat: number; lng: number } | null;
}

interface SearchResult {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  type?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456]; // Jakarta
const DEFAULT_ZOOM = 13;
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// ─── Component ──────────────────────────────────────────────────────────────
export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelect,
  defaultLocation,
}: LocationPickerModalProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [addressName, setAddressName] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Reverse Geocode ────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    setAddressName('Mencari lokasi...');
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data?.address) {
        const place =
          data.address.railway ||
          data.address.station ||
          data.address.road ||
          data.address.neighbourhood ||
          data.address.suburb ||
          data.address.city;
        setAddressName(
          place
            ? `${place}, ${data.address.city || data.address.state || ''}`
            : data.display_name.split(',')[0]
        );
      } else {
        setAddressName('Titik GPS Dipilih');
      }
    } catch {
      setAddressName('Titik Koordinat');
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // ─── Place marker helper ────────────────────────────────────────────────
  const placeMarker = useCallback(
    (lat: number, lng: number, flyTo = false) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      setSelectedCoords([lat, lng]);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      }

      if (flyTo) {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
      }
    },
    []
  );

  // ─── Search ─────────────────────────────────────────────────────────────
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=id`
      );
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ─── Debounced search on typing ─────────────────────────────────────────
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 400);
    },
    [performSearch]
  );

  // ─── Select search result ──────────────────────────────────────────────
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      placeMarker(lat, lng, true);
      setAddressName(result.name || result.display_name.split(',')[0]);
      setSearchResults([]);
      setSearchQuery('');
      setShowResults(false);
    },
    [placeMarker]
  );

  // ─── Geolocation ───────────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        placeMarker(latitude, longitude, true);
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [placeMarker, reverseGeocode]);

  // ─── Initialize / destroy map ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure the container is rendered & sized
    const initTimeout = setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container || mapInstanceRef.current) return;

      // Clear any stale Leaflet references
      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
        container.innerHTML = '';
      }

      const center: [number, number] = defaultLocation
        ? [defaultLocation.lat, defaultLocation.lng]
        : DEFAULT_CENTER;

      const map = L.map(container, {
        center,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      // Zoom control in bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Map click handler
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        // Update marker
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        }
        setSelectedCoords([lat, lng]);
        // Reverse geocode
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;

      // Fix size
      requestAnimationFrame(() => {
        map.invalidateSize();
      });

      // If there's a default location, place a marker
      if (defaultLocation) {
        markerRef.current = L.marker(
          [defaultLocation.lat, defaultLocation.lng],
          { icon: customIcon }
        ).addTo(map);
        setSelectedCoords([defaultLocation.lat, defaultLocation.lng]);
        reverseGeocode(defaultLocation.lat, defaultLocation.lng);
      }
    }, 50);

    return () => {
      clearTimeout(initTimeout);
      // Cleanup map on close
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, [isOpen, defaultLocation, reverseGeocode]);

  // ─── Confirm ────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (selectedCoords) {
      onSelect(selectedCoords[0], selectedCoords[1], addressName || 'Lokasi Terpilih');
      onClose();
    }
  };

  // ─── Close on Escape ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ─── Reset state when closing ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface-main w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-border-light flex flex-col"
        style={{ animation: 'modalSlideUp 0.25s ease-out' }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light bg-surface-hover/40">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
              <MapPin size={18} className="text-brand-500" />
            </div>
            Pilih Lokasi
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-subtle rounded-full transition-colors text-text-secondary hover:text-text-primary"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col relative">
          {/* Search Bar - Floating above the map */}
          <div className="absolute top-3 left-3 right-3 z-[1000]">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch(searchQuery);
                  }
                }}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Cari stasiun, halte, atau jalan..."
                className="w-full bg-surface-main/95 backdrop-blur-md border border-border-light text-text-primary rounded-xl pl-10 pr-20 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all shadow-lg"
              />
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
                size={16}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching && (
                  <Loader2 size={16} className="animate-spin text-brand-500" />
                )}
                <button
                  onClick={() => performSearch(searchQuery)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                  disabled={isSearching || !searchQuery.trim()}
                >
                  Cari
                </button>
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <ul className="mt-1.5 bg-surface-main/95 backdrop-blur-md border border-border-light rounded-xl shadow-xl max-h-52 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <li
                    key={`${result.lat}-${result.lon}-${idx}`}
                    onClick={() => handleResultClick(result)}
                    className="px-4 py-2.5 border-b border-border-light/50 last:border-0 hover:bg-surface-hover cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <MapPin
                      size={14}
                      className="text-brand-500 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-text-primary text-sm truncate">
                        {result.name || result.display_name.split(',')[0]}
                      </div>
                      <div className="text-xs text-text-secondary truncate mt-0.5">
                        {result.display_name}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Locate Me Button - Floating */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="absolute bottom-20 right-3 z-[1000] bg-surface-main/95 backdrop-blur-md border border-border-light p-2.5 rounded-xl shadow-lg hover:bg-surface-hover transition-all group"
            title="Gunakan lokasi saya"
          >
            {isLocating ? (
              <Loader2 size={18} className="animate-spin text-brand-500" />
            ) : (
              <LocateFixed
                size={18}
                className="text-text-secondary group-hover:text-brand-500 transition-colors"
              />
            )}
          </button>

          {/* Map */}
          <div
            ref={mapContainerRef}
            className="flex-1 w-full h-full"
          />

          {/* Selected Location Info Bar */}
          {selectedCoords && (
            <div className="absolute bottom-2 left-3 right-14 z-[1000]">
              <div className="bg-surface-main/95 backdrop-blur-md border border-border-light rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center shrink-0">
                  <Navigation size={14} className="text-brand-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-secondary">Lokasi terpilih</div>
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {isReverseGeocoding ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Mencari alamat...
                      </span>
                    ) : (
                      addressName ||
                      `${selectedCoords[0].toFixed(5)}, ${selectedCoords[1].toFixed(5)}`
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-t border-border-light bg-surface-hover/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-semibold text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCoords || isReverseGeocoding}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              selectedCoords && !isReverseGeocoding
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md'
                : 'bg-surface-hover text-text-secondary/50 cursor-not-allowed'
            }`}
          >
            Konfirmasi Lokasi
          </button>
        </div>
      </div>

      {/* Modal Animation Keyframes */}
      <style>{`
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
