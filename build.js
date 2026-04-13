const fs = require('fs');
const path = require('path');

// Vercel বিল্ড এনভায়রনমেন্ট থেকে ভেরিয়েবল নেওয়া
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Checking environment variables...');
console.log('NEXT_PUBLIC_SUPABASE_URL exists?', !!supabaseUrl);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists?', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables. Build will continue but site will not work until Storage is connected or variables are set manually.');
    // এখানে process.exit(1) করবেন না, বরং বিল্ড সফল হতে দিন যাতে Vercel ডিপ্লয় কমপ্লিট হয়
    process.exit(0);
}

// যেসব ফাইলে প্রতিস্থাপন করা হবে
const targetFiles = [
    'index.html', 'login.html', 'register.html', 'admin.html', 
    'admin-login.html', 'volunteer.html', 'worker.html', 'client-order.html',
    'supabase.js', 'script.js'
];

targetFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ ${file} not found, skipping`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // প্রতিস্থাপন করা
    content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL/g, supabaseUrl);
    content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/g, supabaseKey);
    
    // যদি কোনো পরিবর্তন হয়, তাহলে ফাইল আপডেট করো
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Replaced env vars in ${file}`);
    } else {
        console.log(`ℹ️ No replacement needed in ${file}`);
    }
});

console.log('🎉 Build script completed successfully.');
