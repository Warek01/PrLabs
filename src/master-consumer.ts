import path from 'path'
import * as colorette from 'colorette'
import { ChildProcess, fork } from 'child_process'

const slavePath: string = path.join(__dirname, 'slave-consumer.ts')
const childProcesses: ChildProcess[] = []

console.log(
  `Type ${colorette.greenBright('start <COUNT>')} or ${colorette.greenBright(
    'stop',
  )}`,
)

process
  .on('SIGINT', onTerminate)
  .on('SIGTERM', onTerminate)
  .on('SIGKILL', onTerminate)

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

        childProcesses.push(proc)

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

      for (const proc of childProcesses) {
        proc.kill('SIGTERM')
      }

      setTimeout(() => process.exit(0), 1000) // give time for procs to end
    } else {
      console.log(colorette.red('Unknown command'))
    }
  }
} finally {
  await onTerminate()
}

async function onTerminate(): Promise<void> {
  for (const proc of childProcesses) {
    if (!proc.killed) {
      proc.kill('SIGKILL')
      proc.disconnect()
    }
  }

  process.exit(0)
}
