import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Heart, MessageCircle, Share2, MapPin, Send, User as UserIcon } from 'lucide-react';
import type { Post } from '../types/post';
import type { User } from '../types';

interface PostCardProps {
  post: Post;
  user: User | null;
  isExpanded: boolean;
  activeDropdown: string | null;
  commentInput: string;
  onLike: () => void;
  onToggleComments: () => void;
  onCommentChange: (val: string) => void;
  onCommentSubmit: (e: React.FormEvent) => void;
  onToggleDropdown: () => void;
  onImageClick: (url: string) => void;
  onTagClick: (tag: string) => void;
  onDelete: () => void;
}

export default function PostCard({
  post,
  user,
  isExpanded,
  activeDropdown,
  commentInput,
  onLike,
  onToggleComments,
  onCommentChange,
  onCommentSubmit,
  onToggleDropdown,
  onImageClick,
  onTagClick,
  onDelete
}: PostCardProps) {

  // Function to render hashtags natively
  const renderTextWithHashtags = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span 
            key={i} 
            onClick={() => onTagClick(part)}
            className="text-brand-500 hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-surface-main/60 backdrop-blur-md rounded-3xl shadow-lg border border-surface-hover hover:border-brand-500/30 transition-all relative">
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
          <div className="relative">
            <div 
              onClick={onToggleDropdown}
              className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center cursor-pointer -mr-2 text-text-secondary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
            </div>

            {/* Dropdown Menu */}
            {activeDropdown === post.id && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={onToggleDropdown}
                />
                <div className="absolute right-0 top-10 w-48 bg-surface-main/90 backdrop-blur-md rounded-xl shadow-xl border border-surface-hover py-1.5 z-50 overflow-hidden">
                  <button 
                    onClick={() => { alert('Disimpan!'); onToggleDropdown(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors font-medium flex items-center gap-2"
                  >
                    <Heart size={16} /> Simpan Postingan
                  </button>
                  <button 
                    onClick={() => { alert('Postingan disembunyikan'); onToggleDropdown(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors font-medium flex items-center gap-2"
                  >
                    <span className="opacity-0 w-4"></span> Sembunyikan
                  </button>
                  {post.userId === user?.id && (
                    <button 
                      onClick={() => { onDelete(); onToggleDropdown(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors font-semibold flex items-center gap-2"
                    >
                      <span className="opacity-0 w-4"></span> Hapus Postingan
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="mt-1 mb-2 wrap-break-word whitespace-pre-wrap text-[15px] leading-[1.35] text-text-primary tracking-normal">
          {post.category !== 'discussion' && (
            <span className={`inline-block mr-2 mb-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm border ${
              post.category === 'alert' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
              post.category === 'question' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
              post.category === 'tip' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              'bg-surface-hover text-text-secondary border-border-light'
            }`}>
              {post.category === 'alert' ? 'Peringatan Macet' :
                post.category === 'question' ? 'Tanya' : 'Tips'}
            </span>
          )}
          {renderTextWithHashtags(post.content)}
        </div>

        {/* Masonry Images Feed */}
        {post.images && post.images.length > 0 && (
          <div className={`mt-3 mb-1 w-full gap-1 grid ${
            post.images.length === 1 ? 'grid-cols-1' : 
            post.images.length === 2 ? 'grid-cols-2' : 
            post.images.length === 3 ? 'grid-cols-2' : 
            'grid-cols-2'
          } rounded-2xl overflow-hidden border border-surface-hover bg-surface-hover`}>
            {post.images.map((imgUrl, idx) => (
              <div 
                key={idx} 
                className={`relative ${
                  (post.images || []).length === 3 && idx === 0 ? 'col-span-2 aspect-video'   
                : (post.images || []).length === 1 ? 'max-h-[600px] w-full' 
                : 'aspect-square'}`}
              >
                <img 
                  src={imgUrl} 
                  alt={`Post image ${idx+1}`} 
                  className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                  loading="lazy" 
                  onClick={() => onImageClick(imgUrl)}
                />
              </div>
            ))}
          </div>
        )}
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
          onClick={onLike}
          className={`flex-1 flex items-center justify-center gap-2 font-semibold text-[14px] py-2 rounded-full transition-all ${post.hasLiked ? 'text-brand-500 bg-brand-500/10' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
        >
          <Heart size={20} className={post.hasLiked ? '' : ''} fill={post.hasLiked ? 'currentColor' : 'none'} strokeWidth={post.hasLiked ? 0 : 2}/>
          <span>Suka</span>
        </button>
        <button 
          onClick={onToggleComments}
          className={`flex-1 flex items-center justify-center gap-2 font-semibold text-[14px] py-2 rounded-full transition-all ${isExpanded ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
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
      {isExpanded && (
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
                        {renderTextWithHashtags(comment.content)}
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

          {/* Comment Form Input */}
          <form onSubmit={onCommentSubmit} className="flex gap-2">
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
                placeholder="Beri komentar..."
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] min-w-0 placeholder:text-text-secondary"
                value={commentInput}
                onChange={(e) => onCommentChange(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!commentInput.trim()}
                className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ml-1 transition-colors ${commentInput.trim() ? 'text-brand-600 hover:bg-brand-50' : 'text-text-secondary/50 cursor-not-allowed'}`}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
