const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const MODELS_DIR = path.join(__dirname, 'models');
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR);

async function fetchModelTree(repoId) {
    const res = await fetch(`https://huggingface.co/api/models/${repoId}/tree/main`);
    if (!res.ok) throw new Error(`Repo not found.`);
    return await res.json();
}

function selectOptimalGGUF(files) {
    const gguf = files.filter(f => f.path.endsWith('.gguf'));
    if (!gguf.length) throw new Error("No GGUF found.");
    return gguf.find(f => f.path.toLowerCase().includes('q4_k_m')) || gguf.find(f => f.path.toLowerCase().includes('q4')) || gguf[0];
}

async function run() {
    const repoId = process.argv[3];
    if (!repoId) return console.log("Usage: panda install <repo>");
    
    try {
        console.log(`\n📡 Contacting Hugging Face for: ${repoId}...`);
        const tree = await fetchModelTree(repoId);
        const fileInfo = selectOptimalGGUF(tree);
        
        // Dynamically name the file based on the repo!
        const safeName = repoId.replace(/\//g, '_') + '.gguf';
        const destPath = path.join(MODELS_DIR, safeName);
        
        console.log(`🎯 Found optimal file: ${fileInfo.path}`);
        
        const res = await fetch(`https://huggingface.co/${repoId}/resolve/main/${fileInfo.path}?download=true`);
        const total = parseInt(res.headers.get('content-length'), 10);
        let downloaded = 0;

        const progress = new require('stream').Transform({
            transform(chunk, e, cb) {
                downloaded += chunk.length;
                process.stdout.write(`\r🚀 Downloading: ${((downloaded/total)*100).toFixed(1)}%`);
                cb(null, chunk);
            }
        });

        await pipeline(res.body, progress, fs.createWriteStream(destPath));
        console.log(`\n\n✅ Success! Saved as ${safeName}`);
        console.log(`You can now run it using: node cli.js load ${repoId}`);
    } catch (e) { console.error(`\n❌ Error: ${e.message}`); }
}
run();