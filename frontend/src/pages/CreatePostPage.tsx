import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { postService } from '../lib/api';
import { MapPin, Image as ImageIcon, User as UserIcon, ArrowLeft, Send, Sparkles, Navigation, AlertTriangle, MessageCircle, Lightbulb, Tag, Route as RouteIcon } from 'lucide-react';
import { uploadImageToSupabase } from '../lib/supabase';
import LocationPickerModal from '../components/LocationPickerModal';
import RouteBuilder from '../components/RouteBuilder';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const CATEGORIES = [
  { id: 'discussion', label: 'Diskusi', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'alert', label: 'Peringatan', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { id: 'question', label: 'Tanya Rute', icon: Navigation, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'tip', label: 'Tips Cepat', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
];

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

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // New Post State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('discussion');
  const [locationName, setLocationName] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [price, setPrice] = useState('');
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [showRouteBuilder, setShowRouteBuilder] = useState(false);


  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && uploadedImageUrls.length === 0 && routes.length === 0) return;

    const categoryTags: Record<string, string> = {
      'discussion': '#Diskusi',
      'alert': '#Peringatan',
      'question': '#TanyaRute',
      'tip': '#TipsCepat'
    };
    
    const autoTag = categoryTags[category];
    let finalContent = content.trim();

    // Add route info to content
    if (routes.length > 0) {
      const routeText = routes.map((route, idx) => {
        const modeEmojis: Record<string, string> = {
          angkot: '🚐', bus: '🚌', krl: '🚆', mrt: '🚇',
          transjakarta: '🚍', taksi: '🚕', ojek: '🏍️', walk: '🚶'
        };
        const emoji = modeEmojis[route.mode] || '🚐';
        
        let routeInfo = `\n\n**Rute ${idx + 1}:** ${emoji} ${route.mode.toUpperCase()}\n`;
        routeInfo += `📍 ${route.from} → ${route.to}\n`;
        if (route.price) routeInfo += `💰 Rp ${parseInt(route.price).toLocaleString('id-ID')}\n`;
        if (route.duration) routeInfo += `⏱️ ${route.duration} menit`;
        if (route.distance) routeInfo += ` • ${route.distance} km`;
        if (route.duration || route.distance) routeInfo += '\n';
        if (route.notes) routeInfo += `📝 ${route.notes}\n`;
        
        return routeInfo;
      }).join('');
      
      finalContent = finalContent ? `${finalContent}${routeText}` : routeText;
      
      // Add summary if multiple routes
      if (routes.length > 1) {
        const totalPrice = routes.reduce((sum, r) => sum + (parseInt(r.price) || 0), 0);
        const totalDuration = routes.reduce((sum, r) => sum + (parseInt(r.duration) || 0), 0);
        finalContent += `\n\n**Total:** ${routes.length} rute`;
        if (totalPrice > 0) finalContent += ` • Rp ${totalPrice.toLocaleString('id-ID')}`;
        if (totalDuration > 0) finalContent += ` • ${totalDuration} menit`;
      }
    }

    if (price.trim()) {
      // Format nominal dengan pemisah ribuan
      const numericPrice = parseInt(price.replace(/[^0-9]/g, ''), 10);
      const formattedPrice = isNaN(numericPrice) ? price : numericPrice.toLocaleString('id-ID');
      finalContent = finalContent
        ? `${finalContent}\n\n🏷️ **Tarif / Biaya:** Rp ${formattedPrice}`
        : `🏷️ **Tarif / Biaya:** Rp ${formattedPrice}`;
    }
    
    if (autoTag && !finalContent.toLowerCase().includes(autoTag.toLowerCase())) {
      finalContent = finalContent ? `${finalContent}\n\n${autoTag}` : autoTag;
    }
    
    try {
      setIsSubmitting(true);
      await postService.createPost({
        content: finalContent || content,
        title: title || 'Post Baru',
        category,
        locationLat: coords?.lat,
        locationLng: coords?.lng,
        locationName,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : []
      });
      toast.success('Postingan berhasil diterbitkan!');
      navigate('/');
    } catch (error) {
      console.error('Failed to create post', error);
      toast.error('Gagal membuat postingan, silakan coba lagi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    if (uploadedImageUrls.length + files.length > 4) {
      toast.error('Maksimal 4 gambar per postingan');
      return;
    }

    const oversizedFile = files.find(f => f.size > 5 * 1024 * 1024);
    if (oversizedFile) {
      toast.error(`"${oversizedFile.name}" melebihi ukuran batas (5MB)`);
      return;
    }

    try {
      setIsUploadingImage(true);
      const newUrls = await Promise.all(files.map(file => uploadImageToSupabase(file)));
      setUploadedImageUrls(prev => [...prev, ...newUrls]);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Gagal mengunggah gambar jaringan');
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-bg-body text-text-primary px-4 py-8 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-surface-main hover:bg-surface-hover border border-border-light rounded-2xl transition-all shadow-sm group"
          >
            <ArrowLeft size={20} className="text-text-secondary group-hover:text-text-primary transition-colors" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-brand-500 to-emerald-300 bg-clip-text text-transparent transform">
              Buat Informasi
            </h1>
            <p className="text-text-secondary text-sm">Bagikan kondisi terkini kepada komuter lain</p>
          </div>
        </div>

        {/* Main Editor Card */}
        <div className="bg-surface-main/80 backdrop-blur-2xl rounded-[2.5rem] border border-border-light shadow-2xl overflow-hidden shadow-brand-500/5 relative">
          
          {/* Top Decorative Gradient */}
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-brand-600 via-emerald-400 to-teal-500" />
          
          <div className="p-6 sm:p-8">
            {/* User Meta */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-full bg-linear-to-tr from-brand-600 to-emerald-400 p-[2px] shadow-lg">
                <div className="w-full h-full rounded-full bg-surface-main overflow-hidden border-2 border-surface-main flex items-center justify-center">
                  {user?.avatarUrl ? (
                     <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                     <UserIcon className="text-text-secondary w-3/5 h-3/5" strokeWidth={2} />
                  )}
                </div>
              </div>
              <div>
                <div className="font-bold text-lg flex items-center gap-2">
                  {user?.fullName || user?.username || 'Sobat Transitly'}
                  <Sparkles size={16} className="text-brand-500" />
                </div>
                <div className="text-text-secondary text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                  Siap membagikan info
                </div>
              </div>
            </div>

            {/* Category Selector */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-text-secondary mb-3 block uppercase tracking-wider">Pilih Kategori</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl border transition-all ${
                        isActive 
                          ? `bg-surface-hover border-brand-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]` 
                          : `bg-surface-subtle/50 border-border-light/50 hover:bg-surface-hover hover:border-border-light`
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${isActive ? `${cat.bg} ${cat.color}` : 'bg-surface-main text-text-secondary'}`}>
                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Blog-style Title Input */}
            <div className="mb-4">
              <input 
                type="text"
                placeholder="Judul"
                className="w-full bg-transparent border-0 border-b-2 border-orange-500 focus:border-orange-400 focus:ring-0 px-0 py-2 outline-none placeholder:text-text-secondary/50 text-2xl transition-colors text-text-primary font-bold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Rich Text Editor */}
            <div className="mb-6 relative group editor-container">
              <ReactQuill 
                theme="snow"
                value={content}
                onChange={setContent}
                placeholder="Tulis informasi transportasi di sini... (contoh: KRL arah Bogor tertahan di stasiun Cawang)"
                modules={{
                  toolbar: [
                    [{ 'font': [] }, { 'size': [] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'header': '1'}, { 'header': '2'}, 'blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet'}, { 'indent': '-1'}, { 'indent': '+1' }],
                    ['direction', { 'align': [] }],
                    ['link', 'image', 'video'],
                    ['clean']
                  ],
                }}
                className="text-text-primary"
              />
              <style>{`
                .editor-container .ql-toolbar {
                  border-top-left-radius: 1rem;
                  border-top-right-radius: 1rem;
                  background-color: var(--color-surface-hover);
                  border-color: rgba(255,255,255,0.1);
                  padding: 12px;
                }
                .editor-container .ql-container {
                  border-bottom-left-radius: 1rem;
                  border-bottom-right-radius: 1rem;
                  min-height: 200px;
                  font-size: 1.125rem;
                  border-color: rgba(255,255,255,0.1);
                  background-color: rgba(255,255,255,0.02);
                }
                .editor-container .ql-editor {
                  min-height: 200px;
                  padding: 1.5rem;
                }
                .editor-container .ql-editor.ql-blank::before {
                  color: rgba(255,255,255,0.4);
                  font-style: normal;
                }
                /* Dark Mode fixes for Quill Icons */
                .editor-container .ql-stroke { stroke: var(--color-text-secondary); }
                .editor-container .ql-fill { fill: var(--color-text-secondary); }
                .editor-container .ql-picker { color: var(--color-text-secondary); }
                .editor-container button:hover .ql-stroke { stroke: var(--color-brand-500); }
                .editor-container button:hover .ql-fill { fill: var(--color-brand-500); }
                .editor-container .ql-picker-label:hover { color: var(--color-brand-500); }
                .editor-container .ql-picker-label:hover .ql-stroke { stroke: var(--color-brand-500); }
                .editor-container .ql-active .ql-stroke { stroke: var(--color-brand-500); }
                .editor-container .ql-active .ql-fill { fill: var(--color-brand-500); }
                .editor-container .ql-picker-item:hover { color: var(--color-brand-500); }
                /* Custom Toolbar Scroll for Mobile */
                .editor-container .ql-toolbar {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                }
              `}</style>
            </div>

            {/* Route Builder Section */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowRouteBuilder(!showRouteBuilder)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${
                  showRouteBuilder || routes.length > 0
                    ? 'bg-brand-500/10 border-brand-500/30 text-brand-500'
                    : 'bg-surface-subtle/30 border-border-light/50 text-text-secondary hover:border-brand-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RouteIcon size={20} />
                  <span className="font-semibold">
                    {routes.length > 0 ? `${routes.length} Rute Ditambahkan` : 'Tambah Info Rute'}
                  </span>
                </div>
                <span className={`transform transition-transform ${showRouteBuilder ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showRouteBuilder && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <RouteBuilder
                    onRoutesChange={setRoutes}
                    initialRoutes={routes}
                  />
                </div>
              )}
            </div>

            {/* Price/Tariff Input (Optional) */}
            <div className="mb-6 relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Tag size={18} className="text-brand-500/70" />
                <span className="text-text-secondary font-bold ml-2">Rp</span>
              </div>
              <input 
                type="text"
                placeholder="Tambahkan info tarif rute/tiket (Opsional)"
                className="w-full bg-surface-subtle/30 hover:bg-surface-subtle/70 border-2 border-border-light/50 focus:border-brand-500/50 rounded-[1.25rem] pl-18 pr-6 py-4 outline-none placeholder:text-text-secondary/70 transition-all text-text-primary text-[15px] font-medium"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))} // Input hanya angka
              />
            </div>

            {/* Attachments Section */}
            <div className="flex flex-col gap-4">
              
              {/* Added Location Chip */}
              {locationName && (
                <div className="flex items-center self-start bg-brand-500/10 border border-brand-500/20 px-4 py-2.5 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-brand-500/20 p-1.5 rounded-lg mr-3">
                    <MapPin size={16} fill="currentColor" className="text-brand-500" />
                  </div>
                  <span className="text-sm font-medium text-brand-100 pr-2">
                    {locationName}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setLocationName(''); setCoords(null); }} 
                    className="ml-auto text-brand-500 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                  >
                    <ArrowLeft size={16} className="rotate-45" /> {/* Use as X mark */}
                  </button>
                </div>
              )}

              {/* Uploaded Images Gallery */}
              {uploadedImageUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in">
                  {uploadedImageUrls.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-border-light/50 shadow-sm">
                      <img src={url} alt={`Preview ${idx+1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          type="button" 
                          onClick={() => setUploadedImageUrls(prev => prev.filter((_, i) => i !== idx))} 
                          className="bg-red-500 text-white p-2 rounded-xl transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Plus button to add more if under limit */}
                  {uploadedImageUrls.length < 4 && !isUploadingImage && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-border-light hover:border-brand-500/50 hover:bg-surface-hover/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-text-secondary hover:text-brand-500">
                       <ImageIcon size={24} />
                       <span className="text-xs font-medium">Tambah</span>
                       <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                  {isUploadingImage && (
                    <div className="aspect-square rounded-2xl border border-border-light bg-surface-subtle flex flex-col items-center justify-center gap-3">
                       <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                       <span className="text-xs text-text-secondary">Uploado...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Action Footer */}
          <div className="bg-surface-subtle/80 px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-border-light/50 gap-4">
            
            {/* Tools */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                type="button" 
                onClick={() => setIsLocationModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-surface-main hover:bg-surface-hover border border-border-light/50 rounded-xl transition-all font-medium text-sm text-text-primary group"
              >
                <MapPin size={18} className="text-[#f5533d] group-hover:scale-110 transition-transform" />
                Tandai Lokasi
              </button>
              
              {uploadedImageUrls.length === 0 && (
                <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-surface-main hover:bg-surface-hover border border-border-light/50 rounded-xl transition-all font-medium text-sm text-text-primary cursor-pointer group">
                  {isUploadingImage ? (
                    <div className="w-4 h-4 border-2 border-[#45bd62] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ImageIcon size={18} className="text-[#45bd62] group-hover:scale-110 transition-transform" />
                  )}
                  <span>Foto</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreatePost}
              disabled={(!content.trim() && uploadedImageUrls.length === 0 && routes.length === 0) || isUploadingImage || isSubmitting}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-3 ${
                (content.trim() || uploadedImageUrls.length > 0 || routes.length > 0) && !isUploadingImage && !isSubmitting
                  ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5'
                  : 'bg-surface-hover text-text-secondary/40 cursor-not-allowed border-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Terbitkan Sekarang
                  <Send size={18} className="ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        defaultLocation={coords}
        onSelect={(lat: number, lng: number, address: string) => {
          setCoords({ lat, lng });
          setLocationName(address);
        }}
      />
    </div>
  );
}
