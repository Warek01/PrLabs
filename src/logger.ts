import { bgGreen, bgRed, greenBright, redBright } from 'colorette'

export class Logger {
  private readonly _name: string

  constructor(name: string) {
    this._name = name
  }

  public log(...data: any[]): void {
    console.log(bgGreen(greenBright(`[${this._name}]`)), ...data)
  }

  public error(...data: any[]): void {
    console.error(bgRed(redBright(`[${this._name}]`)), ...data)
  }
}
