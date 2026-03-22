const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const searchTerm = process.argv[2];

if (!searchTerm) {
    console.log(`❌ Please specify a model to run. Example: panda run qwen`);
    process.exit(1);
}

// 1. FUZZY SEARCH LOGIC
const modelsDir = path.join(__dirname, 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.gguf'));
const modelFile = files.find(f => f.toLowerCase() === `${searchTerm.toLowerCase()}.gguf`) || 
                  files.find(f => f.toLowerCase().includes(searchTerm.toLowerCase().replace(/\//g, '_'))) ||
                  files[0];

if (!modelFile) {
    console.log(`❌ Model not found for "${searchTerm}"`);
    process.exit(1);
}

const modelPath = path.join(modelsDir, modelFile);

const server = http.createServer((req, res) => {
    // Dynamic Route: localhost:8080/api/qwen
    if (req.method === 'POST' && req.url === `/api/${searchTerm}`) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const reqData = JSON.parse(body);
                const userMessage = reqData.messages[reqData.messages.length - 1].content;
                
                res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' });

                const args = [
                    '-m', modelPath, 
                    '-p', `User: ${userMessage}\nAI:`, 
                    '-n', '2048', 
                    '-ngl', '99',
                    '--repeat-penalty', '1.15'
                ];
                
                const llama = spawn(path.join(__dirname, 'llama-cli.exe'), args);

                llama.stdout.on('data', data => {
                    const text = data.toString();
                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
                });

                llama.on('close', () => {
                    res.write('data: [DONE]\n\n');
                    res.end();
                });

            } catch (err) { res.writeHead(400); res.end(); }
        });
    } else {
        res.writeHead(404);
        res.end(`Panda API is running specifically for model on /api/${searchTerm}`);
    }
});

server.listen(PORT, () => {
    console.clear();
    console.log(`
 🐼 P A N D A  S E R V E R
 -------------------------
 🧠 Model loaded: ${modelFile}
 ⚡ GPU Acceleration: Active
 🟢 API Route: http://localhost:${PORT}/api/${searchTerm}
    `);
});