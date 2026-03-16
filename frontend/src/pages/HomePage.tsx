import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { postService } from '../lib/api';
import { MapPin, User as UserIcon } from 'lucide-react';
import type { Post } from '../types/post';
import { useUIStore } from '../store/uiStore';
import PostCard from '../components/PostCard';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery, setSearchQuery, feedRadius, feedCoords, setTrendingTags } = useUIStore();


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
      {/* Create Post Link Card */}
      <Link to="/create-post" className="block bg-surface-main/60 backdrop-blur-xl rounded-3xl border border-surface-hover hover:border-brand-500/50 transition-all p-5 mb-8 shadow-lg group cursor-pointer hover:shadow-xl transform hover:-translate-y-0.5">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-hover border border-border-light shrink-0 overflow-hidden flex items-center justify-center">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="text-text-secondary w-3/5 h-3/5" strokeWidth={2} />
            )}
          </div>
          <div className="flex-1 bg-surface-hover hover:bg-surface-subtle border border-transparent group-hover:border-brand-500/20 rounded-2xl px-5 py-3.5 transition-colors flex items-center text-text-secondary font-medium text-[15px]">
            Ada info transportasi apa hari ini, {user?.fullName || user?.username || 'Sobat Transitly'}?
          </div>
        </div>
      </Link>

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

    </>
  );
}
