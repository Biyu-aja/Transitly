import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const radius = searchParams.get('radius') || '10'; // Default 10km

        let locationFilter = {};

        if (lat && lng) {
            const latFloat = parseFloat(lat);
            const lngFloat = parseFloat(lng);
            const radiusKm = parseFloat(radius);

            // Rough approximation: 1 degree latitude = ~111km
            // 1 degree longitude = ~111km * cos(latitude)
            const latChange = radiusKm / 111;
            const lngChange = radiusKm / (111 * Math.cos(latFloat * (Math.PI / 180)));

            locationFilter = {
                locationLat: {
                    gte: latFloat - latChange,
                    lte: latFloat + latChange,
                },
                locationLng: {
                    gte: lngFloat - lngChange,
                    lte: lngFloat + lngChange,
                },
            };
        }

        const posts = await prisma.post.findMany({
            where: locationFilter,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: { comments: true }
                },
                ...(user ? {
                    votes: {
                        where: { userId: user.userId }
                    }
                } : {})
            },
        });

        const formattedPosts = posts.map((post: any) => {
            const { votes, ...rest } = post;
            return {
                ...rest,
                hasLiked: votes && votes.length > 0 ? true : false,
            };
        });

        return NextResponse.json(formattedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, content, category, locationLat, locationLng, locationName, images } = body;

        if (!title || !content || !category) {
            return NextResponse.json({ error: 'Title, content, and category are required' }, { status: 400 });
        }

        const newPost = await prisma.post.create({
            data: {
                userId: user.userId,
                title,
                content,
                category,
                locationLat: locationLat ? parseFloat(locationLat) : null,
                locationLng: locationLng ? parseFloat(locationLng) : null,
                locationName,
                images: images || [],
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: { comments: true }
                }
            }
        });

        return NextResponse.json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
