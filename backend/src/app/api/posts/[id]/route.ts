import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const user = await verifyToken(token);

        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const params = await context.params;
        const postId = params.id;

        // Check if the post exists and verify ownership
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { userId: true }, // Only fetch what we need
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Restrict deletion to the owner of the post
        if (post.userId !== user.userId) {
            return NextResponse.json({ error: 'Forbidden: You can only delete your own posts' }, { status: 403 });
        }

        // Delete the post. 
        // Prisma cascade deletes should handle wiping the related Comments & Upvotes
        await prisma.post.delete({
            where: { id: postId },
        });

        return NextResponse.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('DELETE POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
