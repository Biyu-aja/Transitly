import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

import { postService } from '../lib/api';
import { MapPin, Image as ImageIcon, Navigation, User as UserIcon } from 'lucide-react';
import { uploadImageToSupabase } from '../lib/supabase';
import type { Post } from '../types/post';
import PostCard from '../components/PostCard';
import TrendingSidebar from '../components/TrendingSidebar';

export default function HomePage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Post State
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('discussion');
  const [locationName, setLocationName] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Feed Filter State
  const [feedRadius, setFeedRadius] = useState<number | null>(null); // null means all locations
  const [feedCoords, setFeedCoords] = useState<{lat: number, lng: number} | null>(null);

  // Interaction State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [feedRadius, feedCoords]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = feedRadius && feedCoords 
        ? { lat: feedCoords.lat, lng: feedCoords.lng, radius: feedRadius } 
        : undefined;
      const data = await postService.getPosts(params);
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!('geolocation' in navigator)) {
      alert('Geolocation tidak didukung di browser ini.');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          // Reverse Geocoding via OpenStreetMap/Nominatim Public API
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();
          
          if (data && data.address) {
            // Extracts best readable location name (Station/Road -> Neighborhood -> City)
            const placeName = data.address.railway || data.address.station || data.address.road || data.address.neighbourhood || data.address.suburb || data.address.city;
            setLocationName(placeName ? `${placeName}, ${data.address.city || data.address.state}` : 'Lokasi Anda');
          } else {
            setLocationName('Titik GPS Anda Set');
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          setLocationName('Titik Koordinat Diset');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location', error);
        setIsGettingLocation(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Akses lokasi ditolak. Silakan izinkan akses lokasi dari pengaturan browser Anda (ikon GEMBOK di address bar kiri atas) untuk menggunakan fitur ini.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Informasi lokasi tidak tersedia saat ini. Pastikan GPS/Internet Anda menyala.');
            break;
          case error.TIMEOUT:
            alert('Permintaan lokasi terlalu lama (timeout). Silakan coba lagi.');
            break;
          default:
            alert('Terjadi kesalahan yang tidak diketahui saat mengambil lokasi.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleUseCurrentLocationForFeed = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFeedCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setFeedRadius(10); // 10km radius by default
        },
        (error) => {
          console.error(error);
          alert('Gagal mendapatkan lokasi untuk filter feed.');
        }
      );
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && uploadedImageUrls.length === 0) return;
    
    try {
      const newPost = await postService.createPost({
        content,
        title: title || 'Post Baru',
        category,
        locationLat: coords?.lat,
        locationLng: coords?.lng,
        locationName,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : []
      });
      newPost.upvotes = 0;
      newPost.hasLiked = false;
      setPosts([newPost, ...posts]);
      setContent('');
      setTitle('');
      setCategory('discussion');
      setLocationName('');
      setCoords(null);
      setUploadedImageUrls([]);
    } catch (error) {
      console.error('Failed to create post', error);
      alert('Gagal membuat postingan');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    // Check limit
    if (uploadedImageUrls.length + files.length > 4) {
      alert('Maksimal hanya bisa mengunggah 4 gambar dalam satu post.');
      return;
    }

    // Size limit check per file
    const oversizedFile = files.find(f => f.size > 5 * 1024 * 1024);
    if (oversizedFile) {
      alert(`File "${oversizedFile.name}" terlalu besar! Maksimal 5MB per gambar.`);
      return;
    }

    try {
      setIsUploadingImage(true);
      
      const newUrls = await Promise.all(
        files.map(file => uploadImageToSupabase(file))
      );
      
      setUploadedImageUrls(prev => [...prev, ...newUrls]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Gagal mengunggah gambar. Pastikan API key Supabase Anda terseting baik di .env.local');
    } finally {
      setIsUploadingImage(false);
      // Reset the file input so the same files can trigger onChange again if needed
      if (e.target) e.target.value = '';
    }
  };

  const handleLikePost = async (postId: string) => {
    setPosts(currentPosts => currentPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          hasLiked: !post.hasLiked,
          upvotes: post.hasLiked ? Math.max(0, post.upvotes - 1) : post.upvotes + 1
        };
      }
      return post;
    }));

    try {
      const res = await postService.toggleLike(postId);
      setPosts(currentPosts => currentPosts.map(post => {
        if (post.id === postId) {
          return { ...post, upvotes: res.upvotes, hasLiked: res.action === 'liked' };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like', error);
      alert('Gagal menyukai postingan');
    }
  };

  const handleToggleComments = async (postId: string) => {
    const isExpanded = expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded) {
      const post = posts.find(p => p.id === postId);
      if (!post?.commentsData) {
        setPosts(currentPosts => currentPosts.map(p => p.id === postId ? { ...p, isCommentsLoading: true } : p));
        try {
          const fetchedComments = await postService.getComments(postId);
          setPosts(currentPosts => currentPosts.map(p => 
            p.id === postId ? { ...p, commentsData: fetchedComments, isCommentsLoading: false } : p
          ));
        } catch (error) {
          console.error('Error fetching comments', error);
          setPosts(currentPosts => currentPosts.map(p => p.id === postId ? { ...p, isCommentsLoading: false } : p));
        }
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const commentText = commentInputs[postId] || '';
    if (!commentText.trim()) return;

    try {
      const newComment = await postService.addComment(postId, commentText);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      
      setPosts(currentPosts => currentPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            commentsData: [...(p.commentsData || []), newComment],
            _count: { ...p._count, comments: (p._count?.comments || 0) + 1 }
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('Error adding comment', error);
      alert('Gagal menambahkan komentar');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus postingan ini?")) return;

    try {
      await postService.deletePost(postId);
      setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
      alert("Postingan berhasil dihapus");
    } catch (error) {
      console.error('Error deleting post', error);
      alert('Gagal menghapus postingan');
    }
  };

  const trendingTags = posts.reduce((acc, post) => {
    const tags = post.content.match(/#[a-zA-Z0-9_]+/g);
    if (tags) {
      tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(trendingTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (post.user?.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (post.user?.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="Cari lokasi, halte, stasiun, atau grup..." 
              className="w-full bg-surface-hover border-none rounded-full py-2.5 pl-10 pr-4 text-sm font-normal text-text-primary focus:ring-2 focus:ring-brand-500 focus:bg-surface-main transition-colors outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            
            <Link to="/" className="flex items-center gap-3 px-3 py-3 rounded-lg bg-surface-hover cursor-pointer transition-colors text-brand-600 mb-1">
              <div className="bg-brand-500 border border-border-light w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm">
                <Navigation size={18} fill="none" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-[15px]">Linimasa Utama</span>
            </Link>
             
            <Link to="/routes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors text-text-primary mb-4">
              <div className="bg-surface-main w-9 h-9 rounded-full flex items-center justify-center shadow-sm border border-border-light text-text-secondary">
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
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${feedRadius !== null ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
                >
                  <div className="bg-green-500 w-9 h-9 rounded-full flex items-center justify-center text-white"><MapPin size={20} fill="currentColor" /></div>
                  <span className="font-semibold text-[15px]">Di Sekitar Saya {feedRadius && `(${feedRadius}km)`}</span>
                </button>
              </li>
            </ul>
             
             <div className="mt-8 px-3 text-xs text-text-secondary opacity-70">
                Privasi · Ketentuan · Iklan · Cookie · Lebih Lanjut © 2026 Transitly Inc.
             </div>
          </div>
        </div>

        {/* Central Feed Column */}
        <div className="flex-1 max-w-[680px] w-full mx-auto px-2 sm:px-0">
          
          {/* Create Post Card */}
          <div className="bg-surface-main/60 backdrop-blur-xl rounded-3xl border border-surface-hover hover:border-brand-500/30 transition-all p-5 mb-8 shadow-lg">
            <div className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-surface-hover border border-border-light shrink-0 overflow-hidden flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="text-text-secondary w-3/5 h-3/5" strokeWidth={2} />
                )}
              </div>
              <textarea 
                placeholder={`Ada info transportasi apa hari ini, ${user?.fullName || user?.username || 'Sobat Transitly'}?`}
                className="w-full bg-surface-hover hover:bg-surface-subtle border-none resize-none rounded-2xl px-4 py-3 focus:ring-0 outline-none placeholder:text-text-secondary font-medium transition-colors cursor-text"
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* Location display chip */}
            {locationName && (
              <div className="flex items-center gap-2 mb-2 px-4 ml-12">
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <MapPin size={12} fill="currentColor" className="text-brand-500" />
                  Di {locationName}
                  <button onClick={() => { setLocationName(''); setCoords(null); }} className="ml-1 text-text-secondary hover:text-red-500 rounded-full bg-white w-4 h-4 flex items-center justify-center" aria-label="Hapus lokasi">×</button>
                </span>
              </div>
            )}

            {uploadedImageUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2 mt-2 ml-12">
                  {uploadedImageUrls.map((url, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img src={url} alt={`Preview ${idx+1}`} className="h-24 w-auto rounded-lg object-cover border border-surface-hover shadow-sm" />
                      <button 
                         type="button" 
                         onClick={() => setUploadedImageUrls(prev => prev.filter((_, i) => i !== idx))} 
                         className="absolute -top-2 -right-2 bg-surface-main border border-border-light rounded-full p-1 shadow-md hover:bg-surface-hover transition-colors text-text-secondary z-10"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

            <div className="flex items-center justify-between px-4 py-3 border-t border-border-light mx-4">
              <div className="flex gap-1.5">
                <button 
                  type="button" 
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="flex items-center gap-2 hover:bg-surface-hover px-3 py-2 rounded-lg transition-colors font-semibold text-sm text-[#f5533d] disabled:opacity-50"
                  title="Lampirkan lokasi Anda"
                >
                  <MapPin size={22} className={isGettingLocation ? 'animate-bounce' : ''}  />
                  <span className="hidden sm:inline text-text-secondary font-semibold">{isGettingLocation ? 'Mencari...' : 'Lokasi'}</span>
                </button>
                <label className="flex items-center gap-2 hover:bg-surface-hover px-3 py-2 rounded-lg transition-colors font-semibold text-sm text-[#45bd62] cursor-pointer" title="Unggah dari perangkat">
                  {isUploadingImage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#45bd62]"></div>
                  ) : (
                    <ImageIcon size={22} />
                  )}
                  <span className="hidden sm:inline text-text-secondary font-semibold">{isUploadingImage ? 'Mengunggah...' : 'Foto/Video'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                </label>
                
                {/* Clean Custom Select instead of border-outline */}
                <div className="relative flex items-center">
                  <select 
                    className="appearance-none bg-surface-hover border-none font-semibold text-sm text-text-secondary outline-none px-4 py-2 rounded-lg cursor-pointer focus:ring-0"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="discussion">Diskusi</option>
                    <option value="alert">Alert/Peringatan</option>
                    <option value="question">Tanya Rute</option>
                    <option value="tip">Tips Cepat</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleCreatePost} 
                disabled={(!content.trim() && uploadedImageUrls.length === 0) || isUploadingImage} 
                className={`rounded-lg px-6 py-2 font-semibold text-[15px] transition-all ml-auto block ${(content.trim() || uploadedImageUrls.length > 0) && !isUploadingImage ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm' : 'bg-surface-hover text-text-secondary/50 cursor-not-allowed'}`}
              >
                Posting
              </button>
            </div>
          </div>

          {/* Loading state indicator */}
          {loading && (
            <div className="flex justify-center p-8 bg-surface-main rounded-xl border border-border-light mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          )}

          {/* Empty state component */}
          {!loading && filteredPosts.length === 0 && (
            <div className="bg-surface-main rounded-xl p-12 text-center border border-border-light shadow-sm">
              <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={36} className="text-text-secondary opcaity-50" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Tidak Ada Postingan</h3>
              <p className="text-text-secondary">
                {searchQuery ? `Pencarian "${searchQuery}" tidak membuahkan hasil.` : feedRadius ? "Tidak ada konten yang relevan di sekitar Anda." : "Jadilah yang pertama untuk berbagi informasi di Transitly!"}
              </p>
            </div>
          )}

          {/* Real Posts Feed */}
          <div className="space-y-6 pb-12">
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                isExpanded={!!expandedComments[post.id]}
                activeDropdown={activeDropdown}
                commentInput={commentInputs[post.id] || ''}
                onLike={() => handleLikePost(post.id)}
                onToggleComments={() => handleToggleComments(post.id)}
                onCommentChange={(val) => setCommentInputs(prev => ({ ...prev, [post.id]: val }))}
                onCommentSubmit={(e) => handleCommentSubmit(e, post.id)}
                onToggleDropdown={() => setActiveDropdown(activeDropdown === post.id ? null : post.id)}
                onImageClick={setSelectedImage}
                onTagClick={handleTagClick}
                onDelete={() => handleDeletePost(post.id)}
              />
            ))}
          </div>

        </div>

        {/* Right Sidebar */}
        <TrendingSidebar sortedTags={sortedTags} onTagClick={handleTagClick} />

      </main>

      {/* Fullscreen Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <button 
             className="absolute md:top-6 md:right-8 top-4 right-4 bg-black/50 text-white rounded-full p-2.5 hover:bg-black/70 transition-colors"
             onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <img 
            src={selectedImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-full object-contain cursor-default select-none shadow-2xl rounded-sm"
            onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing modal
          />
        </div>
      )}
    </div>
  );
}
