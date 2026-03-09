import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { routeService } from '../lib/api';
import { MapPin, ArrowRight, User as UserIcon, Navigation, TrainFront, Bus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface RouteData {
  id: string;
  name: string;
  description: string | null;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  transportModes: string[];
  estimatedTime: number | null;
  estimatedCost: number | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export default function RoutesPage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [routesData, setRoutesData] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);

  // New Route State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [transportMode, setTransportMode] = useState('bus');
  const [estimatedTime, setEstimatedTime] = useState('');

  // Fixed dummy coordinations for now since it requires Map UI to select properly
  const [startLat] = useState(-6.2088); 
  const [startLng] = useState(106.8456);
  const [endLat] = useState(-6.1751);
  const [endLng] = useState(106.8272);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const data = await routeService.getRoutes();
      setRoutesData(data);
    } catch (error) {
      console.error('Failed to fetch routes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      const newRoute = await routeService.createRoute({
        name,
        description,
        startLat,
        startLng,
        endLat,
        endLng,
        transportModes: [transportMode],
        estimatedTime: estimatedTime ? parseInt(estimatedTime, 10) : undefined,
      });
      setRoutesData([newRoute, ...routesData]);
      setName('');
      setDescription('');
      setEstimatedTime('');
    } catch (error) {
      console.error('Failed to create route', error);
      alert('Gagal membuat rute alternatif');
    }
  };

  return (
    <div className="min-h-screen bg-bg-body font-sans text-text-primary">
      {/* Top Navbar */}
      <header className="bg-surface-main shadow-sm border-b border-border-light sticky top-0 z-50">
        <div className="w-full px-4 h-[56px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 w-1/4 cursor-pointer">
            <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm cursor-pointer">
              T
            </div>
            <h1 className="text-xl font-bold text-brand-600 hidden xl:block">Transitly</h1>
          </Link>
          
          <div className="hidden md:flex flex-1 max-w-[680px] mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="Cari rute impian Anda..." 
              className="w-full bg-surface-hover border-none rounded-full py-2.5 pl-10 pr-4 text-sm font-normal text-text-primary focus:ring-2 focus:ring-brand-500 focus:bg-surface-main transition-colors outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 w-1/4">
            <span className="text-sm font-semibold text-text-primary hidden sm:block truncate max-w-[120px]">
              {user?.fullName || user?.username}
            </span>
            <div className="w-10 h-10 rounded-full bg-surface-hover overflow-hidden border border-border-light cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="text-text-secondary w-3/5 h-3/5" strokeWidth={2} />
              )}
            </div>
            <div 
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center cursor-pointer hover:bg-border-light transition-colors"
              title="Keluar"
            >
              <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="w-full flex justify-between pt-4 lg:pt-6">
        
        {/* Left Sidebar Menu */}
        <div className="hidden lg:block w-[280px] xl:w-[360px] pl-2 xl:pl-4 pr-4 shrink-0">
          <div className="sticky top-[80px]">
            <Link to="/" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors text-text-primary mb-1">
              <div className="bg-surface-main border border-border-light w-9 h-9 rounded-full flex items-center justify-center text-text-secondary shadow-sm">
                <Navigation size={18} fill="none" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-[15px]">Linimasa Utama</span>
            </Link>
             
            <Link to="/routes" className="flex items-center gap-3 px-3 py-3 rounded-lg bg-surface-hover cursor-pointer transition-colors text-brand-600 mb-4">
              <div className="bg-brand-500 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm">
                <MapPin size={18} fill="currentColor" />
              </div>
              <span className="font-semibold text-[15px]">Rute Alternatif</span>
            </Link>

            <div className="h-px bg-border-light mx-2 mb-4"></div>

            <h3 className="font-semibold text-text-secondary mb-2 px-3 text-[17px]">Filter Kendaraan</h3>
            <ul className="space-y-1">
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-surface-hover text-text-primary">
                   <TrainFront size={20} className="text-orange-500" />
                  <span className="font-semibold text-[15px]">Kereta / MRT / LRT</span>
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-surface-hover text-text-primary">
                  <Bus size={20} className="text-blue-500" />
                  <span className="font-semibold text-[15px]">TransJakarta / Mikro</span>
                </button>
              </li>
            </ul>
             
             <div className="mt-8 px-3 text-xs text-text-secondary opacity-70">
                Privasi · Ketentuan · Iklan · Cookie · Lebih Lanjut © 2026 Transitly Inc.
             </div>
          </div>
        </div>

        {/* Central Route Column */}
        <div className="flex-1 max-w-[680px] w-full mx-auto px-2 sm:px-0">
          
          <div className="bg-brand-500/10 rounded-xl p-4 mb-4 border border-brand-500/20">
             <h2 className="text-lg font-bold text-brand-400 mb-1">Berbagi Rute Rahasia Komuter</h2>
             <p className="text-sm text-brand-300">Publikasikan jalan tikus atau panduan cerdas menghindari macet ke sesama pejuang komuter.</p>
          </div>

          {/* Create Route Card */}
          <div className="bg-surface-main/60 backdrop-blur-xl rounded-3xl shadow-lg mb-8 border border-surface-hover hover:border-brand-500/30 transition-all overflow-hidden p-6">
            <h3 className="font-bold text-text-primary border-b border-surface-hover pb-3 mb-4 text-[16px]">Tambah Rute Alternatif Baru</h3>
            <form onSubmit={handleCreateRoute} className="space-y-4">
               <div>
                  <input
                     type="text"
                     placeholder="Beri nama rute ini (misal: Rute Anti Macet Blok M - Sudirman)"
                     className="w-full px-4 py-2.5 bg-surface-hover rounded-xl text-sm font-semibold border-none focus:ring-2 focus:ring-brand-500 outline-none placeholder:font-normal"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                  />
               </div>
               
               <div>
                  <textarea 
                     placeholder="Jelaskan detail petunjuknya, naik jurusan apa lalu turun di mana..."
                     className="w-full px-4 py-3 bg-surface-hover hover:bg-surface-subtle border-none resize-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                     rows={3}
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                  />
               </div>

               <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-semibold text-text-secondary">Pilih Moda:</span>
                     <select 
                        className="appearance-none bg-surface-hover border-none font-semibold text-sm text-text-primary outline-none px-4 py-2 rounded-lg focus:ring-2 focus:ring-brand-500 cursor-pointer"
                        value={transportMode}
                        onChange={(e) => setTransportMode(e.target.value)}
                     >
                        <option value="bus">Bus / TransJakarta</option>
                        <option value="train">KRL / MRT / LRT</option>
                        <option value="walk">Kombinasi Jalan Kaki</option>
                        <option value="angkot">Mikrotrans / Angkot</option>
                     </select>
                  </div>

                  <div className="flex items-center gap-2">
                     <span className="text-sm font-semibold text-text-secondary">Waktu Tempuh:</span>
                     <input
                        type="number"
                        placeholder="Menit"
                        className="w-24 px-3 py-2 bg-surface-hover rounded-lg text-sm font-semibold border-none focus:ring-2 focus:ring-brand-500 outline-none"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                     />
                  </div>
               </div>

               <div className="text-xs text-text-secondary italic">
                  *Peta interaktif (koordinat pin) belum tersedia, namun deskripsi rute tetap bisa dibagikan publik.
               </div>

               <div className="flex justify-end pt-2">
                  <button 
                     type="submit" 
                     disabled={!name.trim() || !description.trim()} 
                     className={`rounded-lg px-6 py-2 font-semibold text-[15px] transition-all ${name.trim() && description.trim() ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm' : 'bg-surface-hover text-text-secondary/50 cursor-not-allowed'}`}
                  >
                     Bagikan Rute Publik
                  </button>
               </div>
            </form>
          </div>

          {/* Loading status */}
          {loading && (
            <div className="flex justify-center p-8 bg-surface-main rounded-xl border border-border-light mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          )}

          {/* Empty state */}
          {!loading && routesData.length === 0 && (
            <div className="bg-surface-main/60 backdrop-blur-md rounded-3xl p-12 text-center border border-surface-hover shadow-lg">
              <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={36} className="text-text-secondary opcaity-50" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Belum Ada Rute</h3>
              <p className="text-text-secondary">
                 Bantu komunitas menyiasati kemacetan dengan membagikan panduan rute alternatif andalan Anda.
              </p>
            </div>
          )}

          {/* Routes Feed Feed */}
          <div className="space-y-6 pb-12">
            {routesData.map(route => (
              <div key={route.id} className="bg-surface-main/60 backdrop-blur-md rounded-3xl shadow-lg border border-surface-hover hover:border-brand-500/30 transition-all overflow-hidden">
                <div className="p-5">
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-surface-hover border border-border-light overflow-hidden shrink-0">
                        {route.user?.avatarUrl ? (
                           <img src={route.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                           <UserIcon className="text-text-secondary w-3/5 h-3/5 mt-1 mx-auto" strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex flex-col -mt-0.5">
                        <h4 className="font-semibold text-text-primary text-[15px] tracking-tight">
                           {route.name}
                        </h4>
                        <div className="flex items-center text-[13px] text-text-secondary gap-1 mt-0.5">
                           Oleh <span className="font-semibold text-text-primary hover:underline cursor-pointer">{route.user?.fullName || route.user?.username}</span>
                           <span>•</span>
                           <span className="">{formatDistanceToNow(new Date(route.createdAt), { addSuffix: true, locale: id })}</span>
                        </div>
                      </div>
                    </div>

                     {/* Transport Mode Icon */}
                     <div className="p-2 bg-surface-hover rounded-xl text-text-secondary">
                        {route.transportModes?.includes('train') ? <TrainFront size={20} className="text-orange-500"/> : <Bus size={20} className="text-blue-500"/>}
                     </div>
                  </div>

                  <div className="bg-surface-hover rounded-xl p-3 text-sm text-text-primary mb-3 font-medium whitespace-pre-wrap leading-relaxed">
                     {route.description}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                     <span className="text-[12px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-brand-500/30 bg-brand-500/10 text-brand-400 flex items-center gap-1">
                        <MapPin size={12}/> {route.estimatedTime ? `Estimasi: ${route.estimatedTime} Menit` : 'Waktu Fleksibel'}
                     </span>
                     {route.transportModes?.length > 0 && route.transportModes.map(mode => (
                        <span key={mode} className="text-[12px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-green-500/30 bg-green-500/10 text-green-400">
                           {mode === 'bus' ? 'Busway' : mode === 'train' ? 'KRL/MRT' : mode === 'angkot' ? 'Mikrotrans' : 'Jalan Kaki'}
                        </span>
                     ))}
                  </div>

                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Info Sidebar */}
        <div className="hidden md:block w-[280px] xl:w-[350px] pr-2 xl:pr-4 pl-4 shrink-0">
          <div className="sticky top-[80px]">
             
            <h3 className="font-bold text-text-primary mb-3 px-2 text-[17px]">Rute Populer Hari Ini</h3>
            <div className="space-y-1">
               <div className="hover:bg-surface-hover p-2.5 rounded-xl cursor-pointer transition-colors relative flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-blue-500/30 bg-blue-500/10 flex items-center justify-center shrink-0">
                     <span className="font-bold text-blue-400 text-xs text-center leading-tight">1</span>
                  </div>
                  <div>
                     <h4 className="font-semibold text-text-primary text-[14px] leading-tight mb-0.5">Sudirman - Tebet (Anti Macet)</h4>
                     <p className="text-[12px] text-text-secondary flex items-center gap-1">Jalan Kaki <ArrowRight size={10}/> MRT <ArrowRight size={10}/> TJ</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
