const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const cheerio = require('cheerio');
const yaml = require('js-yaml');

// 1. FUZZY SEARCH
const searchTerm = process.argv[2];
if (!searchTerm) {
    console.log(`❌ Please specify a model to load. Example: panda load qwen`);
    process.exit(1);
}

const modelsDir = path.join(__dirname, 'models');
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir);

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.gguf'));
const modelFile = files.find(f => f.toLowerCase() === `${searchTerm.toLowerCase()}.gguf`) || 
                  files.find(f => f.toLowerCase().includes(searchTerm.toLowerCase().replace(/\//g, '_'))) ||
                  files[0];

if (!modelFile) {
    console.log(`❌ No models found matching "${searchTerm}".`);
    process.exit(1);
}

const modelPath = path.join(modelsDir, modelFile);
const serverPath = path.join(__dirname, 'llama-server.exe');

console.clear();
console.log(`
 🐼 P A N D A  A I 
 ------------------
 🧠 Model: ${modelFile}
 ⚡ Engine: API Server Mode (100% Clean)
 🌐 Web: Type /web before your prompt
 ❌ Exit: Type 'exit'
`);

function loadConfig() {
    try { return yaml.load(fs.readFileSync(path.join(__dirname, 'panda.yaml'), 'utf8')); } 
    catch (e) { return { system_instruction: "You are a concise AI.", temperature: "0.7" }; }
}

const config = loadConfig();

// 2. BOOT THE SILENT SERVER
console.log('   ⚙️  Starting Background Engine...');
const llamaServer = spawn(serverPath, [
    '-m', modelPath,
    '-c', '4096',
    '-ngl', '99',
    '--port', '8080'
], { stdio: 'ignore' }); // Completely mutes the server logs

// Wait 3 seconds for the server to boot before allowing input
setTimeout(() => {
    console.log('   ✅ Engine Ready!\n');
    askQuestion();
}, 3000);

// Ensure the server dies when you exit
process.on('exit', () => llamaServer.kill());
process.on('SIGINT', () => process.exit(0));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let messages = [{ role: "system", content: config.system_instruction }];

function askQuestion() {
    rl.question('🧑 You: ', async (input) => {
        if (input.toLowerCase() === 'exit') return process.exit(0);
        if (!input.trim()) return askQuestion();

        let currentUserTurn = input;

        // Web Search Logic
        if (input.startsWith('/web ')) {
            const q = input.replace('/web ', '');
            process.stdout.write(`   🔍 [Panda is searching DuckDuckGo...] `);
            try {
                const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' } 
                });
                const $ = cheerio.load(await res.text());
                let webData = "";
                $('.result__snippet').each((i, el) => { if (i < 3) webData += $(el).text().trim() + "\n"; });
                
                if (!webData) webData = "No search results found.";
                console.log(`✅\n`);
                currentUserTurn = `Web Data:\n${webData}\n\nUser Question: ${q}`;
            } catch(e) { 
                console.log(`❌ Failed\n`);
                currentUserTurn = input; 
            }
        }

        messages.push({ role: "user", content: currentUserTurn });

        // Print the animated thinking indicator immediately
        process.stdout.write('🐼 Panda: \x1b[90m[Thinking...]\x1b[0m');

        // 3. CLEAN API REQUEST
        try {
            const response = await fetch('http://localhost:8080/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    temperature: parseFloat(config.temperature) || 0.7,
                    stream: true // Stream the text smoothly
                })
            });

            let fullAiResponse = "";
            let isThinking = false;
            let firstTokenPrinted = false; // Tracks if we have erased the "[Thinking...]" text yet
            let buffer = "";
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let streamBuffer = ""; // THE FIX: Holds broken JSON chunks safely

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Safely stitch broken stream lines together
                streamBuffer += decoder.decode(value, { stream: true });
                const lines = streamBuffer.split('\n');
                streamBuffer = lines.pop(); // Keep the last incomplete line in the buffer for the next loop!

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            let text = data.choices[0].delta.content;
                            
                            if (text) {
                                buffer += text;

                                // Erase "[Thinking...]" the exact moment the first real token is ready
                                if (!firstTokenPrinted) {
                                    process.stdout.write('\r\x1b[K🐼 Panda: ');
                                    firstTokenPrinted = true;
                                }

                                // 4. CLEAN THINKING SCRUBBER
                                if (!isThinking) {
                                    if (buffer.includes('<think>')) {
                                        isThinking = true;
                                        buffer = buffer.replace('<think>', '');
                                    } else if (buffer.length > 10) {
                                        let safeText = buffer.slice(0, -10);
                                        process.stdout.write(safeText);
                                        fullAiResponse += safeText;
                                        buffer = buffer.slice(-10);
                                    }
                                } else {
                                    if (buffer.includes('</think>')) {
                                        isThinking = false;
                                        buffer = buffer.split('</think>')[1] || "";
                                    } else {
                                        if (buffer.length > 20) buffer = buffer.slice(-15);
                                    }
                                }
                            }
                        } catch (e) {
                            // JSON chunk split gracefully caught, will resolve on the next loop iteration
                        }
                    }
                }
            }

            // Flush remaining buffer
            if (!isThinking && buffer) {
                // Failsafe just in case the response was so fast it never tripped the first token check
                if (!firstTokenPrinted) process.stdout.write('\r\x1b[K🐼 Panda: ');
                
                process.stdout.write(buffer);
                fullAiResponse += buffer;
            }

            // Save clean response to memory
            messages.push({ role: "assistant", content: fullAiResponse.trim() });
            console.log("\n");
            
        } catch (error) {
            console.log(`\n🛑 API Error: Could not reach the engine. Is it still booting?\n`);
        }

        askQuestion();
    });
}