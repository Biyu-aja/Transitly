import { Link } from 'react-router-dom';
import { User as UserIcon, Navigation, MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function SideMenu() {
  const { user } = useAuthStore();
  const { feedRadius, setFeedRadius, setFeedCoords } = useUIStore();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const location = useLocation();

  const handleUseCurrentLocationForFeed = () => {
    setIsGettingLocation(true);
    if (!('geolocation' in navigator)) {
      alert('Geolocation tidak didukung di browser ini.');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFeedCoords({ lat: latitude, lng: longitude });
        setFeedRadius(5); // 5km default radius
        setIsGettingLocation(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      (error) => {
        console.error("Error getting location:", error);
        alert('Gagal mendapatkan lokasi Anda. Pastikan Anda telah memberikan izin lokasi.');
        setIsGettingLocation(false);
      }
    );
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="hidden lg:block w-[280px] xl:w-[360px] pl-2 xl:pl-4 pr-4 shrink-0">
      <div className="sticky top-[80px]">
        {/* Profile Link Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors">
          <div className="w-9 h-9 rounded-full bg-surface-hover overflow-hidden border border-border-light flex items-center justify-center shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="text-text-secondary w-3/5 h-3/5" strokeWidth={2} />
            )}
          </div>
          <span className="font-semibold text-[15px]">{user?.fullName || user?.username}</span>
        </div>

        <div className="h-px bg-border-light mx-2 mb-4"></div>
        
        <Link to="/" className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors mb-1 ${isActive('/') ? 'bg-surface-hover text-brand-600' : 'hover:bg-surface-hover text-text-primary'}`}>
          <div className={`${isActive('/') ? 'bg-brand-500 text-white' : 'bg-surface-main text-text-secondary'} border border-border-light w-9 h-9 rounded-full flex items-center justify-center shadow-sm`}>
            <Navigation size={18} fill="none" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-[15px]">Linimasa Utama</span>
        </Link>
          
        <Link to="/routes" className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors mb-4 ${isActive('/routes') ? 'bg-surface-hover text-brand-600' : 'hover:bg-surface-hover text-text-primary'}`}>
          <div className={`${isActive('/routes') ? 'bg-brand-500 text-white border-transparent' : 'bg-surface-main text-text-secondary border-border-light'} border w-9 h-9 rounded-full flex items-center justify-center shadow-sm`}>
            <MapPin size={18} fill="currentColor" />
          </div>
          <span className="font-semibold text-[15px]">Rute Alternatif</span>
        </Link>

        <div className="h-px bg-border-light mx-2 mb-4"></div>

        <h3 className="font-semibold text-text-secondary mb-2 px-3 text-[17px]">Filter Linimasa</h3>
        <ul className="space-y-1">
          <li>
            <button 
              onClick={() => setFeedRadius(null)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${feedRadius === null ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
            >
              <div className="bg-brand-500 w-9 h-9 rounded-full flex items-center justify-center text-white"><Navigation size={20} fill="currentColor" /></div>
              <span className="font-semibold text-[15px]">Tampilan Global</span>
            </button>
          </li>
          <li>
            <button 
              onClick={handleUseCurrentLocationForFeed}
              disabled={isGettingLocation}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${feedRadius !== null ? 'bg-surface-hover' : 'hover:bg-surface-hover'} ${isGettingLocation ? 'opacity-70 disabled' : ''}`}
            >
              <div className="bg-green-500 w-9 h-9 rounded-full flex items-center justify-center text-white">
                <MapPin size={20} fill="currentColor" className={isGettingLocation ? 'animate-bounce' : ''} />
              </div>
              <span className="font-semibold text-[15px]">Di Sekitar Saya {feedRadius && `(${feedRadius}km)`}</span>
            </button>
          </li>
        </ul>
          
        <div className="mt-8 px-3 text-xs text-text-secondary opacity-70">
            Privasi · Ketentuan · Iklan · Cookie · Lebih Lanjut © 2026 Transitly Inc.
        </div>
      </div>
    </div>
  );
}
