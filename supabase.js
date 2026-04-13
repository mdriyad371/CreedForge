// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// আপনার দেওয়া Supabase credentials
const SUPABASE_URL = 'https://pebgwkbqcpcioggxqrpg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmd3a2JxY3BjaW9nZ3hxcnBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNjg5MTIsImV4cCI6MjA5MTY0NDkxMn0.wbtDN9-pfEYmERCbGVgAlCh22nBY1sMngNTEGEvLQXE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

export async function checkSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();
    if (profile) currentUser = profile;
    return currentUser;
}

export async function requireAuth(allowedRoles = []) {
    const user = await checkSession();
    if (!user) return null;
    if (allowedRoles.length && !allowedRoles.includes(user.role)) return null;
    window.currentUser = user;
    return user;
}

export async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('admin_authenticated');
    window.location.href = 'index.html';
}

// গ্লোবালি এক্সপোজ (script.js এর জন্য)
window.supabase = supabase;
window.checkSession = checkSession;
window.requireAuth = requireAuth;
window.logout = logout;
