import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
  type IBorderOptions,
  type IRunOptions
} from 'docx'
import { getApi } from './platform'

const FONT = 'Microsoft JhengHei'
const MONO = 'Consolas'
const INK = '1C2B22'
const FOREST = '2F5D45'
const HEADER_TEXT = 'F7F3EA'
const ROW_ALT = 'F3F7F3'
const SHEET = 'FFFDF8'
const LINE = 'C5D3C8'
const PAGE_WIDTH_PX = 620

const thinBorder: IBorderOptions = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: LINE
}

const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder
}

type RunStyle = {
  bold?: boolean
  italics?: boolean
  strike?: boolean
  code?: boolean
  color?: string
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function alignmentOf(el: Element): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const raw = (el.getAttribute('align') || (el as HTMLElement).style.textAlign || '').toLowerCase()
  if (raw === 'center') return AlignmentType.CENTER
  if (raw === 'right') return AlignmentType.RIGHT
  if (raw === 'left') return AlignmentType.LEFT
  return undefined
}

function collectRuns(root: Element, inherited: RunStyle = {}): TextRun[] {
  const runs: TextRun[] = []

  const walk = (node: Node, style: RunStyle): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (!text) return
      const options: IRunOptions = {
        text,
        font: style.code ? MONO : FONT,
        size: style.code ? 18 : 22,
        bold: style.bold,
        italics: style.italics,
        strike: style.strike,
        color: style.color ?? INK
      }
      runs.push(new TextRun(options))
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'br') {
      runs.push(new TextRun({ break: 1 }))
      return
    }
    if (tag === 'input') return
    const next: RunStyle = { ...style }
    if (tag === 'strong' || tag === 'b') next.bold = true
    if (tag === 'em' || tag === 'i') next.italics = true
    if (tag === 's' || tag === 'del') next.strike = true
    if (tag === 'code') next.code = true
    if (tag === 'a') next.color = FOREST
    el.childNodes.forEach((child) => walk(child, next))
  }

  root.childNodes.forEach((child) => walk(child, inherited))
  if (runs.length === 0) {
    const text = (root.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text) {
      runs.push(
        new TextRun({
          text,
          font: FONT,
          size: 22,
          bold: inherited.bold,
          color: inherited.color ?? INK
        })
      )
    }
  }
  return runs
}

function headingLevel(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  if (tag === 'h1') return HeadingLevel.HEADING_1
  if (tag === 'h2') return HeadingLevel.HEADING_2
  if (tag === 'h3') return HeadingLevel.HEADING_3
  if (tag === 'h4') return HeadingLevel.HEADING_4
  if (tag === 'h5') return HeadingLevel.HEADING_5
  return HeadingLevel.HEADING_6
}

function convertTable(table: HTMLTableElement): Table {
  const trs = [...table.querySelectorAll('tr')]
  const colCount = Math.max(
    ...trs.map((tr) => [...tr.children].filter((c) => c.tagName === 'TH' || c.tagName === 'TD').length),
    1
  )
  const colWidth = Math.floor(5000 / colCount)

  let bodyIndex = 0
  const rows = trs.map((tr) => {
    const isHeader = Boolean(tr.closest('thead')) || [...tr.children].every((c) => c.tagName === 'TH')
    if (!isHeader) bodyIndex += 1
    const fill = isHeader ? FOREST : bodyIndex % 2 === 0 ? ROW_ALT : SHEET
    const cells = [...tr.children].filter((c) => c.tagName === 'TH' || c.tagName === 'TD')
    return new TableRow({
      cantSplit: true,
      tableHeader: isHeader,
      children: cells.map((cell) => {
        const align = alignmentOf(cell)
        return new TableCell({
          borders: cellBorders,
          width: { size: colWidth, type: WidthType.PERCENTAGE },
          shading: {
            type: ShadingType.CLEAR,
            fill
          },
          children: [
            new Paragraph({
              alignment: align,
              children: collectRuns(cell, isHeader ? { bold: true, color: HEADER_TEXT } : {})
            })
          ]
        })
      })
    })
  })

  return new Table({
    width: { size: 5000, type: WidthType.PERCENTAGE },
    rows
  })
}

