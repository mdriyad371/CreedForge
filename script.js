// script.js - Creed Forge সম্পূর্ণ লজিক
import { supabase, checkSession, requireAuth, logout } from './supabase.js';

window.checkSession = checkSession;
window.requireAuth = requireAuth;
window.logout = logout;

let currentUser = null;

// ==================== হেল্পার ফাংশন ====================
async function getSettings() {
    const { data } = await supabase.from('settings').select('*').single();
    return data || { self_commission: 20, upline_commission: 5 };
}

async function getProducts() {
    const { data } = await supabase.from('products').select('*').eq('status', 'active');
    return data || [];
}

async function getOrders() {
    const { data } = await supabase.from('orders').select('*');
    return data || [];
}

async function getUsers() {
    const { data } = await supabase.from('users').select('*');
    return data || [];
}

async function getCommissions() {
    const { data } = await supabase.from('commissions').select('*');
    return data || [];
}

async function getWithdrawals() {
    const { data } = await supabase.from('withdrawals').select('*');
    return data || [];
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 z-50 px-4 py-2 rounded-lg text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== রেজিস্ট্রেশন ও লগইন (HTML ফর্মের সাথে সংযুক্ত) ====================
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value.trim();
    const role = document.getElementById('regRole').value;
    const phone = document.getElementById('regPhone').value.trim();
    const social = document.getElementById('regSocial').value.trim();
    const referredBy = document.getElementById('regRef').value.trim() || null;
    const errorDiv = document.getElementById('regError');

    if (!email || !password || !name || !phone) {
        errorDiv.innerText = 'সব ঘর পূরণ করুন';
        return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
        errorDiv.innerText = authError.message;
        return;
    }

    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        name,
        phone,
        role,
        social_link: social || null,
        referral_code: referralCode,
        referred_by: referredBy,
        approval_status: 'pending',
        balance: 0,
        total_earned: 0
    });

    if (profileError) {
        errorDiv.innerText = profileError.message;
        return;
    }

    alert('রেজিস্ট্রেশন সফল! অ্যাডমিন অনুমোদনের পর লগইন করতে পারবেন।');
    window.location.href = 'login.html';
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        errorDiv.innerText = 'ইমেইল বা পাসওয়ার্ড ভুল';
        return;
    }

    const user = await checkSession();
    if (user.role === 'admin') window.location.href = 'admin.html';
    else if (user.role === 'volunteer') window.location.href = 'volunteer.html';
    else if (user.role === 'worker') window.location.href = 'worker.html';
    else window.location.href = 'index.html';
});

// ==================== ভলান্টিয়ার ফাংশন ====================
async function loadVolunteerDashboard() {
    const container = document.getElementById('volunteerContent');
    if (!container) return;
    currentUser = window.currentUser || await checkSession();
    if (!currentUser) return;

    const settings = await getSettings();
    const orders = await getOrders();
    const myPendingOrders = orders.filter(o => o.volunteer_id === currentUser.id && o.status === 'pending');

    container.innerHTML = `
        <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-2">Welcome, ${currentUser.name}!</h2>
            <p>Referral Code: <strong class="text-pink-400">${currentUser.referral_code}</strong></p>
            <p>Balance: ৳${(currentUser.balance || 0).toFixed(2)} | Total Earned: ৳${(currentUser.total_earned || 0).toFixed(2)}</p>
            <p>Status: ${currentUser.approval_status === 'approved' ? '✅ Approved' : '⏳ Pending Approval'}</p>
        </div>
        <div class="glass-card p-6 mb-6">
            <h3 class="text-xl font-bold mb-3">Pending Orders (${myPendingOrders.length})</h3>
            ${myPendingOrders.length === 0 ? '<p class="text-gray-400">No pending orders</p>' : myPendingOrders.map(o => `
                <div class="bg-black/40 p-3 rounded-xl mb-2">
                    <p><strong>${o.product_name}</strong><br>Customer: ${o.customer_name} | Amount: ৳${o.amount}</p>
                    <p class="text-yellow-400 text-sm">Waiting for admin approval</p>
                </div>
            `).join('')}
        </div>
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-3">Commission Structure</h3>
            <ul><li>You earn ${settings.self_commission}% on every order</li><li>Your direct referral earns you ${settings.upline_commission}%</li></ul>
            <div class="mt-4">
                <input type="text" id="shareLink" value="${window.location.origin}/client-order.html?ref=${currentUser.referral_code}&product=1" class="w-full p-2 rounded bg-black/50">
                <button onclick="copyShareLink()" class="btn-primary mt-2 w-full">Copy Referral Link</button>
            </div>
        </div>
    `;
}

