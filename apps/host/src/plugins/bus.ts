import type { Plugin } from '@neoshell/kernel'
import { Bus } from '../bus.js'

export const busPlugin: Plugin = {
  name: 'bus',
  apply(context) {
    context.provide('bus', new Bus())
  },
}
