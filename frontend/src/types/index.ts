export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: 'question' | 'tip' | 'discussion' | 'alert';
  tags: string[];
  images?: string[];
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
  upvotes: number;
  downvotes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  comments?: Comment[];
  _count?: {
    comments: number;
  };
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  replies?: Comment[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  category: 'question' | 'tip' | 'discussion' | 'alert';
  tags: string[];
  images?: string[];
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
}
