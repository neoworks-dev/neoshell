import { joinPath, readDirectory, readTextFile } from '../../gjs/fs.js'

// USB devices as /sys/bus/usb/devices describes them. Entries named
// "<bus>-<port>" are devices, "usbN" are root hubs, and anything with a colon
// is an interface of a device.

export interface UsbDevice {
  // The sysfs name, e.g. "1-12.3".
  id: string
  name: string
  vendor: string
  vendorId: string
  productId: string
  serial: string
  speed: string
  power: string
  // bDeviceClass as two hex digits.
  deviceClass: string
}

export const USB_ROOT = '/sys/bus/usb/devices'

const HUB_CLASS = '09'
const UNKNOWN_NAME = 'USB device'

export function readUsbDevices(root: string): UsbDevice[] {
  const devices: UsbDevice[] = []
  for (const entry of deviceEntries(root)) {
    const device = readUsbDevice(root, entry)
    if (device !== null && device.deviceClass !== HUB_CLASS) {
      devices.push(device)
    }
  }
  return devices
}

function deviceEntries(root: string): string[] {
  return readDirectory(root)
    .filter((entry) => !entry.includes(':'))
    .map((entry) => ({ entry, order: orderOf(root, entry) }))
    .sort((first, second) => first.order - second.order)
    .map((sorted) => sorted.entry)
}

export function speedLabel(megabitsText: string): string {
  const megabits = Number.parseFloat(megabitsText)
  if (Number.isNaN(megabits)) {
    return ''
  }
  if (megabits >= 5000) {
    return `USB 3.x @ ${megabitsText} Mb/s`
  }
  if (megabits >= 480) {
    return `USB 2.0 @ ${megabitsText} Mb/s`
  }
  if (megabits >= 12) {
    return `USB 1.1 @ ${megabitsText} Mb/s`
  }
  return `USB 1.0 @ ${megabitsText} Mb/s`
}

// bMaxPower reads "500mA"; a hub-powered or unreported 0 mA says nothing.
export function powerLabel(raw: string): string {
  const milliamps = Number.parseInt(raw, 10)
  if (Number.isNaN(milliamps) || milliamps <= 0) {
    return ''
  }
  return `${milliamps} mA`
}

function readUsbDevice(root: string, entry: string): UsbDevice | null {
  const directory = joinPath(root, entry)
  const deviceClass = attributeOf(directory, 'bDeviceClass')
  if (deviceClass === '') {
    return null
  }
  const product = attributeOf(directory, 'product')
  return {
    id: entry,
    name: nameOf(product),
    vendor: attributeOf(directory, 'manufacturer'),
    vendorId: attributeOf(directory, 'idVendor'),
    productId: attributeOf(directory, 'idProduct'),
    serial: attributeOf(directory, 'serial'),
    speed: speedLabel(attributeOf(directory, 'speed')),
    power: powerLabel(attributeOf(directory, 'bMaxPower')),
    deviceClass,
  }
}

function nameOf(product: string): string {
  if (product === '') {
    return UNKNOWN_NAME
  }
  return product
}

// Bus number first, then the kernel's device number on that bus.
function orderOf(root: string, entry: string): number {
  const directory = joinPath(root, entry)
  const bus = Number.parseInt(attributeOf(directory, 'busnum'), 10)
  const device = Number.parseInt(attributeOf(directory, 'devnum'), 10)
  if (Number.isNaN(bus) || Number.isNaN(device)) {
    return Number.MAX_SAFE_INTEGER
  }
  return bus * 1000 + device
}

function attributeOf(directory: string, attribute: string): string {
  const raw = readTextFile(joinPath(directory, attribute))
  if (raw === null) {
    return ''
  }
  return raw.trim()
}
