import { arrayOf, stringOf } from '../../lib/record.js'
import type { UsbDevice } from './sysfs.js'

// usb.devices as the menu reads and filters it.

const DEVICE_ICONS: Record<string, string> = {
  e0: 'bluetooth-symbolic',
  '01': 'audio-card-symbolic',
  '0e': 'camera-web-symbolic',
}
const DEFAULT_ICON = 'drive-removable-media-symbolic'

export function devicesOf(value: unknown): UsbDevice[] {
  return arrayOf(value).map((record) => ({
    id: stringOf(record.id),
    name: stringOf(record.name),
    vendor: stringOf(record.vendor),
    vendorId: stringOf(record.vendorId),
    productId: stringOf(record.productId),
    serial: stringOf(record.serial),
    speed: stringOf(record.speed),
    power: stringOf(record.power),
    deviceClass: stringOf(record.deviceClass),
  }))
}

export function matchingDevices(devices: UsbDevice[], query: string): UsbDevice[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') {
    return devices
  }
  return devices.filter((device) => searchTextOf(device).includes(needle))
}

export function iconOf(device: UsbDevice): string {
  const icon = DEVICE_ICONS[device.deviceClass]
  if (icon === undefined) {
    return DEFAULT_ICON
  }
  return icon
}

// "Vendor · 1234:abcd"; either half alone when the other is missing.
export function detailOf(device: UsbDevice): string {
  const identifier = identifierOf(device)
  if (device.vendor === '') {
    return identifier
  }
  if (identifier === '') {
    return device.vendor
  }
  return `${device.vendor} · ${identifier}`
}

function identifierOf(device: UsbDevice): string {
  if (device.vendorId === '' || device.productId === '') {
    return ''
  }
  return `${device.vendorId}:${device.productId}`
}

function searchTextOf(device: UsbDevice): string {
  return [device.name, device.vendor, device.serial, identifierOf(device)].join(' ').toLowerCase()
}
