import { ChildProcess } from 'node:child_process'

export class ProcessSupervisor {
  private children: ChildProcess[] = []

  track(proc: ChildProcess) {
    this.children.push(proc)
  }

  stopAll() {
    for (const child of this.children) {
      child.kill()
    }
    this.children = []
  }
}
