import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp } from '../src/app.js'
import type { AppOptions } from '../src/app.js'

export interface TestServer {
  baseUrl: string
  close: () => Promise<void>
}

export async function startTestServer(options: AppOptions = {}): Promise<TestServer> {
  const app = createApp({ clientDist: null, ...options })

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })

  const address = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}

/** Minimal cookie jar; fetch does not persist cookies by itself. */
export class TestClient {
  private readonly cookies = new Map<string, string>()

  constructor(private readonly baseUrl: string) {}

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    if (this.cookies.size > 0) {
      headers.set(
        'cookie',
        [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; '),
      )
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      redirect: 'manual',
      ...init,
      headers,
    })

    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(';')[0] ?? ''
      const separator = pair.indexOf('=')
      if (separator === -1) continue
      const name = pair.slice(0, separator)
      const value = pair.slice(separator + 1)
      if (value === '') {
        this.cookies.delete(name)
      } else {
        this.cookies.set(name, value)
      }
    }

    return response
  }

  get(path: string): Promise<Response> {
    return this.request(path)
  }

  postJson(path: string, body: unknown): Promise<Response> {
    return this.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
}
