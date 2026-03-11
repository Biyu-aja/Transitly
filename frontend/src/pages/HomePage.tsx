import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { postService } from '../lib/api';
import { MapPin, Image as ImageIcon, User as UserIcon } from 'lucide-react';
import { uploadImageToSupabase } from '../lib/supabase';
import type { Post } from '../types/post';
import { useUIStore } from '../store/uiStore';
import PostCard from '../components/PostCard';
import LocationPickerModal from '../components/LocationPickerModal';

export default function HomePage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery, setSearchQuery, feedRadius, feedCoords, setTrendingTags } = useUIStore();

  // New Post State
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('discussion');
  const [locationName, setLocationName] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Interaction State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [feedRadius, feedCoords]);

  useEffect(() => {
    const tagsMap = posts.reduce((acc, post) => {
      const tags = post.content.match(/#[a-zA-Z0-9_]+/g);
      if (tags) {
        tags.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>);

    setTrendingTags(
       Object.entries(tagsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    );
  }, [posts, setTrendingTags]);

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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && uploadedImageUrls.length === 0) return;

    // Automatically generate hashtag based on category
    const categoryTags: Record<string, string> = {
      'discussion': '#Diskusi',
      'alert': '#Peringatan',
      'question': '#TanyaRute',
      'tip': '#TipsCepat'
    };
    
    const autoTag = categoryTags[category];
    let finalContent = content.trim();
    
    if (autoTag && !finalContent.toLowerCase().includes(autoTag.toLowerCase())) {
      finalContent = finalContent ? `${finalContent}\n\n${autoTag}` : autoTag;
    }
    
    try {
      const newPost = await postService.createPost({
        content: finalContent || content,
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

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (post.user?.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (post.user?.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (post.locationName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const LightboxNode = selectedImage ? (
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
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  ) : null;

  return (
    <>
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
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-brand-100 transition-colors" onClick={() => setIsLocationModalOpen(true)}>
                  <MapPin size={12} fill="currentColor" className="text-brand-500 shrink-0" />
                  Di {locationName}
                  <button onClick={(e) => { e.stopPropagation(); setLocationName(''); setCoords(null); }} className="ml-1 text-text-secondary hover:text-red-500 rounded-full bg-white w-4 h-4 flex items-center justify-center transition-colors hover:bg-red-50" aria-label="Hapus lokasi">×</button>
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
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex items-center gap-2 hover:bg-surface-hover px-3 py-2 rounded-lg transition-colors font-semibold text-sm text-[#f5533d]"
                  title="Lampirkan lokasi Anda"
                >
                  <MapPin size={22} />
                  <span className="hidden sm:inline text-text-secondary font-semibold">Lokasi</span>
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
                onLocationClick={handleTagClick}
                onDelete={() => handleDeletePost(post.id)}
              />
            ))}
          </div>

      {LightboxNode}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        defaultLocation={coords}
        onSelect={(lat, lng, address) => {
          setCoords({ lat, lng });
          setLocationName(address);
        }}
      />
    </>
  );
}