function prepareMermaidSvg(el: HTMLElement): { html: string; width: number; height: number } {
  const svg = el.querySelector('svg') ?? (el.tagName.toLowerCase() === 'svg' ? (el as unknown as SVGElement) : null)
  if (!svg) throw new Error('找不到 Mermaid SVG')

  const clone = svg.cloneNode(true) as SVGElement
  const box = svg.getBoundingClientRect()
  const vb = svg.viewBox?.baseVal
  let width = Math.ceil(Math.max(box.width, vb?.width || 0, 240))
  let height = Math.ceil(Math.max(box.height, vb?.height || 0, 160))
  const maxEdge = 1400
  const fit = Math.min(1, maxEdge / width, maxEdge / height)
  width = Math.max(80, Math.round(width * fit))
  height = Math.max(80, Math.round(height * fit))

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.style.maxWidth = 'none'
  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  return { html: clone.outerHTML, width, height }
}

async function svgToPng(svg: SVGElement): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const prepared = prepareMermaidSvg(svg as unknown as HTMLElement)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG 轉圖失敗'))
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(prepared.html)
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(prepared.width * 2)
  canvas.height = Math.ceil(prepared.height * 2)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立畫布')
  ctx.fillStyle = '#fffdf8'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { bytes: dataUrlToBytes(canvas.toDataURL('image/png')), width: prepared.width, height: prepared.height }
}

async function rasterize(el: HTMLElement): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const prepared = prepareMermaidSvg(el)
  try {
    const shot = await getApi().rasterizeHtml(prepared.html, prepared.width, prepared.height)
    if (shot?.dataUrl?.startsWith('data:image')) {
      return {
        bytes: dataUrlToBytes(shot.dataUrl),
        width: shot.width || prepared.width,
        height: shot.height || prepared.height
      }
    }
  } catch {
    // fall through to canvas
  }
  const svg = el.querySelector('svg')
  if (svg) return svgToPng(svg)
  throw new Error('無法擷取流程圖')
}

function imageParagraph(bytes: Uint8Array, width: number, height: number): Paragraph {
  const scale = Math.min(1, PAGE_WIDTH_PX / width)
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [
      new ImageRun({
        type: 'png',
        data: bytes,
        transformation: { width: w, height: h }
      })
    ]
  })
}

type ConvertCtx = { quote?: boolean }

function paragraphOpts(quote: boolean | undefined, options: ConstructorParameters<typeof Paragraph>[0]) {
  if (!quote || typeof options === 'string' || !options) return options
  return {
    ...options,
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: FOREST, space: 10 }
    },
    indent: { left: 240 },
    shading: { type: ShadingType.CLEAR, fill: 'F7F0E2' }
  }
}

