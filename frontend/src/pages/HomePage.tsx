import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

import { postService } from '../lib/api';
import { MapPin, MessageCircle, Heart, Share2, Image as ImageIcon, Navigation, Send, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  hasLiked?: boolean;
  upvotes: number;
  commentsData?: Comment[];
  isCommentsLoading?: boolean;
  _count: {
    comments: number;
  };
}

export default function HomePage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // New Post State
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('discussion');
  const [locationName, setLocationName] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  // Feed Filter State
  const [feedRadius, setFeedRadius] = useState<number | null>(null); // null means all locations
  const [feedCoords, setFeedCoords] = useState<{lat: number, lng: number} | null>(null);

  // Interaction State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

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
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationName('Lokasi Saat Ini');
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location', error);
          alert('Gagal mendapatkan lokasi. Pastikan izinkan akses lokasi.');
          setIsGettingLocation(false);
        }
      );
    } else {
      alert('Geolocation tidak didukung di browser ini.');
      setIsGettingLocation(false);
    }
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
    if (!content.trim()) return;
    
    try {
      const newPost = await postService.createPost({
        title: title || 'Update', // Default title if empty
        content,
        category,
        locationName,
        locationLat: coords?.lat,
        locationLng: coords?.lng,
      });
      newPost.upvotes = 0;
      newPost.hasLiked = false;
      setPosts([newPost, ...posts]);
      setContent('');
      setTitle('');
      setLocationName('');
      setCoords(null);
    } catch (error) {
      console.error('Failed to create post', error);
      alert('Gagal membuat postingan');
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

            <div className="flex items-center justify-between px-4 py-3 border-t border-border-light mx-4">
              <div className="flex gap-1.5">
                <button 
                  type="button" 
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="flex items-center gap-2 hover:bg-surface-hover px-3 py-2 rounded-lg transition-colors font-semibold text-sm text-[#f5533d] disabled:opacity-50"
                >
                  <MapPin size={22} className={isGettingLocation ? 'animate-bounce' : ''}  />
                  <span className="hidden sm:inline text-text-secondary font-semibold">{isGettingLocation ? 'Mencari...' : 'Lokasi'}</span>
                </button>
                <button type="button" className="flex items-center gap-2 hover:bg-surface-hover px-3 py-2 rounded-lg transition-colors font-semibold text-sm text-[#45bd62]">
                  <ImageIcon size={22} />
                  <span className="hidden sm:inline text-text-secondary font-semibold">Foto/Video</span>
                </button>
                
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
                disabled={!content.trim()} 
                className={`rounded-lg px-6 py-2 font-semibold text-[15px] transition-all ${content.trim() ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm' : 'bg-surface-hover text-text-secondary/50 cursor-not-allowed'}`}
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
          {!loading && posts.length === 0 && (
            <div className="bg-surface-main rounded-xl p-12 text-center border border-border-light shadow-sm">
              <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={36} className="text-text-secondary opcaity-50" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Tidak Ada Postingan</h3>
              <p className="text-text-secondary">
                {feedRadius ? "Tidak ada konten yang relevan di sekitar Anda." : "Jadilah yang pertama untuk berbagi informasi di Transitly!"}
              </p>
            </div>
          )}

          {/* Real Posts Feed */}
          <div className="space-y-6 pb-12">
            {posts.map(post => (
              <div key={post.id} className="bg-surface-main/60 backdrop-blur-md rounded-3xl shadow-lg border border-surface-hover hover:border-brand-500/30 transition-all relative overflow-hidden">
                <div className="p-5">
                  {/* Post Author / Header */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-surface-hover border border-border-light overflow-hidden shrink-0 cursor-pointer">
                        {post.user?.avatarUrl ? (
                           <img src={post.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                           <UserIcon className="text-text-secondary w-3/5 h-3/5" strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex flex-col -mt-0.5">
                        <div className="flex items-center flex-wrap">
                          <h4 className="font-semibold text-text-primary text-[15px] hover:underline cursor-pointer tracking-tight">
                            {post.user?.fullName || post.user?.username}
                          </h4>
                        </div>
                        <div className="flex items-center text-[13px] text-text-secondary gap-1">
                          <span className="hover:underline cursor-pointer">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: id })}
                          </span>
                          {post.locationName && (
                            <>
                              <span>·</span>
                              <div className="flex items-center text-text-secondary hover:text-brand-600 cursor-pointer hover:underline mb-0.5">
                                <MapPin size={10} className="mr-0.5 mt-0.5" fill="currentColor" />
                                <span>{post.locationName}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta Dot icon representing menu */}
                    <div className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center cursor-pointer -mr-2 text-text-secondary transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="mt-1 mb-2 wrap-break-word whitespace-pre-wrap text-[15px] leading-[1.35] text-text-primary tracking-normal">
                    {post.category !== 'discussion' && (
                      <span className={`inline-block mr-2 mb-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm ${
                        post.category === 'alert' ? 'bg-red-100 text-red-700' : 
                        post.category === 'question' ? 'bg-orange-100 text-orange-700' :
                        post.category === 'tip' ? 'bg-green-100 text-green-700' :
                        'bg-surface-hover text-text-secondary'
                      }`}>
                        {post.category === 'alert' ? 'Peringatan Macet' :
                         post.category === 'question' ? 'Tanya' : 'Tips'}
                       </span>
                    )}
                    {post.content}
                  </div>
                </div>

                {/* Engagement Numbers */}
                {(post.upvotes > 0 || (post._count?.comments > 0)) && (
                  <div className="px-4 py-2.5 flex items-center justify-between text-text-secondary text-[13px] border-b border-border-light mx-4">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
                      {post.upvotes > 0 && (
                        <>
                          <div className="w-4 h-4 bg-brand-600 rounded-full flex items-center justify-center p-[3px]">
                           <Heart fill="white" stroke="white" strokeWidth={1}/>
                          </div>
                          <span>{post.upvotes}</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-3 cursor-pointer">
                      {post._count?.comments > 0 && <span className="hover:underline">{post._count.comments} komentar</span>}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="px-5 pb-4 pt-1 flex items-center justify-between gap-3">
                  <button 
                    onClick={() => handleLikePost(post.id)}
                    className={`flex-1 flex items-center justify-center gap-2 font-semibold text-[14px] py-2 rounded-full transition-all ${post.hasLiked ? 'text-brand-500 bg-brand-500/10' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                  >
                    <Heart size={20} className={post.hasLiked ? '' : ''} fill={post.hasLiked ? 'currentColor' : 'none'} strokeWidth={post.hasLiked ? 0 : 2}/>
                    <span>Suka</span>
                  </button>
                  <button 
                    onClick={() => handleToggleComments(post.id)}
                    className={`flex-1 flex items-center justify-center gap-2 font-semibold text-[14px] py-2 rounded-full transition-all ${expandedComments[post.id] ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                  >
                    <MessageCircle size={20} strokeWidth={2} />
                    <span>Komentar</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 font-semibold text-[14px] py-2 rounded-full transition-all text-text-secondary hover:bg-surface-hover hover:text-text-primary">
                    <Share2 size={20} strokeWidth={2} />
                    <span>Bagikan</span>
                  </button>
                </div>
                
                {/* Expanded Comments Panel Wrapper */}
                {expandedComments[post.id] && (
                  <div className="px-5 pb-5 pt-4 bg-surface-subtle/40 border-t border-surface-hover">
                    
                    {/* View More Text */}
                    {post.commentsData && post.commentsData.length > 3 && (
                      <div className="font-semibold text-[14px] text-text-secondary hover:underline cursor-pointer mb-2">Lihat komentar sebelumnya</div>
                    )}

                    {/* Render existing comments properly sorted */}
                    {post.isCommentsLoading ? (
                      <div className="flex justify-center py-2 mb-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                      </div>
                    ) : post.commentsData && post.commentsData.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {post.commentsData.map(comment => (
                          <div key={comment.id} className="flex gap-2.5 items-start group">
                            <div className="w-8 h-8 rounded-full border border-border-light overflow-hidden shrink-0 mt-0.5 cursor-pointer hover:opacity-90">
                               {comment.user?.avatarUrl ? (
                                  <img src={comment.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                               ) : (
                                  <div className="w-full h-full bg-surface-hover flex items-center justify-center text-text-secondary">
                                     <UserIcon className="w-3/5 h-3/5" strokeWidth={2} />
                                  </div>
                               )}
                            </div>
                            <div className="flex flex-col">
                               <div className="bg-surface-hover rounded-2xl rounded-tl-sm px-3.5 pt-2 pb-2.5 inline-block">
                                  <span className="font-semibold text-text-primary text-[13px] block mb-0 cursor-pointer hover:underline tracking-tight">
                                     {comment.user?.fullName || comment.user?.username}
                                  </span>
                                  <span className="text-text-primary text-[15px] wrap-break-word">
                                     {comment.content}
                                  </span>
                               </div>
                               <div className="flex items-center text-[12px] font-semibold text-text-secondary mt-1 ml-2 gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="hover:underline cursor-pointer text-text-primary">Suka</span>
                                  <span className="hover:underline cursor-pointer text-text-primary">Balas</span>
                                  <span className="font-normal opacity-80">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: id })}</span>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fixed new comment input component - matching FB format */}
                    <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full border border-border-light overflow-hidden shrink-0">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-surface-hover flex items-center justify-center text-text-secondary">
                            <UserIcon className="w-3/5 h-3/5" strokeWidth={2} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex px-3.5 py-2 bg-surface-hover rounded-2xl items-center">
                        <input
                          type="text"
                          placeholder="Beri komentar sebagai pencinta transportasi umum..."
                          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] min-w-0 placeholder:text-text-secondary"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        />
                        <button 
                          type="submit" 
                          disabled={!commentInputs[post.id]?.trim()}
                          className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ml-1 transition-colors ${commentInputs[post.id]?.trim() ? 'text-brand-600 hover:bg-brand-50' : 'text-text-secondary/50 cursor-not-allowed'}`}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </form>

                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="hidden md:block w-[280px] xl:w-[350px] pr-2 xl:pr-4 pl-4 shrink-0">
          <div className="sticky top-[80px]">
            <h3 className="font-semibold text-text-secondary mb-3 px-2 text-[17px]">Bersponsor</h3>
            <div className="mb-6 space-y-4 px-2">
               {/* Dummy Sponsors matching Meta format */}
               <div className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-28 h-28 bg-surface-hover rounded-xl overflow-hidden shadow-sm shrink-0 flex items-center justify-center group-hover:opacity-95 transition-opacity">
                     <svg className="w-8 h-8 text-text-secondary opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zm0 16H5z"></path></svg>
                  </div>
                  <div>
                     <h4 className="font-semibold text-text-primary text-[15px] group-hover:underline">Beli Tiket KAI Tanpa Antre</h4>
                     <p className="text-[13px] text-text-secondary">tiket.indonesia.go</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-28 h-28 bg-surface-hover rounded-xl overflow-hidden shadow-sm shrink-0 flex items-center justify-center group-hover:opacity-95 transition-opacity">
                     <svg className="w-8 h-8 text-text-secondary opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zm0 16H5z"></path></svg>
                  </div>
                  <div>
                     <h4 className="font-semibold text-text-primary text-[15px] group-hover:underline">Promo TransJakarta Akhir Tahun</h4>
                     <p className="text-[13px] text-text-secondary">transjakarta.co.id</p>
                  </div>
               </div>
            </div>

            <div className="h-[1px] bg-border-light mx-2 mb-4"></div>

            <h3 className="font-semibold text-text-secondary mb-3 px-2 text-[17px]">Topik Tren Perhubungan</h3>
            <div className="space-y-1">
              <div className="hover:bg-surface-hover p-2.5 rounded-xl cursor-pointer transition-colors relative">
                <p className="text-[13px] text-text-secondary mb-1">Jakarta Selatan • 2.5k postingan</p>
                <h4 className="font-semibold text-text-primary text-[15px]">#MacetSudirman</h4>
              </div>
              <div className="hover:bg-surface-hover p-2.5 rounded-xl cursor-pointer transition-colors relative">
                <p className="text-[13px] text-text-secondary mb-1">KRL Commuter • 1.2k postingan</p>
                <h4 className="font-semibold text-text-primary text-[15px]">Cikarang Line Gangguan</h4>
              </div>
              <div className="hover:bg-surface-hover p-2.5 rounded-xl cursor-pointer transition-colors relative">
                <p className="text-[13px] text-text-secondary mb-1">Tips Transportasi • 800 postingan</p>
                <h4 className="font-semibold text-text-primary text-[15px]">Lebih Cepat Lewat MRT</h4>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
