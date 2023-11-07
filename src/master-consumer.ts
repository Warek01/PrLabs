import path from 'path'
import * as colorette from 'colorette'
import { ChildProcess, fork } from 'child_process'

const slavePath = path.join(__dirname, 'slave-consumer.ts')
const procs: ChildProcess[] = []

console.log(
  `Type ${colorette.greenBright('start <nr>')} or ${colorette.greenBright(
    'stop',
  )}`,
)

process
  .once('SIGINT', async () => await endProcess())
  .once('SIGTERM', async () => await endProcess())

try {
  for await (let line of console) {
    line = line.trim().toLowerCase()

    if (line.startsWith('start')) {
      const nr: number = parseInt(line.split(' ')[1])
      console.log(`Starting ${nr} workers`)

      for (let i = 0; i < nr; i++) {
        const proc: ChildProcess = fork(slavePath, {
          stdio: 'inherit', // share same io with master
          detached: false,
        })

        console.log(`Started consumer ${i} pid: ${proc.pid}`)

        procs.push(proc)

        /* Does not work properly with typeorm */
        // const worker: Worker = new Worker(
        //   path.join(__dirname, 'slave-consumer.ts'),
        // )
        //
        // worker.on('message', (message) =>
        //   console.log(`${colorette.blue(`Worker-${i}`)}: ${message}`),
        // )
      }
    } else if (line === 'stop') {
      console.log('Closing')

      for (const proc of procs) {
        proc.kill('SIGTERM')
      }

      setTimeout(() => process.exit(0), 1000) // give time for procs to end
    } else {
      console.log(colorette.red('Unknown command'))
    }
  }
} finally {
  await endProcess()
}

async function endProcess(): Promise<void> {
  for (const proc of procs) {
    if (!proc.killed) {
      proc.kill('SIGKILL')
      proc.disconnect()
    }
  }

  process.exit(0)
}
