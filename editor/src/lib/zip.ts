import type { QuestlineExportFile } from './questlineExport'

const encoder = new TextEncoder()

let crcTable: Uint32Array | null = null

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let current = index
    for (let bit = 0; bit < 8; bit += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1
    }
    table[index] = current >>> 0
  }
  crcTable = table
  return table
}

function crc32(bytes: Uint8Array): number {
  const table = getCrcTable()
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosTime(date = new Date()): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const packedDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: packedDate }
}

function writeHeader(signature: number, values: number[], length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, signature, true)
  let offset = 4
  for (const value of values) {
    view.setUint16(offset, value, true)
    offset += 2
  }
  return bytes
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const output = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

export function createZipBlob(files: QuestlineExportFile[]): Blob {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  const stamp = dosTime()

  for (const file of files) {
    const nameBytes = encoder.encode(file.path.replace(/\\/g, '/'))
    const contentBytes = encoder.encode(file.content)
    const crc = crc32(contentBytes)

    const localHeader = writeHeader(
      0x04034b50,
      [
        20,
        0x0800,
        0,
        stamp.time,
        stamp.date,
        crc & 0xffff,
        crc >>> 16,
        contentBytes.byteLength & 0xffff,
        contentBytes.byteLength >>> 16,
        contentBytes.byteLength & 0xffff,
        contentBytes.byteLength >>> 16,
        nameBytes.byteLength,
        0,
      ],
      30,
    )
    localParts.push(localHeader, nameBytes, contentBytes)

    const centralHeader = writeHeader(
      0x02014b50,
      [
        20,
        20,
        0x0800,
        0,
        stamp.time,
        stamp.date,
        crc & 0xffff,
        crc >>> 16,
        contentBytes.byteLength & 0xffff,
        contentBytes.byteLength >>> 16,
        contentBytes.byteLength & 0xffff,
        contentBytes.byteLength >>> 16,
        nameBytes.byteLength,
        0,
        0,
        0,
        0,
        0,
        0,
        offset & 0xffff,
        offset >>> 16,
      ],
      46,
    )
    centralParts.push(centralHeader, nameBytes)
    offset += localHeader.byteLength + nameBytes.byteLength + contentBytes.byteLength
  }

  const centralOffset = offset
  const centralDirectory = concat(centralParts)
  const end = writeHeader(
    0x06054b50,
    [
      0,
      0,
      files.length,
      files.length,
      centralDirectory.byteLength & 0xffff,
      centralDirectory.byteLength >>> 16,
      centralOffset & 0xffff,
      centralOffset >>> 16,
      0,
    ],
    22,
  )

  const bytes = concat([...localParts, centralDirectory, end])
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([arrayBuffer], { type: 'application/zip' })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
