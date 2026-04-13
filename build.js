const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Environment variables missing. Skipping replacement. Deploy will work after Storage is connected.');
    process.exit(0); // ফেইল না করে সফলভাবে বেরিয়ে যাও
}

const htmlFiles = ['index.html', 'login.html', 'register.html', 'admin.html', 'admin-login.html', 'volunteer.html', 'worker.html', 'client-order.html'];
htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL/g, supabaseUrl);
        content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/g, supabaseKey);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Processed ${file}`);
    }
});

const supabaseJsPath = path.join(__dirname, 'supabase.js');
if (fs.existsSync(supabaseJsPath)) {
    let supabaseContent = fs.readFileSync(supabaseJsPath, 'utf8');
    supabaseContent = supabaseContent.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL/g, supabaseUrl);
    supabaseContent = supabaseContent.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/g, supabaseKey);
    fs.writeFileSync(supabaseJsPath, supabaseContent);
    console.log('✅ Processed supabase.js');
}

console.log('🎉 Build complete!');
