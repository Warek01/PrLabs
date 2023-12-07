import { bgBlue, greenBright } from 'colorette'

export class Logger {
  private readonly _name: string

  constructor(name: string) {
    this._name = name
  }

  public log(text: string): void {
    console.log(bgBlue(greenBright(`[${this._name}]`)), text)
  }
}
