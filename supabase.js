// supabase.js - Supabase ক্লায়েন্ট ও অথেনটিকেশন
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// বিল্ড টাইমে এনভায়রনমেন্ট ভেরিয়েবল প্রতিস্থাপিত হবে
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

// গ্লোবালি সুপাবেস অবজেক্ট রাখুন (script.js যাতে ব্যবহার করতে পারে)
window.supabase = supabase;
window.checkSession = checkSession;
window.requireAuth = requireAuth;
window.logout = logout;