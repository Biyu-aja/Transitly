import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { postService } from '../lib/api';
import { MapPin, MessageCircle, Heart, Share2, Image as ImageIcon, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

import { Send } from 'lucide-react';

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
          // Attempt reverse geocoding to get a real readable name would go here.
          // For now, let's just use a placeholder
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
      // Set default interactions fields for newly created post right away
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
    // Optimistic update
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
      // Ensure sync with server state
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

    // Fetch comments if expanding and not already loaded data
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="w-full px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                T
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-indigo-600 hidden sm:block">Transitly</h1>
            </div>
            
            {/* simple search simulation */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="Cari lokasi, halte, atau stasiun..." 
                  className="w-full bg-gray-100 border-none rounded-full py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium hidden sm:block">{user?.fullName || user?.username}</span>
              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold uppercase">
                    {(user?.fullName || user?.username || '?')[0]}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-full">
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex justify-between pt-6">
        
        {/* Left Sidebar (Desktop) */}
        <div className="hidden lg:block w-[280px] xl:w-[340px] pl-2 xl:pl-4 pr-4 shrink-0">
          <div className="sticky top-20">
            <h3 className="font-semibold text-gray-500 mb-2 px-3 text-[16px]">Eksplorasi</h3>
            <ul className="space-y-1">
              <li>
                <button 
                  onClick={() => setFeedRadius(null)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${feedRadius === null ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-200 font-medium'}`}
                >
                  <div className="bg-blue-500 p-2 rounded-full text-white"><Navigation size={18} /></div>
                  Semua Lokasi
                </button>
              </li>
              <li>
                <button 
                  onClick={handleUseCurrentLocationForFeed}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${feedRadius !== null ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-200 font-medium'}`}
                >
                  <div className="bg-green-500 p-2 rounded-full text-white"><MapPin size={18} /></div>
                  Di Sekitar Saya {feedRadius && `(${feedRadius}km)`}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Feed Center */}
        <div className="flex-1 max-w-[680px] w-full mx-auto px-2 sm:px-0">
          
          {/* Create Post Form */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold uppercase">
                    {(user?.fullName || user?.username || '?')[0]}
                  </div>
                )}
              </div>
              <textarea 
                placeholder={`Ada info transportasi apa hari ini, ${user?.username}?`}
                className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white resize-none border-none rounded-xl p-3 focus:ring-1 focus:ring-blue-500 transition-colors"
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* Location display if selected */}
            {locationName && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <MapPin size={14} className="text-blue-500" />
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Lokasi: {locationName}
                </span>
                <button onClick={() => { setLocationName(''); setCoords(null); }} className="text-xs text-gray-400 hover:text-red-500">
                  Hapus
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <MapPin size={20} className={isGettingLocation ? 'animate-bounce text-blue-500' : 'text-rose-500'} />
                  <span className="hidden sm:inline">{isGettingLocation ? 'Mencari...' : 'Lokasi'}</span>
                </button>
                <button type="button" className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                  <ImageIcon size={20} className="text-green-500" />
                  <span className="hidden sm:inline">Foto</span>
                </button>
                <select 
                  className="bg-transparent text-sm text-gray-600 border-none cursor-pointer hover:bg-gray-100 px-2 rounded-lg appearance-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="discussion">Diskusi</option>
                  <option value="alert">Alert/Macet</option>
                  <option value="question">Tanya Rute</option>
                  <option value="tip">Tips</option>
                </select>
              </div>
              <Button 
                onClick={handleCreatePost} 
                disabled={!content.trim()} 
                className="rounded-full px-5 py-1.5 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              >
                Posting
              </Button>
            </div>
          </div>

          {/* Feed Filter Mobile */}
          <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
            <button 
              onClick={() => setFeedRadius(null)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${feedRadius === null ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            >
              Semua Lokasi
            </button>
            <button 
               onClick={handleUseCurrentLocationForFeed}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${feedRadius !== null ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            >
              Di Sekitar Saya
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Belum ada postingan</h3>
              <p className="text-gray-500">
                {feedRadius ? "Tidak ada postingan di sekitar lokasi Anda saat ini." : "Jadilah yang pertama membuat postingan di Transitly!"}
              </p>
            </div>
          )}

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                        {post.user?.avatarUrl ? (
                           <img src={post.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold uppercase">
                            {(post.user?.fullName || post.user?.username || '?')[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-gray-900 text-[15px] hover:underline cursor-pointer">
                            {post.user?.fullName || post.user?.username}
                          </h4>
                          <span className="text-gray-400 text-xs text-center">•</span>
                          <span className="text-xs text-gray-500 hover:underline cursor-pointer">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: id })}
                          </span>
                        </div>
                        {post.locationName && (
                          <div className="flex items-center text-xs text-blue-600 mt-0.5">
                            <MapPin size={12} className="mr-1" />
                            <span className="hover:underline cursor-pointer">{post.locationName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Category badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      post.category === 'alert' ? 'bg-red-100 text-red-700' : 
                      post.category === 'question' ? 'bg-orange-100 text-orange-700' :
                      post.category === 'tip' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {post.category === 'alert' ? 'Bencana/Macet' :
                       post.category === 'question' ? 'Tanya' :
                       post.category === 'tip' ? 'Tips' : 'Diskusi'}
                    </span>
                  </div>

                  {/* Post Body */}
                  <div className="mt-2 text-gray-800 text-[15px] leading-relaxed wrap-break-word whitespace-pre-wrap">
                    {post.content}
                  </div>
                </div>

                {/* Post Metrics / Actions Divider */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-gray-500">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1.5 transition-colors text-sm font-medium p-1 rounded hover:bg-blue-50 ${post.hasLiked ? 'text-blue-600' : 'hover:text-blue-600'}`}
                    >
                      <Heart size={18} fill={post.hasLiked ? "currentColor" : "none"} />
                      <span>Suka {post.upvotes > 0 ? `(${post.upvotes})` : ''}</span>
                    </button>
                    <button 
                      onClick={() => handleToggleComments(post.id)}
                      className={`flex items-center gap-1.5 hover:text-blue-600 transition-colors text-sm font-medium p-1 rounded hover:bg-blue-50 ${expandedComments[post.id] ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      <MessageCircle size={18} />
                      <span>{post._count?.comments || 0} Komentar</span>
                    </button>
                  </div>
                  <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors text-sm font-medium p-1 rounded hover:bg-blue-50">
                    <Share2 size={18} />
                    <span>Bagikan</span>
                  </button>
                </div>
                
                {/* Comments Section */}
                {expandedComments[post.id] && (
                  <div className="px-4 py-3 bg-white border-t border-gray-100">
                    {/* Comment Input */}
                    <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="flex gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0 mt-0.5">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold uppercase text-xs">
                            {(user?.fullName || user?.username || '?')[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex px-3 py-1.5 bg-gray-100 rounded-2xl items-center focus-within:ring-1 focus-within:ring-blue-500">
                        <input
                          type="text"
                          placeholder="Tulis komentar publik..."
                          className="flex-1 bg-transparent border-none focus:outline-none text-sm min-w-0"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        />
                        <button 
                          type="submit" 
                          disabled={!commentInputs[post.id]?.trim()}
                          className="text-blue-600 disabled:text-gray-400 p-1 hover:bg-gray-200 rounded-full transition-colors shrink-0 ml-1"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </form>

                    {/* Comments List */}
                    {post.isCommentsLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    ) : post.commentsData && post.commentsData.length > 0 ? (
                      <div className="space-y-3 pl-2">
                        {post.commentsData.map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                               {comment.user?.avatarUrl ? (
                                  <img src={comment.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                               ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold uppercase text-xs">
                                     {(comment.user?.fullName || comment.user?.username || '?')[0]}
                                  </div>
                               )}
                            </div>
                            <div>
                               <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block">
                                  <span className="font-semibold text-gray-900 text-xs block mb-0.5 hover:underline cursor-pointer">
                                     {comment.user?.fullName || comment.user?.username}
                                  </span>
                                  <span className="text-gray-800 text-sm wrap-break-word">
                                     {comment.content}
                                  </span>
                               </div>
                               <div className="text-[11px] text-gray-500 mt-1 ml-2">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: id })}
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-sm text-gray-500 py-3">Belum ada komentar</div>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="hidden md:block w-[280px] xl:w-[340px] pr-2 xl:pr-4 pl-4 shrink-0">
          <div className="sticky top-20">
            <h3 className="font-semibold text-gray-500 mb-3 px-2 text-[16px]">Sedang Tren di Sekitarmu</h3>
            <div className="space-y-1">
              <div className="hover:bg-gray-200 p-2 rounded-xl cursor-pointer transition-colors">
                <p className="text-xs text-gray-500 mb-1">Jakarta Selatan • 2.5k postingan</p>
                <h4 className="font-medium text-gray-900 text-[15px]">#MacetSudirman</h4>
              </div>
              <div className="hover:bg-gray-200 p-2 rounded-xl cursor-pointer transition-colors">
                <p className="text-xs text-gray-500 mb-1">KRL Commuter • 1.2k postingan</p>
                <h4 className="font-medium text-gray-900 text-[15px]">Cikarang Line Gangguan</h4>
              </div>
              <div className="hover:bg-gray-200 p-2 rounded-xl cursor-pointer transition-colors">
                <p className="text-xs text-gray-500 mb-1">Tips Transportasi • 800 postingan</p>
                <h4 className="font-medium text-gray-900 text-[15px]">Lebih Cepat Lewat MRT</h4>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 text-[15px] font-semibold rounded-lg bg-gray-200 border-none text-gray-800 hover:bg-gray-300">
              Lihat Selengkapnya
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}
