import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');

        // Authenticate user
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Authorization: `Bearer ${token}` }
                }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { subscription } = body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
        }

        // Upsert push subscription using service role (bypasses RLS)
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error: dbError } = await adminSupabase
            .from('push_subscriptions')
            .upsert(
                {
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    keys_p256dh: subscription.keys.p256dh,
                    keys_auth: subscription.keys.auth,
                },
                { onConflict: 'user_id,endpoint' }
            );

        if (dbError) {
            console.error('Push subscription save error:', dbError);
            return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Push subscribe error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
