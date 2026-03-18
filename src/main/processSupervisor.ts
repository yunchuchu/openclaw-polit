type KillableProcess = {
  kill: (signal?: NodeJS.Signals | number) => void
}

export class ProcessSupervisor {
  private children: KillableProcess[] = []

  track(proc: KillableProcess) {
    this.children.push(proc)
  }

  stopAll() {
    for (const child of this.children) {
      child.kill()
    }
    this.children = []
  }
}