async function loadProducts() {
    const container = document.getElementById('volunteerContent') || document.getElementById('adminContent');
    if (!container) return;
    currentUser = window.currentUser || await checkSession();
    const products = await getProducts();
    const isApproved = currentUser?.approval_status === 'approved';

    container.innerHTML = `
        <div class="glass-card p-6">
            <h2 class="text-2xl font-bold mb-4">Products</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${products.map(p => `
                    <div class="bg-black/40 p-4 rounded-xl">
                        <img src="${p.image_url}" class="w-full h-40 object-cover rounded-lg">
                        <h3 class="text-xl font-bold mt-2">${p.name}</h3>
                        <p class="text-sm">${p.description}</p>
                        <p class="text-pink-400 font-bold mt-2">৳${p.price}</p>
                        ${isApproved ? `<button onclick="generateShareLink(${p.id})" class="btn-primary w-full mt-2 py-1 rounded-full text-sm">Generate Share Link</button>` : `<button disabled class="btn-primary w-full mt-2 py-1 rounded-full text-sm opacity-50">Pending Approval</button>`}
                        ${p.demo_link ? `<a href="${p.demo_link}" target="_blank" class="btn-outline w-full mt-2 py-1 rounded-full text-sm inline-block text-center">View Demo</a>` : ''}
                    </div>
                `).join('')}
            </div>
            <button onclick="changePage('volunteer_dashboard')" class="btn-primary mt-6 px-4 py-2 rounded-full">Back</button>
        </div>
    `;
}

