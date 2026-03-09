import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Handle both synchronously and asynchronously awaited params for different Next versions
        const resolvedParams = await params;
        const postId = resolvedParams.id;

        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_postId: {
                    userId: user.userId,
                    postId: postId
                }
            }
        });

        let action = 'unliked';

        if (existingVote) {
            await prisma.vote.delete({
                where: { id: existingVote.id }
            });

            await prisma.post.update({
                where: { id: postId },
                data: { upvotes: { decrement: 1 } }
            });
        } else {
            await prisma.vote.create({
                data: {
                    userId: user.userId,
                    postId: postId,
                    voteType: 1
                }
            });
            action = 'liked';

            await prisma.post.update({
                where: { id: postId },
                data: { upvotes: { increment: 1 } }
            });
        }

        const updatedPost = await prisma.post.findUnique({
            where: { id: postId },
            select: { upvotes: true }
        });

        return NextResponse.json({
            success: true,
            action,
            upvotes: updatedPost?.upvotes || 0
        });

    } catch (error) {
        console.error('Error toggling like:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
