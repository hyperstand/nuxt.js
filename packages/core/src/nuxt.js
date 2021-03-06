
import isPlainObject from 'lodash/isPlainObject'
import consola from 'consola'

import { Hookable, defineAlias } from '@nuxt/common'
import { getNuxtConfig } from '@nuxt/config'
import { Server } from '@nuxt/server'

import { version } from '../package.json'
import ModuleContainer from './module'
import Resolver from './resolver'

export default class Nuxt extends Hookable {
  constructor(options = {}) {
    super()

    // Assign options and apply defaults
    this.options = getNuxtConfig(options)

    // Create instance of core components
    this.resolver = new Resolver(this)
    this.moduleContainer = new ModuleContainer(this)
    this.server = new Server(this)

    // Deprecated hooks
    this._deprecatedHooks = {
      'render:context': 'render:routeContext' // #3773
    }

    // Add Legacy aliases
    this.renderer = this.server
    this.render = this.server.app
    defineAlias(this, this.server, [ 'renderRoute', 'renderAndGetWindow', 'showReady', 'listen' ])
    defineAlias(this, this.resolver, [ 'resolveAlias', 'resolvePath' ])

    // Wait for Nuxt to be ready
    this.initialized = false
    this._ready = this.ready().catch((err) => {
      consola.fatal(err)
    })
  }

  static get version() {
    return version
  }

  async ready() {
    if (this._ready) {
      return this._ready
    }

    // Add hooks
    if (isPlainObject(this.options.hooks)) {
      this.addHooks(this.options.hooks)
    } else if (typeof this.options.hooks === 'function') {
      this.options.hooks(this.hook)
    }

    // Await for modules
    await this.moduleContainer.ready()

    // Await for server to be ready
    await this.server.ready()

    this.initialized = true

    // Call ready hook
    await this.callHook('ready', this)

    return this
  }

  async close(callback) {
    await this.callHook('close', this)

    /* istanbul ignore if */
    if (typeof callback === 'function') {
      await callback()
    }
  }
}
