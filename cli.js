#!/usr/bin/env node
const { fork } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
    console.log(`
 🐼 PANDA AI ENGINE
 ------------------
 panda install <repo>      Download model from Hugging Face
 panda load <repo>         Start interactive terminal chat
 panda run <repo>          Start the background API server
 panda delete <repo>       Delete a downloaded model
    `);
    process.exit(0);
}

switch (command) {
    case 'install': fork(path.join(__dirname, 'install.js'), args); break;
    case 'load': fork(path.join(__dirname, 'load.js'), [args[1]]); break;
    case 'run': fork(path.join(__dirname, 'server.js'), [args[1]]); break;
    case 'delete': fork(path.join(__dirname, 'delete.js'), [args[1]]); break;
    default: console.log(`❌ Unknown command: ${command}`);
}