import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const routes = await prisma.route.findMany({
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
            },
        });

        return NextResponse.json(routes);
    } catch (error) {
        console.error('Error fetching routes:', error);
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
        const { name, description, startLat, startLng, endLat, endLng, transportModes, estimatedTime, estimatedCost, waypoints } = body;

        if (!name || startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined) {
            return NextResponse.json({ error: 'Name, start location, and end location are required' }, { status: 400 });
        }

        const newRoute = await prisma.route.create({
            data: {
                userId: user.userId,
                name,
                description,
                startLat: parseFloat(startLat),
                startLng: parseFloat(startLng),
                endLat: parseFloat(endLat),
                endLng: parseFloat(endLng),
                transportModes: Array.isArray(transportModes) ? transportModes : [],
                estimatedTime: estimatedTime ? parseInt(estimatedTime, 10) : null,
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
                waypoints: waypoints ? waypoints : [],
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
            }
        });

        return NextResponse.json(newRoute);
    } catch (error) {
        console.error('Error creating route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
