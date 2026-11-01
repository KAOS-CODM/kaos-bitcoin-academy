import { spawn } from 'node:child_process'

const root = new URL('..', import.meta.url)
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const children = [
  spawn(npm, ['--prefix', 'server', 'run', 'dev'], { cwd: root, stdio: 'inherit' }),
  spawn(npm, ['--prefix', 'client', 'run', 'dev'], { cwd: root, stdio: 'inherit' }),
]

let stopping = false

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 200)
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`A development process exited with code ${code ?? 1}`)
      stop(code ?? 1)
    }
  })
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
