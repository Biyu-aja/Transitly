import { useState } from 'react';
import { MapPin, Plus, Navigation, DollarSign, Clock, X, Edit2, MapPinned } from 'lucide-react';
import toast from 'react-hot-toast';
import LocationPickerModal from './LocationPickerModal';

interface RouteInfo {
  id: string;
  name: string;
  from: string;
  fromLat?: number;
  fromLng?: number;
  to: string;
  toLat?: number;
  toLng?: number;
  mode: string;
  price: string;
  duration: string;
  distance: string;
  notes: string;
}

interface RouteBuilderProps {
  onRoutesChange: (routes: RouteInfo[]) => void;
  initialRoutes?: RouteInfo[];
}

const TRANSPORT_MODES = [
  { id: 'angkot', label: 'Angkot', icon: '🚐', color: 'bg-orange-500' },
  { id: 'bus', label: 'Bus', icon: '🚌', color: 'bg-blue-500' },
  { id: 'krl', label: 'KRL', icon: '🚆', color: 'bg-purple-500' },
  { id: 'mrt', label: 'MRT', icon: '🚇', color: 'bg-red-500' },
  { id: 'transjakarta', label: 'TransJakarta', icon: '🚍', color: 'bg-orange-600' },
  { id: 'taksi', label: 'Taksi', icon: '🚕', color: 'bg-yellow-500' },
  { id: 'ojek', label: 'Ojek', icon: '🏍️', color: 'bg-green-500' },
  { id: 'walk', label: 'Jalan Kaki', icon: '🚶', color: 'bg-gray-500' },
];

