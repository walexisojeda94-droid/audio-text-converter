"use client"

/**
 * Extracts plain-text paragraphs from an uploaded book file.
 * Supports: .pdf, .docx, .epub, .txt
 */

export type SupportedExt = "pdf" | "docx" | "epub" | "txt"

export interface ExtractedBook {
  title: string
  paragraphs: string[]
}

export function detectExt(fileName: string): SupportedExt | null {
  const ext = fileName.toLowerCase().split(".").pop() ?? ""
  if (ext === "pdf") return "pdf"
  if (ext === "docx") return "docx"
  if (ext === "epub") return "epub"
  if (ext === "txt") return "txt"
  return null
}

/** Splits raw text into clean, reasonably-sized reading paragraphs. */
function splitParagraphs(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|\n(?=\s*[A-ZÁÉÍÓÚÑ])/) // blank lines, or newline followed by a capital (heuristic for PDF line-wraps)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0)
}

async function extractPdf(file: File): Promise<ExtractedBook> {
  const pdfjsLib = await import("pdfjs-dist")
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

  const buf = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buf }).promise

  const pageTexts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let line = ""
    let lastY: number | null = null
    const lines: string[] = []
    for (const item of content.items as any[]) {
      if (!("str" in item)) continue
      const y = item.transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        lines.push(line)
        line = ""
      }
      line += item.str
      lastY = y
    }
    if (line) lines.push(line)
    pageTexts.push(lines.join("\n"))
  }

  const title = file.name.replace(/\.pdf$/i, "")
  const paragraphs = splitParagraphs(pageTexts.join("\n\n"))
  return { title, paragraphs }
}

async function extractDocx(file: File): Promise<ExtractedBook> {
  const mammoth = await import("mammoth")
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  const title = file.name.replace(/\.docx$/i, "")
  const paragraphs = splitParagraphs(result.value)
  return { title, paragraphs }
}

async function extractEpub(file: File): Promise<ExtractedBook> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(file)

  // 1. Find the OPF (package) file via container.xml
  const containerXml = await zip
    .file("META-INF/container.xml")
    ?.async("string")
  if (!containerXml) throw new Error("EPUB inválido: falta container.xml")

  const parser = new DOMParser()
  const containerDoc = parser.parseFromString(containerXml, "application/xml")
  const opfPath = containerDoc
    .querySelector("rootfile")
    ?.getAttribute("full-path")
  if (!opfPath) throw new Error("EPUB inválido: no se encontró el archivo OPF")

  const opfDir = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : ""

  const opfXml = await zip.file(opfPath)?.async("string")
  if (!opfXml) throw new Error("EPUB inválido: no se pudo leer el OPF")
  const opfDoc = parser.parseFromString(opfXml, "application/xml")

  // Title from metadata
  const title =
    opfDoc.querySelector("metadata > title")?.textContent?.trim() ||
    file.name.replace(/\.epub$/i, "")

  // 2. Build manifest id -> href map
  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"))
  const idToHref = new Map<string, string>()
  for (const item of manifestItems) {
    const id = item.getAttribute("id")
    const href = item.getAttribute("href")
    if (id && href) idToHref.set(id, href)
  }

  // 3. Reading order from spine
  const spineRefs = Array.from(
    opfDoc.querySelectorAll("spine > itemref"),
  )
    .map((ref) => ref.getAttribute("idref"))
    .filter((id): id is string => !!id)

  const htmlParser = new DOMParser()
  const paragraphs: string[] = []

  for (const idref of spineRefs) {
    const href = idToHref.get(idref)
    if (!href) continue
    const fullPath = opfDir + href
    const chapterHtml = await zip.file(fullPath)?.async("string")
    if (!chapterHtml) continue

    const chapterDoc = htmlParser.parseFromString(chapterHtml, "text/html")
    const blocks = chapterDoc.querySelectorAll(
      "p, h1, h2, h3, h4, li, blockquote",
    )
    if (blocks.length === 0) {
      const text = chapterDoc.body?.textContent?.trim()
      if (text) paragraphs.push(...splitParagraphs(text))
      continue
    }
    for (const block of Array.from(blocks)) {
      const text = block.textContent?.replace(/\s+/g, " ").trim()
      if (text) paragraphs.push(text)
    }
  }

  return { title, paragraphs }
}

async function extractTxt(file: File): Promise<ExtractedBook> {
  const raw = await file.text()
  const title = file.name.replace(/\.txt$/i, "")
  return { title, paragraphs: splitParagraphs(raw) }
}

export async function extractBook(file: File): Promise<ExtractedBook> {
  const ext = detectExt(file.name)
  if (!ext) {
    throw new Error(
      "Formato no soportado. Usa PDF, Word (.docx), EPUB o TXT.",
    )
  }
  switch (ext) {
    case "pdf":
      return extractPdf(file)
    case "docx":
      return extractDocx(file)
    case "epub":
      return extractEpub(file)
    case "txt":
      return extractTxt(file)
  }
}
