import type { ServerEvents } from './server'
import type { UpdateInfo } from '../../ipc/types'

export class AppUpdater {
  private _checkedAtStartup = false
  private _info: UpdateInfo = { state: 'initial' }

  public readonly noAutoUpdatesReason:
    Extract<UpdateInfo, { state: 'update-available' }>['noDownloadReason'] = null

  get info () { return this._info }
  set info (info: UpdateInfo) {
    this._info = info
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::updater-state',
      payload: info
    })
  }

  // FORK NOTE (Neoniklain): upstream auto-update is disabled in this fork.
  // Otherwise a new official release would download and silently replace
  // this build with the stock app, losing the fork's changes.
  constructor (
    private server: ServerEvents
  ) {
    this.info = { state: 'update-not-available', checkedAt: Date.now() }
  }

  checkAtStartup () {
    this._checkedAtStartup = true
  }

  private check = async () => { /* disabled in fork */ }
}