export default function RouteBuilder({ onRoutesChange, initialRoutes = [] }: RouteBuilderProps) {
  const [routes, setRoutes] = useState<RouteInfo[]>(
    initialRoutes.length > 0 ? initialRoutes : [{
      id: Date.now().toString(),
      name: 'Rute 1',
      from: '',
      fromLat: undefined,
      fromLng: undefined,
      to: '',
      toLat: undefined,
      toLng: undefined,
      mode: 'angkot',
      price: '',
      duration: '',
      distance: '',
      notes: ''
    }]
  );
  
  const [locationModalState, setLocationModalState] = useState<{
    isOpen: boolean;
    routeId: string | null;
    field: 'from' | 'to' | null;
  }>({ isOpen: false, routeId: null, field: null });
  
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  const addRoute = () => {
    const newRoute: RouteInfo = {
      id: Date.now().toString(),
      name: `Rute ${routes.length + 1}`,
      from: '',
      fromLat: undefined,
      fromLng: undefined,
      to: '',
      toLat: undefined,
      toLng: undefined,
      mode: 'angkot',
      price: '',
      duration: '',
      distance: '',
      notes: ''
    };
    const updatedRoutes = [...routes, newRoute];
    setRoutes(updatedRoutes);
    onRoutesChange(updatedRoutes);
  };
  
  const openLocationPicker = (routeId: string, field: 'from' | 'to') => {
    setLocationModalState({ isOpen: true, routeId, field });
  };
  
  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    if (!locationModalState.routeId || !locationModalState.field) return;
    
    const field = locationModalState.field;
    const updatedRoutes = routes.map(route => {
      if (route.id === locationModalState.routeId) {
        const updated = {
          ...route,
          [field]: address,
          [`${field}Lat`]: lat,
          [`${field}Lng`]: lng
        };
        
        // Auto-calculate distance if both locations are set
        if (updated.fromLat && updated.fromLng && updated.toLat && updated.toLng) {
          updated.distance = calculateRealDistance(
            updated.fromLat, updated.fromLng,
            updated.toLat, updated.toLng
          );
        }
        
        return updated;
      }
      return route;
    });
    
    setRoutes(updatedRoutes);
    onRoutesChange(updatedRoutes);
    setLocationModalState({ isOpen: false, routeId: null, field: null });
  };
  
  // Calculate real distance using Haversine formula
  const calculateRealDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  const removeRoute = (id: string) => {
    if (routes.length === 1) {
      toast.error('Minimal harus ada 1 rute');
      return;
    }
    const updatedRoutes = routes.filter(r => r.id !== id);
    setRoutes(updatedRoutes);
    onRoutesChange(updatedRoutes);
  };

  const updateRoute = (id: string, field: keyof RouteInfo, value: string) => {
    const updatedRoutes = routes.map(route => {
      if (route.id === id) {
        const updated = { ...route, [field]: value };
        
        // Auto-calculate distance when from/to changes
        if ((field === 'from' || field === 'to') && updated.from && updated.to) {
          updated.distance = estimateDistance(updated.from, updated.to);
        }
        
        return updated;
      }
      return route;
    });
    setRoutes(updatedRoutes);
    onRoutesChange(updatedRoutes);
  };

  // Simple distance estimation based on string similarity (mock implementation)
  const estimateDistance = (from: string, to: string): string => {
    if (!from || !to) return '';
    
    // Mock calculation - in real app, use Google Maps Distance Matrix API
    const baseDistance = Math.abs(from.length - to.length) + 5;
    const randomFactor = Math.random() * 3;
    const distance = (baseDistance + randomFactor).toFixed(1);
    
    return distance;
  };

  const formatPrice = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    return parseInt(numbers).toLocaleString('id-ID');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Navigation className="text-brand-500" size={20} />
          Info Rute Transportasi
        </h3>
        <button
          onClick={addRoute}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all text-sm font-medium"
        >
          <Plus size={16} />
          Tambah Rute
        </button>
      </div>

      <div className="space-y-4">
        {routes.map((route, index) => (
          <div
            key={route.id}
            className="bg-surface-main border-2 border-border-light rounded-2xl p-5 relative group hover:border-brand-500/30 transition-all"
          >
            {/* Route Header with Name */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-lg">
                  {index + 1}
                </div>
                {editingNameId === route.id ? (
                  <input
                    type="text"
                    value={route.name}
                    onChange={(e) => updateRoute(route.id, 'name', e.target.value)}
                    onBlur={() => setEditingNameId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingNameId(null);
                      if (e.key === 'Escape') setEditingNameId(null);
                    }}
                    autoFocus
                    className="bg-surface-subtle border-2 border-brand-500 rounded-lg px-3 py-1.5 text-text-primary font-bold outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-text-primary">{route.name}</h4>
                    <button
                      onClick={() => setEditingNameId(route.id)}
                      className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-secondary hover:text-brand-500"
                      title="Edit nama rute"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Delete Button */}
              {routes.length > 1 && (
                <button
                  onClick={() => removeRoute(route.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-secondary hover:text-red-500"
                  title="Hapus rute"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Transport Mode Selector */}
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-2 block uppercase tracking-wider">
                  Moda Transportasi
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TRANSPORT_MODES.map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateRoute(route.id, 'mode', mode.id)}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all ${
                        route.mode === mode.id
                          ? `${mode.color} border-transparent text-white shadow-lg`
                          : 'bg-surface-subtle border-border-light text-text-secondary hover:border-brand-500/30'
                      }`}
                    >
                      <span className="text-2xl">{mode.icon}</span>
                      <span className="text-xs font-medium">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* From & To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-2 block uppercase tracking-wider">
                    Dari
                  </label>
                  <button
                    type="button"
                    onClick={() => openLocationPicker(route.id, 'from')}
                    className="w-full bg-surface-subtle hover:bg-surface-hover border-2 border-border-light hover:border-brand-500/50 rounded-xl px-4 py-3 outline-none transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPinned size={18} className="text-brand-500 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        {route.from ? (
                          <span className="text-text-primary font-medium truncate block">{route.from}</span>
                        ) : (
                          <span className="text-text-secondary/70">Pilih lokasi awal</span>
                        )}
                      </div>
                      <MapPin size={16} className="text-text-secondary/50 group-hover:text-brand-500 transition-colors" />
                    </div>
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-2 block uppercase tracking-wider">
                    Ke
                  </label>
                  <button
                    type="button"
                    onClick={() => openLocationPicker(route.id, 'to')}
                    className="w-full bg-surface-subtle hover:bg-surface-hover border-2 border-border-light hover:border-red-500/50 rounded-xl px-4 py-3 outline-none transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPinned size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        {route.to ? (
                          <span className="text-text-primary font-medium truncate block">{route.to}</span>
                        ) : (
                          <span className="text-text-secondary/70">Pilih lokasi tujuan</span>
                        )}
                      </div>
                      <MapPin size={16} className="text-text-secondary/50 group-hover:text-red-500 transition-colors" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Price, Duration, Distance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-2 block uppercase tracking-wider">
                    Harga
                  </label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <span className="absolute left-9 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                      Rp
                    </span>
                    <input
                      type="text"
                      value={route.price ? formatPrice(route.price) : ''}
                      onChange={(e) => updateRoute(route.id, 'price', e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-full bg-surface-subtle border-2 border-border-light focus:border-brand-500 rounded-xl pl-16 pr-4 py-3 outline-none text-text-primary placeholder:text-text-secondary/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-2 block uppercase tracking-wider">
                    Durasi
                  </label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                    <input
                      type="text"
                      value={route.duration}
                      onChange={(e) => updateRoute(route.id, 'duration', e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-full bg-surface-subtle border-2 border-border-light focus:border-brand-500 rounded-xl pl-10 pr-16 py-3 outline-none text-text-primary placeholder:text-text-secondary/50 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                      menit
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-2 block uppercase tracking-wider flex items-center gap-1">
                    Jarak
                    {route.distance && (
                      <span className="text-[10px] text-brand-500 font-normal normal-case">(estimasi)</span>
                    )}
                  </label>
                  <div className="relative">
                    <Navigation size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                    <input
                      type="text"
                      value={route.distance}
                      onChange={(e) => updateRoute(route.id, 'distance', e.target.value)}
                      placeholder="0"
                      className="w-full bg-surface-subtle border-2 border-border-light focus:border-brand-500 rounded-xl pl-10 pr-12 py-3 outline-none text-text-primary placeholder:text-text-secondary/50 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                      km
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-2 block uppercase tracking-wider">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={route.notes}
                  onChange={(e) => updateRoute(route.id, 'notes', e.target.value)}
                  placeholder="Tips atau informasi tambahan tentang rute ini..."
                  rows={2}
                  className="w-full bg-surface-subtle border-2 border-border-light focus:border-brand-500 rounded-xl px-4 py-3 outline-none text-text-primary placeholder:text-text-secondary/50 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {routes.length > 1 && (
        <div className="bg-brand-500/10 border-2 border-brand-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary font-medium">Total {routes.length} rute</span>
            <div className="flex items-center gap-4">
              {routes.some(r => r.price) && (
                <span className="text-text-primary font-bold">
                  Total Biaya: Rp {routes.reduce((sum, r) => sum + (parseInt(r.price) || 0), 0).toLocaleString('id-ID')}
                </span>
              )}
              {routes.some(r => r.duration) && (
                <span className="text-text-secondary">
                  Total Waktu: {routes.reduce((sum, r) => sum + (parseInt(r.duration) || 0), 0)} menit
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={locationModalState.isOpen}
        onClose={() => setLocationModalState({ isOpen: false, routeId: null, field: null })}
        defaultLocation={
          locationModalState.routeId && locationModalState.field
            ? (() => {
                const route = routes.find(r => r.id === locationModalState.routeId);
                if (!route) return undefined;
                const field = locationModalState.field;
                const lat = field === 'from' ? route.fromLat : route.toLat;
                const lng = field === 'from' ? route.fromLng : route.toLng;
                return lat && lng ? { lat, lng } : undefined;
              })()
            : undefined
        }
        onSelect={handleLocationSelect}
      />
    </div>
  );
}
