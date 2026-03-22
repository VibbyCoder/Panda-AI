const fs = require('fs');
const path = require('path');

const searchTerm = process.argv[2];

if (!searchTerm) {
    console.log(`❌ Please specify a model to delete. Example: panda delete qwen`);
    process.exit(1);
}

const modelsDir = path.join(__dirname, 'models');

if (!fs.existsSync(modelsDir)) {
    console.log(`❌ No models directory found.`);
    process.exit(1);
}

// FUZZY SEARCH: Finds the exact file or the closest match
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.gguf'));
const modelFile = files.find(f => f.toLowerCase() === `${searchTerm.toLowerCase()}.gguf`) || 
                  files.find(f => f.toLowerCase().includes(searchTerm.toLowerCase().replace(/\//g, '_')));

console.clear();
console.log(`\n 🐼 PANDA AI UNINSTALLER\n -----------------------`);

if (!modelFile) {
    console.log(` ❌ Model not found matching "${searchTerm}".`);
    console.log(`    Installed models:\n` + (files.length ? files.map(f => `    - ${f}`).join('\n') : '    (None)'));
    process.exit(1);
}

const modelPath = path.join(modelsDir, modelFile);

try {
    // Delete the file
    fs.unlinkSync(modelPath);
    console.log(` ✅ Successfully deleted: ${modelFile}`);
    
    // Check how much space is left
    const remainingFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.gguf'));
    console.log(`    Remaining models: ${remainingFiles.length}\n`);
} catch (err) {
    console.log(` ❌ Error deleting file. It might be currently running in another terminal.`);
    console.log(`    System Error: ${err.message}\n`);
}