async function loadVolunteerOrders() {
    const container = document.getElementById('volunteerContent');
    if (!container) return;
    currentUser = window.currentUser || await checkSession();
    const orders = await getOrders();
    const myOrders = orders.filter(o => o.volunteer_id === currentUser.id);
    const commissions = await getCommissions();
    const myCommissions = commissions.filter(c => c.user_id === currentUser.id);
    const totalCommission = myCommissions.reduce((s, c) => s + c.amount, 0);

    container.innerHTML = `
        <div class="glass-card p-6">
            <h2 class="text-2xl font-bold mb-4">My Orders</h2>
            <p>Total Commission: <strong class="text-pink-400">৳${totalCommission.toFixed(2)}</strong></p>
            <div class="space-y-3 mt-4">
                ${myOrders.length === 0 ? '<p class="text-gray-400">No orders yet</p>' : myOrders.map(o => `
                    <div class="bg-black/40 p-3 rounded-xl">
                        <div class="flex justify-between">
                            <div><p><strong>${o.product_name}</strong><br>Customer: ${o.customer_name} | Status: ${o.status}</p></div>
                            <div class="text-pink-400">৳${((o.amount || 0) * 0.2).toFixed(2)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="changePage('volunteer_dashboard')" class="btn-primary mt-6 px-4 py-2 rounded-full">Back</button>
        </div>
    `;
}

// ==================== ওয়ার্কার ফাংশন ====================
async function loadWorkerDashboard() {
    const container = document.getElementById('workerContent');
    if (!container) return;
    currentUser = window.currentUser || await checkSession();
    const orders = await getOrders();
    const availableJobs = orders.filter(o => o.status === 'approved_for_worker');
    const isApproved = currentUser?.approval_status === 'approved';

    container.innerHTML = `
        <div class="glass-card p-6 mb-6">
            <h2 class="text-2xl font-bold mb-2">Welcome, ${currentUser.name}!</h2>
            <p>Balance: ৳${(currentUser.balance || 0).toFixed(2)} | Total Earned: ৳${(currentUser.total_earned || 0).toFixed(2)}</p>
            <p>Status: ${currentUser.approval_status === 'approved' ? '✅ Approved' : '⏳ Pending Approval'}</p>
        </div>
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-3">Available Jobs (${availableJobs.length})</h3>
            ${availableJobs.length === 0 ? '<p class="text-gray-400">No jobs available</p>' : availableJobs.map(job => `
                <div class="bg-black/40 p-3 rounded-xl mb-2">
                    <p><strong>${job.product_name}</strong> | Amount: ৳${job.amount}</p>
                    <p>Requirements: ${job.comments || 'Not specified'}</p>
                    ${isApproved ? `<button onclick="takeJob(${job.id})" class="btn-primary mt-2 px-4 py-1 rounded-full text-sm">Take Job</button>` : `<button disabled class="btn-primary mt-2 px-4 py-1 rounded-full text-sm opacity-50">Pending Approval</button>`}
                </div>
            `).join('')}
        </div>
    `;
}

async function loadAvailableJobs() { await loadWorkerDashboard(); }

async function loadMyJobs() {
    const container = document.getElementById('workerContent');
    if (!container) return;
    currentUser = window.currentUser || await checkSession();
    const orders = await getOrders();
    const myJobs = orders.filter(o => o.assigned_worker_id === currentUser.id);

    container.innerHTML = `
        <div class="glass-card p-6">
            <h2 class="text-2xl font-bold mb-4">My Jobs</h2>
            <div class="space-y-3">
                ${myJobs.length === 0 ? '<p class="text-gray-400">No jobs taken yet</p>' : myJobs.map(job => `
                    <div class="bg-black/40 p-3 rounded-xl">
                        <div class="flex justify-between">
                            <div><p><strong>${job.product_name}</strong><br>Status: ${job.status}</p></div>
                            ${job.status === 'assigned' ? `<button onclick="completeJob(${job.id})" class="btn-primary px-3 py-1 rounded-full text-sm">Complete</button>` : '<span class="text-green-400">Completed</span>'}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="changePage('worker_dashboard')" class="btn-primary mt-6 px-4 py-2 rounded-full">Back</button>
        </div>
    `;
}

// ==================== অ্যাডমিন ফাংশন ====================
async function loadDashboard() {
    const container = document.getElementById('adminContent');
    if (!container) return;
    const users = await getUsers();
    const orders = await getOrders();
    const withdrawals = await getWithdrawals();
    const pendingUsers = users.filter(u => u.approval_status === 'pending');
    const pendingOrders = orders.filter(o => o.status === 'pending');

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>${users.length}</h3><p>Total Users</p></div>
            <div class="stat-card"><h3>${pendingUsers.length}</h3><p>Pending Approvals</p></div>
            <div class="stat-card"><h3>${orders.length}</h3><p>Total Orders</p></div>
            <div class="stat-card"><h3>${pendingOrders.length}</h3><p>Pending Orders</p></div>
        </div>
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-3">Pending User Approvals</h3>
            ${pendingUsers.length === 0 ? '<p class="text-gray-400">No pending approvals</p>' : pendingUsers.map(u => `
                <div class="flex justify-between items-center bg-black/40 p-3 rounded-xl mb-2">
                    <div><p><strong>${u.name}</strong> (${u.email})<br>Role: ${u.role}</p></div>
                    <div><button onclick="approveUser('${u.id}')" class="bg-green-700 px-3 py-1 rounded-full text-sm mr-2">Approve</button><button onclick="rejectUser('${u.id}')" class="bg-red-700 px-3 py-1 rounded-full text-sm">Reject</button></div>
                </div>
            `).join('')}
        </div>
        <div class="glass-card p-6 mt-6">
            <h3 class="text-xl font-bold mb-3">Pending Orders</h3>
            ${pendingOrders.length === 0 ? '<p class="text-gray-400">No pending orders</p>' : pendingOrders.map(o => `
                <div class="flex justify-between items-center bg-black/40 p-3 rounded-xl mb-2">
                    <div><p><strong>${o.product_name}</strong><br>Customer: ${o.customer_name} | Amount: ৳${o.amount}</p></div>
                    <button onclick="approveOrder(${o.id})" class="bg-green-700 px-3 py-1 rounded-full text-sm">Approve for Worker</button>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadUserApprovals() { await loadDashboard(); }
async function loadOrders() { await loadDashboard(); }
async function loadProductsAdmin() { await loadProducts(); }
async function loadWithdrawals() { await loadDashboard(); }
async function loadCommissionSettings() { await loadDashboard(); }

// ==================== অ্যাকশন ফাংশন (onclick ইভেন্টের জন্য) ====================
window.generateShareLink = (productId) => {
    const shareUrl = `${window.location.origin}/client-order.html?ref=${currentUser.referral_code}&product=${productId}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('Share link copied!');
};

window.copyShareLink = () => {
    const link = document.getElementById('shareLink');
    if (link) { link.select(); document.execCommand('copy'); showToast('Link copied!'); }
};

window.takeJob = async (orderId) => {
    currentUser = window.currentUser || await checkSession();
    const { error } = await supabase.from('orders').update({ status: 'assigned', assigned_worker_id: currentUser.id }).eq('id', orderId);
    if (!error) { showToast('Job taken!'); changePage('my_jobs'); }
    else showToast('Error taking job', 'error');
};

window.completeJob = async (orderId) => {
    const deliveryLink = prompt('Enter delivery link:');
    if (!deliveryLink) return;
    const { error } = await supabase.from('orders').update({ status: 'worker_delivered', delivery_link: deliveryLink }).eq('id', orderId);
    if (!error) { showToast('Delivery submitted!'); changePage('my_jobs'); }
    else showToast('Error', 'error');
};

window.approveUser = async (userId) => {
    await supabase.from('users').update({ approval_status: 'approved' }).eq('id', userId);
    showToast('User approved'); loadDashboard();
};

window.rejectUser = async (userId) => {
    await supabase.from('users').update({ approval_status: 'rejected' }).eq('id', userId);
    showToast('User rejected'); loadDashboard();
};

window.approveOrder = async (orderId) => {
    await supabase.from('orders').update({ status: 'approved_for_worker' }).eq('id', orderId);
    showToast('Order approved for workers'); loadDashboard();
};

window.changePage = (page) => {
    if (page === 'volunteer_dashboard') loadVolunteerDashboard();
    else if (page === 'products') loadProducts();
    else if (page === 'volunteer_orders') loadVolunteerOrders();
    else if (page === 'worker_dashboard') loadWorkerDashboard();
    else if (page === 'available_jobs') loadAvailableJobs();
    else if (page === 'my_jobs') loadMyJobs();
    else if (page === 'profile') alert('Profile feature coming soon');
    else if (page === 'withdraw') alert('Withdraw feature coming soon');
};

export async function loadClientOrderForm(refCode, productId) {
    const container = document.getElementById('clientContent');
    const product = (await getProducts()).find(p => p.id == productId);
    if (!product) { container.innerHTML = '<p class="text-red-400">Product not found</p>'; return; }

    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">${product.name}</h2>
        <img src="${product.image_url}" class="w-full h-48 object-cover rounded-lg mb-4">
        <p>${product.description}</p>
        <p class="text-2xl font-bold text-pink-400 my-3">৳${product.price}</p>
        ${product.demo_link ? `<a href="${product.demo_link}" target="_blank" class="btn-outline inline-block mr-2">View Demo</a>` : ''}
        ${product.promo_video ? `<a href="${product.promo_video}" target="_blank" class="btn-outline inline-block">Watch Promo</a>` : ''}
        <form id="clientOrderForm" class="mt-6">
            <input type="text" id="custName" placeholder="Your Name" class="w-full p-2 rounded bg-black/50 border border-pink-500 mb-3" required>
            <input type="tel" id="custPhone" placeholder="Phone" class="w-full p-2 rounded bg-black/50 border border-pink-500 mb-3" required>
            <input type="email" id="custEmail" placeholder="Email" class="w-full p-2 rounded bg-black/50 border border-pink-500 mb-3" required>
            <button type="submit" class="btn-primary w-full">Place Order</button>
        </form>
    `;

    document.getElementById('clientOrderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const volunteer = (await getUsers()).find(u => u.referral_code === refCode);
        if (!volunteer) { alert('Invalid referral'); return; }
        await supabase.from('orders').insert({
            volunteer_id: volunteer.id,
            product_id: product.id,
            product_name: product.name,
            amount: product.price,
            customer_name: document.getElementById('custName').value,
            customer_phone: document.getElementById('custPhone').value,
            customer_email: document.getElementById('custEmail').value,
            status: 'pending'
        });
        alert('Order placed! Volunteer will contact you.');
        window.location.href = 'index.html';
    });
}

// ==================== গ্লোবালি ফাংশন এক্সপোজ করুন (HTML-এর onclick এর জন্য) ====================
window.loadVolunteerDashboard = loadVolunteerDashboard;
window.loadProducts = loadProducts;
window.loadVolunteerOrders = loadVolunteerOrders;
window.loadWorkerDashboard = loadWorkerDashboard;
window.loadAvailableJobs = loadAvailableJobs;
window.loadMyJobs = loadMyJobs;
window.loadDashboard = loadDashboard;
window.loadUserApprovals = loadUserApprovals;
window.loadOrders = loadOrders;
window.loadProductsAdmin = loadProductsAdmin;
window.loadWithdrawals = loadWithdrawals;
window.loadCommissionSettings = loadCommissionSettings;
window.changePage = changePage;
