export interface Comment {
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

export interface Post {
    id: string;
    userId: string;
    title: string;
    content: string;
    category: string;
    locationName: string | null;
    locationLat: number | null;
    locationLng: number | null;
    createdAt: string;
    images?: string[];
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
