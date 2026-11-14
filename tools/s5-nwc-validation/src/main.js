import './styles.css'
import { NWCClient } from '@getalby/sdk/nwc'
import {
  NwcHarnessError,
  parseNwcUri,
  sanitizeGetInfoResponse,
} from './nwc.js'

const form = document.getElementById('connect-form')
const input = document.getElementById('nwc-uri')
const connectButton = document.getElementById('connect-button')
const disconnectButton = document.getElementById('disconnect-button')
const status = document.getElementById('status')
const responseSection = document.getElementById('response-section')
const responseBody = document.getElementById('response-body')
const responseJson = document.getElementById('response-json')

const SAFE_WALLET_CODES = new Set([
  'UNAUTHORIZED',
  'NOT_IMPLEMENTED',
  'INSUFFICIENT_BALANCE',
  'QUOTA_EXCEEDED',
  'RATE_LIMITED',
  'RESTRICTED',
  'INTERNAL',
  'OTHER',
  'UNSUPPORTED_ENCRYPTION',
])

let client = null
let busy = false
let attempt = 0

function setStatus(kind, text) {
  status.dataset.kind = kind
  status.textContent = text
}

function setBusy(next) {
  busy = next
  input.disabled = next
  connectButton.disabled = next
  disconnectButton.disabled = false
}

function clearResponse() {
  responseBody.replaceChildren()
  responseJson.textContent = ''
  responseSection.hidden = true
}

function renderResponse(info) {
  responseBody.replaceChildren()

  for (const [key, value] of Object.entries(info)) {
    const row = document.createElement('tr')
    const heading = document.createElement('th')
    const cell = document.createElement('td')

    heading.scope = 'row'
    heading.textContent = key
    cell.textContent = Array.isArray(value) ? value.join(', ') : String(value)
    row.append(heading, cell)
    responseBody.append(row)
  }

  responseJson.textContent = JSON.stringify(info, null, 2)
  responseSection.hidden = false
}

function describeFailure(error) {
  if (error instanceof NwcHarnessError) {
    return error.message
  }

  const code =
    typeof error?.code === 'string' ? error.code.toUpperCase() : ''
  if (SAFE_WALLET_CODES.has(code)) {
    return `The wallet returned ${code}. No sensitive details are displayed.`
  }

  if (typeof error?.name === 'string' && /timeout/i.test(error.name)) {
    return 'No get_info response arrived before the wallet timeout. No sensitive details are displayed.'
  }

  return 'The connection attempt failed. No connection URI or secret was logged. Check the fresh Coinos connection and the approved relay, then try again.'
}

/**
 * The SDK logs the caught error from getInfo through console.error. Suppress
 * console output for the duration of the request so a failure cannot print the
 * SDK error object, relay metadata, or connection details into DevTools.
 */
async function requestGetInfo(nwcClient) {
  const methods = ['log', 'info', 'warn', 'error', 'debug']
  const originals = new Map()
  const noop = () => {}

  for (const method of methods) {
    originals.set(method, console[method])
    console[method] = noop
  }

  try {
    return await nwcClient.getInfo()
  } finally {
    for (const method of methods) {
      console[method] = originals.get(method)
    }
  }
}

async function onConnect(event) {
  event.preventDefault()
  if (busy) return

  const myAttempt = ++attempt
  let raw = input.value
  input.value = ''

  if (raw.trim() === '') {
    setStatus('error', 'Enter a fresh Coinos NWC connection URI.')
    return
  }

  setBusy(true)
  clearResponse()

  let parsed = null
  let secret = ''

  try {
    setStatus('connecting', 'Validating the connection URI locally...')
    parsed = parseNwcUri(raw)
    raw = ''

    if (myAttempt !== attempt) return

    secret = parsed.secret
    parsed.secret = ''

    setStatus(
      'connecting',
      `Connecting to ${parsed.relay} and requesting only get_info...`,
    )

    client = new NWCClient({
      walletPubkey: parsed.walletPubkey,
      relayUrls: [parsed.relay],
      secret,
      requireSecret: true,
    })
    secret = ''

    const info = await requestGetInfo(client)
    if (myAttempt !== attempt) return

    const safeInfo = sanitizeGetInfoResponse(info)
    if (myAttempt !== attempt) return

    renderResponse(safeInfo)
    setStatus(
      'verified',
      `Wallet answered get_info at ${new Date().toLocaleTimeString()}. The fields below are the wallet-reported values.`,
    )
  } catch (error) {
    if (myAttempt !== attempt) return

    if (client) {
      try {
        client.close()
      } catch {
        // The client is discarded below regardless.
      }
      client = null
    }

    clearResponse()
    setStatus('error', describeFailure(error))
  } finally {
    raw = ''
    secret = ''
    if (parsed) parsed.secret = ''

    if (myAttempt === attempt) {
      setBusy(false)
    }
  }
}

function disconnect(announce = true) {
  attempt += 1

  if (client) {
    try {
      client.close()
    } catch {
      // The client is discarded below regardless.
    }
    client = null
  }

  input.value = ''
  clearResponse()
  setBusy(false)

  if (announce) {
    setStatus(
      'disconnected',
      'Disconnected. The input, client reference, parsed connection data, and displayed response were cleared. Revoke the connection in Coinos if you no longer need it.',
    )
  } else {
    setStatus('idle', 'No connection. The page has not contacted a wallet.')
  }
}

form.addEventListener('submit', onConnect)
disconnectButton.addEventListener('click', () => disconnect(true))

window.addEventListener('pagehide', () => disconnect(false))
window.addEventListener('pageshow', (event) => {
  if (event.persisted) disconnect(false)
})