async function convertNode(el: Element, ctx: ConvertCtx = {}): Promise<FileChild[]> {
  const tag = el.tagName.toLowerCase()

  if (el.classList.contains('mermaid-svg') || el.classList.contains('mermaid-source')) {
    try {
      const shot = await rasterize(el as HTMLElement)
      return [imageParagraph(shot.bytes, shot.width, shot.height)]
    } catch {
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: el.textContent?.trim() || '[Mermaid 圖無法寫入 Word]',
              italics: true,
              color: '9B3A2F',
              font: FONT,
              size: 20
            })
          ]
        })
      ]
    }
  }

  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
    return [
      new Paragraph(
        paragraphOpts(ctx.quote, {
          heading: headingLevel(tag),
          spacing: { before: tag === 'h1' ? 80 : 240, after: 120 },
          children: collectRuns(el, { bold: true, color: '214233' })
        })
      )
    ]
  }

  if (tag === 'p') {
    const runs = collectRuns(el)
    if (runs.length === 0) return []
    return [
      new Paragraph(
        paragraphOpts(ctx.quote, {
          spacing: { after: 160 },
          children: runs
        })
      )
    ]
  }

  if (tag === 'blockquote') {
    const inner: FileChild[] = []
    for (const child of [...el.children]) {
      inner.push(...(await convertNode(child, { quote: true })))
    }
    if (inner.length === 0) {
      inner.push(
        new Paragraph(
          paragraphOpts(true, {
            children: collectRuns(el)
          })
        )
      )
    }
    return inner
  }

  if (tag === 'ul' || tag === 'ol') {
    const ref = tag === 'ol' ? 'numbers' : 'bullets'
    const items: FileChild[] = []
    for (const child of [...el.children]) {
      if (child.tagName.toLowerCase() !== 'li') continue
      const checkbox = child.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      const prefix = checkbox ? (checkbox.checked ? '☑ ' : '☐ ') : ''
      const nested = [...child.children].filter((c) => c.tagName === 'UL' || c.tagName === 'OL')
      const clone = child.cloneNode(true) as Element
      clone.querySelectorAll('ul, ol, input').forEach((n) => n.remove())
      const runs = collectRuns(clone)
      items.push(
        new Paragraph({
          numbering: { reference: ref, level: 0 },
          spacing: { after: 60 },
          children: prefix
            ? [new TextRun({ text: prefix, font: FONT, size: 22 }), ...runs]
            : runs
        })
      )
      for (const nest of nested) {
        items.push(...(await convertNode(nest, ctx)))
      }
    }
    return items
  }

  if (tag === 'pre') {
    const text = el.textContent ?? ''
    return [
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: '1C2420' },
        spacing: { before: 120, after: 160 },
        children: text.split('\n').flatMap((line, index) => [
          ...(index === 0 ? [] : [new TextRun({ break: 1 })]),
          new TextRun({
            text: line.length ? line : ' ',
            font: MONO,
            size: 18,
            color: 'E7EFE8'
          })
        ])
      })
    ]
  }

  if (tag === 'table') {
    return [
      convertTable(el as HTMLTableElement),
      new Paragraph({ spacing: { after: 160 }, children: [] })
    ]
  }

  if (tag === 'hr') {
    return [
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D4CBB8', space: 1 }
        },
        spacing: { before: 160, after: 160 }
      })
    ]
  }

  if (tag === 'img') {
    const src = el.getAttribute('src')
    if (src?.startsWith('data:image/')) {
      const bytes = dataUrlToBytes(src)
      const width = Number((el as HTMLImageElement).naturalWidth || 400)
      const height = Number((el as HTMLImageElement).naturalHeight || 240)
      return [imageParagraph(bytes, width, height)]
    }
    return []
  }

  const nested: FileChild[] = []
  for (const child of [...el.children]) {
    nested.push(...(await convertNode(child, ctx)))
  }
  if (nested.length) return nested
  const runs = collectRuns(el)
  if (!runs.length) return []
  return [new Paragraph({ children: runs, spacing: { after: 120 } })]
}

export async function buildDocxFromPreview(): Promise<ArrayBuffer> {
  const root = document.querySelector('.preview-frame')
  if (!root) throw new Error('找不到預覽內容')

  const children: FileChild[] = []
  for (const child of [...root.children]) {
    children.push(...(await convertNode(child)))
  }

  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '（空白文件）', font: FONT, size: 22, color: INK })]
      })
    )
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 22,
            color: INK
          }
        }
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickStyle: true,
          paragraph: { spacing: { before: 120, after: 160 } },
          run: { font: FONT, size: 36, bold: true, color: '214233' }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickStyle: true,
          paragraph: { spacing: { before: 240, after: 120 } },
          run: { font: FONT, size: 28, bold: true, color: '214233' }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickStyle: true,
          run: { font: FONT, size: 24, bold: true, color: '214233' }
        }
      ]
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
            }
          ]
        },
        {
          reference: 'numbers',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
            }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  })

  const blob = await Packer.toBlob(doc)
  return blob.arrayBuffer()
}
