declare global {
  namespace NodeJS {
    interface ProcessEnv extends AppEnv {}
  }
}

export interface AppEnv {
  readonly GMAIL: string
  readonly GOOGLE_APP_KEY: string
  readonly NODE_PORT: string
  readonly FTP_USERNAME: string
  readonly FTP_PASSWORD: string
  readonly FTP_PORT: string
  readonly FTP_IP: string
}
