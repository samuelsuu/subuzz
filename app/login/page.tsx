// Force dynamic rendering to prevent build-time prerender errors
// when Supabase environment variables are not available during Railway build
export const dynamic = 'force-dynamic';

import LoginForm from "./LoginForm";

export default function LoginPage() {
    return <LoginForm />;
}
