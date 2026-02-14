"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
    try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.warn("VAPID public key not set, skipping push subscription");
            return;
        }

        // Check if already subscribed
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
            console.log("✓ Already subscribed to push");
            // Still send to server in case it's a new session
            await sendSubscriptionToServer(existing);
            return;
        }

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn("Notification permission denied");
            return;
        }

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });

        console.log("✓ Push subscription created");
        await sendSubscriptionToServer(subscription);
    } catch (err) {
        console.error("Push subscription error:", err);
    }
}

async function sendSubscriptionToServer(subscription: PushSubscription) {
    try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.warn("No session, skipping push subscription save");
            return;
        }

        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ subscription: subscription.toJSON() }),
        });

        if (response.ok) {
            console.log("✓ Push subscription saved to server");
        } else {
            console.error("Failed to save push subscription:", await response.text());
        }
    } catch (err) {
        console.error("Error saving push subscription:", err);
    }
}

export default function RegisterSW() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((reg) => {
                    console.log("✓ Service Worker registered:", reg.scope);
                    // Subscribe to push after SW is ready
                    subscribeToPush(reg);
                })
                .catch((err) => {
                    console.error("✗ Service Worker registration failed:", err);
                });
        }
    }, []);

    return null;
}
