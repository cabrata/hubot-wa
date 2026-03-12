require("./config")
const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs'); // Tambahan untuk membaca file
const CFonts = require('cfonts');

let isRunning = false;
let isFirstBoot = true; // Supaya animasi panjang hanya di awal

// Fungsi untuk membaca author dari package.json
function getAuthor() {
    try {
        const pkgPath = path.join(__dirname, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            return pkg.author || global.author || 'Unknown Author';
        }
    } catch (err) {
        return global.author || 'Unknown Author';
    }
    return global.author || 'Unknown Author';
}

// Fungsi jeda waktu (untuk animasi)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function showIntro() {
    console.clear();

    // Menggunakan package CFonts Langsung
    CFonts.say(global.botName, {
        font: 'block',
        align: 'left',
        colors: ['candy'],
        background: 'transparent',
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: '0',
    });

    const authorName = getAuthor();
    const authorLine = `             Author : ${authorName}`;
    const padding = ' '.repeat(Math.max(0, 50 - authorLine.length));

    console.log(chalk.cyan('╭──────────────────────────────────────────────────╮'));
    console.log(chalk.cyan('│') + chalk.yellow('             Author : ') + chalk.whiteBright(authorName) + padding + chalk.cyan('│'));
    console.log(chalk.cyan('╰──────────────────────────────────────────────────╯\n'));

    // Loading Spinner Sejenak
    const frames = 15;
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    for (let i = 0; i < frames; i++) {
        const spinChar = spinnerFrames[i % spinnerFrames.length];
        process.stdout.write(`\r${chalk.yellow('⚙️  Starting Main Process... ')} ${chalk.cyanBright(spinChar)}`);
        await sleep(100);
    }

    // Hasil akhir setelah loading selesai
    process.stdout.write(`\r${chalk.green('✔️  Main Process Started!    ')}          \n\n`);
}

async function startBot() {
    if (isRunning) return;
    isRunning = true;

    // Tampilkan animasi hanya pada boot pertama atau restart
    if (isFirstBoot) {
        await showIntro();
        isFirstBoot = false;
    } else {
        console.log(chalk.yellow('\n[SYSTEM] Reconnecting to main process...'));
    }

    const args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)];
    const child = spawn(process.argv[0], args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    child.on('message', (msg) => {
        if (msg === 'restart') {
            console.log(chalk.yellow('\n[SYSTEM] Restarting bot requested by plugin...'));
            child.kill();
        }
    });

    child.on('exit', (code, signal) => {
        isRunning = false;
        console.error(chalk.red(`\n[SYSTEM] Bot process exited with code: ${code}, signal: ${signal}. Respawning in 1 second...`));
        setTimeout(() => {
            startBot();
        }, 1000);
    });
}

startBot();