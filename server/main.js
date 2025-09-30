import { spawn } from 'child_process';
import path from 'path';
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function spawnNode(scriptName, args = []) {
  const scriptPath = path.join(process.cwd(), scriptName);
  const child = spawn(process.execPath, [scriptPath, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  child.stdout.on('data', (d) => process.stdout.write(`[${scriptName}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${scriptName} ERR] ${d}`));

  child.on('exit', (code, sig) => {
    console.log(`${scriptName} exited with ${code ?? sig}`);
  });

  return child;
}

console.log('Starting webserver and websocket server...');

const webserver = spawnNode('webserver.js');
const websocket = spawnNode('websocket-server.js');

function shutdown() {
  console.log('Shutting down child processes...');
  webserver.kill();
  websocket.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
