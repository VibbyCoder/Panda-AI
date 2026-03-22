# 🐼 Panda AI

Panda AI is a blazing-fast, terminal-based Local AI Assistant powered by `llama.cpp` and Node.js. It runs massive LLMs entirely on your local hardware (CPU or GPU) while offering advanced features like live web searching, intelligent stream parsing, and automated model management.

## ✨ Key Features

* **100% Local & Private:** Run powerful `.gguf` models directly on your machine without relying on cloud APIs.
* **API Server Architecture:** Uses a background `llama-server` to guarantee a pristine, artifact-free chat experience in your terminal.
* **Google Stealth Web Search:** Type `/web` before any prompt to silently scrape Google for real-time context. Uses custom Chrome headers to bypass CAPTCHA blocks.
* **Smart "Thinking" Parser:** Natively catches `<think>` tags from reasoning models (like DeepSeek or Qwen). It displays a sleek animated `[Thinking...]` indicator and hides the internal monologue, printing only the final answer perfectly.
* **Fuzzy Search:** No need to type exact filenames. Just type `panda load qwen` and it will find the closest matching model in your directory.
* **Cross-Platform Installers:** Includes fully automated, 1-click install scripts for both Windows and Debian-based Linux.

---

## 🚀 Installation

Panda AI comes with automated installation scripts that will check your system for Git and Node.js, install them if missing, download the correct `llama.cpp` binaries for your hardware (CPU or GPU), and link the global `panda` command.

### Windows (Automated)
1. Download the `install-panda.ps1` script.
2. Right-click the file and select **Run with PowerShell**.
3. Follow the on-screen prompts to select CPU or GPU.

*(Note: If Windows blocks the script, open PowerShell as Administrator and run `Set-ExecutionPolicy RemoteSigned`, then try again).*
