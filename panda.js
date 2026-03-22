const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const cheerio = require('cheerio');

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
    console.log(`
🐼 PANDA AI 
-----------
panda install <repo>      Download model from Hugging Face
panda load <repo>         Start interactive terminal chat
panda run <repo>          Start the background API server
    `);
    process.exit(0);
}

switch (command) {
    case 'install': fork(path.join(__dirname, 'install.js'), args); break;
    case 'load': fork(path.join(__dirname, 'load.js'), [args[1]]); break;
    case 'run': fork(path.join(__dirname, 'server.js'), [args[1]]); break;
    default: console.log(`❌ Unknown command: ${command}`);
}
function loadConfig() {
    try { 
        const configPath = path.join(__dirname, 'panda.yaml');
        return yaml.load(fs.readFileSync(configPath, 'utf8')); 
    } catch (e) { 
        return { system_instruction: "You are a helpful AI." }; 
    }
}

async function runCLI(userPrompt) {
    const config = loadConfig();
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    let prompt = `System: ${config.system_instruction}\nTime: ${time}\n\n`;

    if (userPrompt.startsWith('/web ')) {
        const q = userPrompt.replace('/web ', '');
        console.log(`🔍 Searching web for: ${q}...`);
        try {
            const res = await fetch(`https://www.google.com/search?q=${encodeURIComponent(q)}`, { 
                headers: { 'User-Agent': 'Mozilla/5.0' } 
            });
            const $ = cheerio.load(await res.text());
            let webData = "";
            $('.BNeawe, .VwiC3b').each((i, el) => { 
                if (i < 3) webData += $(el).text() + "\n"; 
            });
            prompt += `Web Data:\n${webData}\n\nUser: ${q}`;
        } catch(e) { 
            prompt += `User: ${q}`; 
        }
    } else {
        prompt += `User: ${userPrompt}`;
    }

    // Safely resolve the model path
    const modelPath = path.join(__dirname, 'models', 'model.gguf');
    
    // We cap tokens at 2048 to prevent infinite runaway, and add the anti-loop penalties
    const args = [
        '-m', modelPath, 
        '-p', prompt, 
        '-n', '2048',
        '--repeat-penalty', '1.15',   // Stops it from repeating exact phrases
        '--presence-penalty', '1.1'   // Forces it to move on to new concepts
    ];
    
    if (config.temperature) args.push('--temp', config.temperature.toString());
    
    console.log(`\n🤖 Panda Output:\n`);
    
    // Safely resolve the engine path (This is the fix!)
    // Safely resolve the engine path
    const enginePath = path.join(__dirname, 'llama-cli.exe');
    const llama = spawn(enginePath, args);
    
    // 1. Stream normal output
    llama.stdout.on('data', data => {
        process.stdout.write(data.toString());
    });

    // 2. Catch spawn errors
    llama.on('error', (err) => {
        console.log(`\n❌ Engine Error: ${err.message}`);
    });

    // 3. DEBUG MODE: Print absolutely everything the engine says
    llama.stderr.on('data', data => {
        process.stdout.write(`[ENGINE LOG] ${data.toString()}`);
    });

    // 4. Catch the exact moment it crashes
    llama.on('close', (code) => {
        console.log(`\n🛑 Llama.cpp engine shut down with exit code: ${code}`);
    });
}

const input = process.argv.slice(2).join(' ');
if (input) {
    runCLI(input);
}
// END OF FILE
