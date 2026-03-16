import { Link, useLocation } from 'react-router-dom';
import { User as UserIcon, Home, Compass, MapPin, Plus, Radar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
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
    <div className="hidden lg:block w-[240px] xl:w-[280px] px-4 shrink-0 font-medium">
      <div className="sticky top-[88px] flex flex-col gap-6">
        
        {/* User Card */}
        <div className="flex items-center gap-3.5 px-1 group">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-brand-500/20 to-emerald-500/10 border border-brand-500/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-300">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="text-brand-500 w-1/2 h-1/2" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-text-primary text-[15px] truncate">{user?.fullName || user?.username}</span>
            <span className="text-xs text-text-secondary truncate">Pengguna Aktif</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1.5 mt-2">
          <Link 
            to="/" 
            className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl transition-all duration-300 ${
              isActive('/') 
                ? 'bg-brand-500/10 text-brand-500 shadow-[0_0_15px_rgba(16,185,129,0.05)] font-semibold' 
                : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary'
            }`}
          >
            <Home size={20} className={isActive('/') ? 'fill-brand-500/20 stroke-[2.5]' : 'stroke-2'} />
            <span className="text-[15px]">Beranda</span>
          </Link>
          
          <Link 
            to="/routes" 
            className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl transition-all duration-300 ${
              isActive('/routes') 
                ? 'bg-brand-500/10 text-brand-500 shadow-[0_0_15px_rgba(16,185,129,0.05)] font-semibold' 
                : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary'
            }`}
          >
            <Compass size={20} className={isActive('/routes') ? 'fill-brand-500/20 stroke-[2.5]' : 'stroke-2'} />
            <span className="text-[15px]">Rute Alternatif</span>
          </Link>

          <Link 
            to="/create-post" 
            className="flex items-center gap-3 px-3.5 py-3 mt-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all justify-center transform hover:-translate-y-1"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="font-bold text-[14px] tracking-wide">INFO BARU</span>
          </Link>
        </nav>

        {/* Filters */}
        <div className="flex flex-col gap-2 mt-4">
          <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest px-2 mb-2">Area Tontonan</h3>
          
          <button 
            onClick={() => setFeedRadius(null)}
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all w-full text-left ${
              feedRadius === null 
                ? 'text-text-primary font-semibold' 
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <Radar size={18} className={feedRadius === null ? 'text-brand-500 animate-[spin_4s_linear_infinite]' : ''} />
            <span className="text-[14px]">Semua Wilayah</span>
            {feedRadius === null && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_5px_#10b981]"></span>}
          </button>

          <button 
            onClick={handleUseCurrentLocationForFeed}
            disabled={isGettingLocation}
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all w-full text-left ${
              feedRadius !== null 
                ? 'text-text-primary font-semibold' 
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            } ${isGettingLocation ? 'opacity-70 disabled' : ''}`}
          >
            <MapPin size={18} className={feedRadius !== null ? 'text-green-500' : ''} />
            <span className="text-[14px]">Dekat Saya {feedRadius && <span className="text-xs ml-1 bg-surface-subtle px-1.5 py-0.5 rounded-md text-text-secondary font-mono">{feedRadius}km</span>}</span>
            {feedRadius !== null && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>}
          </button>
        </div>
          
        {/* Footer */}
        <div className="mt-8 px-2 text-[11px] font-medium text-text-secondary/50 leading-relaxed">
            Membantu jutaan komuter.<br/>
            © 2026 Transitly Inc.
        </div>
      </div>
    </div>
  );
}
