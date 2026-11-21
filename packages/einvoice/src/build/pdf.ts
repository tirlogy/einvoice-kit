// SPDX-License-Identifier: MIT
import fontkit from '@pdf-lib/fontkit';
import {
  AFRelationship,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
import { formatMoney, formatNumber } from '../decimal';
import { documentTitle, label, unitName, type Lang } from '../labels';
import type { Invoice, Party } from '../model';
import { looksLikeLeitwegId } from '../validate/plausibility';
import { escapeXml } from '../xml';
import { buildCii } from './cii';
import { SRGB_ICC } from './icc';

export type PdfLayout = 'classic' | 'modern';
export type PdfProfile = 'EN 16931' | 'XRECHNUNG';

export interface PdfOptions {
  /** TrueType fonts to embed (PDF/A forbids the standard 14 fonts). */
  fonts: { regular: Uint8Array; bold: Uint8Array };
  layout?: PdfLayout;
  /** PNG or JPEG logo for the visual representation. */
  logo?: Uint8Array;
  /** Accent colour as hex `#RRGGBB` (modern layout). */
  accentColor?: string;
  lang?: Lang;
  /** `EN 16931` embeds `factur-x.xml`, `XRECHNUNG` embeds `xrechnung.xml`. */
  profile?: PdfProfile;
  /** Pre-built CII XML; built from the invoice when omitted. */
  xml?: string;
  /** Fixed creation date (reproducible output in tests). */
  creationDate?: Date;
  /** Marks a 381 document as cancellation (Storno) in the title. */
  cancellation?: boolean;
}

const A4: [number, number] = [595.28, 841.89];
const M = 50; // page margin
const FOOT = 70; // footer height

const hex = (s: string | undefined, fallback: RGB): RGB => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s ?? '');
  return m ? rgb(parseInt(m[1]!, 16) / 255, parseInt(m[2]!, 16) / 255, parseInt(m[3]!, 16) / 255) : fallback;
};

const fmtDate = (iso: string | undefined, lang: Lang) => {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-');
  return lang === 'en' ? `${y}-${mo}-${d}` : `${d}.${mo}.${y}`;
};

const localeOf = (lang: Lang) => ({ de: 'de-DE', en: 'en-GB', tr: 'tr-TR' })[lang];

/** Word wraps text to a maximum width. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      // hard-break very long words
      let w = word;
      while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
        let i = w.length - 1;
        while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
        out.push(w.slice(0, i));
        w = w.slice(i);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}

class Writer {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    readonly onNewPage: (w: Writer) => void,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - M;
    this.onNewPage(this);
  }
  ensure(height: number) {
    if (this.y - height < M + FOOT) this.newPage();
  }
  text(s: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'right'; width?: number } = {}) {
    const size = opts.size ?? 9;
    const font = opts.bold ? this.bold : this.regular;
    const w = font.widthOfTextAtSize(s, size);
    const dx = opts.align === 'right' ? (opts.width ?? 0) - w : 0;
    this.page.drawText(s, { x: x + dx, y, size, font, color: opts.color ?? rgb(0.1, 0.1, 0.12) });
  }
}

function partyLines(p: Party): string[] {
  const a = p.address;
  return [
    p.name,
    p.contact?.name && p.contact.name !== p.name ? p.contact.name : undefined,
    a.line1,
    a.line2,
    a.line3,
    [a.postcode, a.city].filter(Boolean).join(' '),
    a.country && a.country !== 'DE' ? a.country : undefined,
  ].filter((x): x is string => !!x);
}

function xmp(inv: Invoice, title: string, opts: { fileName: string; level: string; date: Date; producer: string; creator: string }): string {
  const iso = opts.date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const e = escapeXml;
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${e(title)}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>${e(inv.seller.name)}</rdf:li></rdf:Seq></dc:creator>
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${e(`${title} ${inv.number}`)}</rdf:li></rdf:Alt></dc:description>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>${e(opts.producer)}</pdf:Producer>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreatorTool>${e(opts.creator)}</xmp:CreatorTool>
      <xmp:CreateDate>${iso}</xmp:CreateDate>
      <xmp:ModifyDate>${iso}</xmp:ModifyDate>
      <xmp:MetadataDate>${iso}</xmp:MetadataDate>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
${['DocumentFileName:The name of the embedded XML document', 'DocumentType:The type of the hybrid document in capital letters, e.g. INVOICE or ORDER', 'Version:The actual version of the standard applying to the embedded XML document', 'ConformanceLevel:The conformance level of the embedded XML document']
  .map((p) => {
    const [name, desc] = p.split(/:(.*)/s) as [string, string];
    return `                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>${name}</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>${desc}</pdfaProperty:description>
                </rdf:li>`;
  })
  .join('\n')}
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>${opts.fileName}</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>${opts.level}</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

async function embedLogo(doc: PDFDocument, bytes: Uint8Array | undefined): Promise<PDFImage | undefined> {
  if (!bytes?.length) return undefined;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (isPng) return doc.embedPng(bytes);
  if (isJpg) return doc.embedJpg(bytes);
  return undefined;
}

/**
 * Builds a ZUGFeRD 2.x / Factur-X hybrid invoice: a PDF/A-3b document with a
 * human readable rendering and the CII XML embedded as `factur-x.xml`
 * (or `xrechnung.xml` for the XRECHNUNG profile).
 */
export async function buildZugferdPdf(inv: Invoice, opts: PdfOptions): Promise<Uint8Array> {
  const lang = opts.lang ?? 'de';
  const locale = localeOf(lang);
  const layout = opts.layout ?? 'classic';
  const accent = hex(opts.accentColor, rgb(0.11, 0.33, 0.62));
  const muted = rgb(0.38, 0.4, 0.45);
  const date = opts.creationDate ?? new Date();
  const profile = opts.profile ?? 'EN 16931';
  const fileName = profile === 'XRECHNUNG' ? 'xrechnung.xml' : 'factur-x.xml';
  const xml = opts.xml ?? buildCii(inv);
  const money = (v: string | undefined) => formatMoney(v, inv.currency, locale);
  const L = (k: Parameters<typeof label>[1], vars?: Record<string, string>) => label(lang, k, vars);
  const title = documentTitle(inv.typeCode, lang, opts.cancellation);

  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(opts.fonts.regular, { subset: true });
  const bold = await doc.embedFont(opts.fonts.bold, { subset: true });
  const logo = await embedLogo(doc, opts.logo);
  const width = A4[0] - 2 * M;
  const s = inv.seller;

  const footer = [
    [s.name, s.address.line1, [s.address.postcode, s.address.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    [s.vatId && `${L('vatId')} ${s.vatId}`, s.taxNumber && `${L('taxNumber')} ${s.taxNumber}`, s.contact?.email, s.contact?.phone]
      .filter(Boolean)
      .join(' · '),
    inv.payment?.creditTransfers[0]
      ? `IBAN ${inv.payment.creditTransfers[0].iban}${inv.payment.creditTransfers[0].bic ? ` · BIC ${inv.payment.creditTransfers[0].bic}` : ''}`
      : '',
  ].filter(Boolean);

  const w = new Writer(doc, regular, bold, (wr) => {
    if (layout === 'modern') {
      wr.page.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: accent });
    }
    if (wr.pages.length > 1) {
      wr.text(`${title} ${inv.number}`, M, A4[1] - M + 10, { size: 8, color: muted });
      wr.y = A4[1] - M - 10;
    }
  });

  // ---- header
  const top = A4[1] - M;
  if (logo) {
    const scale = Math.min(140 / logo.width, 50 / logo.height, 1);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    w.page.drawImage(logo, { x: layout === 'modern' ? M : A4[0] - M - lw, y: top - lh + 10, width: lw, height: lh });
  }
  const nameX = layout === 'modern' && logo ? M + 150 : M;
  if (layout === 'modern') {
    w.text(s.name, nameX, top - 10, { size: 16, bold: true, color: accent });
  } else {
    w.text(s.name, M, top - 10, { size: 14, bold: true });
  }
  w.y = top - 80;

  // sender line + buyer address
  const senderLine = [s.name, s.address.line1, [s.address.postcode, s.address.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');
  w.text(wrap(senderLine, regular, 7, 250)[0] ?? '', M, w.y, { size: 7, color: muted });
  let ay = w.y - 16;
  for (const l of partyLines(inv.buyer)) {
    w.text(l, M, ay, { size: 10 });
    ay -= 13;
  }

  // meta box (right)
  const meta: [string, string][] = [
    [L('number'), inv.number],
    [L('date'), fmtDate(inv.issueDate, lang)],
    inv.delivery?.date ? [L('deliveryDate'), fmtDate(inv.delivery.date, lang)] : undefined,
    inv.invoicingPeriod?.start || inv.invoicingPeriod?.end
      ? [L('period'), `${fmtDate(inv.invoicingPeriod.start, lang)} – ${fmtDate(inv.invoicingPeriod.end, lang)}`]
      : undefined,
    inv.dueDate ? [L('dueDate'), fmtDate(inv.dueDate, lang)] : undefined,
    inv.buyer.identifiers[0] ? [L('customerNumber'), inv.buyer.identifiers[0].id] : undefined,
    inv.buyerReference ? [L(looksLikeLeitwegId(inv.buyerReference) ? 'leitwegId' : 'buyerReference'), inv.buyerReference] : undefined,
    inv.purchaseOrderReference ? [L('orderReference'), inv.purchaseOrderReference] : undefined,
    inv.contractReference ? [L('contract'), inv.contractReference] : undefined,
    inv.projectReference ? [L('project'), inv.projectReference] : undefined,
    ...inv.precedingInvoices.map((p): [string, string] => [L('precedingInvoice'), `${p.number}${p.issueDate ? ` (${fmtDate(p.issueDate, lang)})` : ''}`]),
  ].filter((x): x is [string, string] => !!x);
  let my = w.y;
  const mx = M + 290;
  for (const [k, v] of meta) {
    w.text(k, mx, my, { size: 8, color: muted });
    for (const part of wrap(v, regular, 8.5, width - 395)) {
      w.text(part, mx + 105, my, { size: 8.5 });
      my -= 11;
    }
    my -= 1;
  }
  w.y = Math.min(ay, my) - 24;

  // title
  w.text(`${title} ${inv.number}`, M, w.y, { size: 15, bold: true, color: layout === 'modern' ? accent : undefined });
  w.y -= 22;

  for (const n of inv.notes) {
    for (const l of wrap(n.text, regular, 9, width)) {
      w.ensure(12);
      w.text(l, M, w.y, { size: 9 });
      w.y -= 12;
    }
    w.y -= 4;
  }
  w.y -= 6;

  // ---- table
  const cols = { pos: M, desc: M + 28, qty: M + 255, unit: M + 300, price: M + 335, vat: M + 405, amount: M + 440 };
  const header = () => {
    w.ensure(30);
    if (layout === 'modern') {
      w.page.drawRectangle({ x: M - 4, y: w.y - 5, width: width + 8, height: 17, color: accent });
    }
    const color = layout === 'modern' ? rgb(1, 1, 1) : undefined;
    const o = { size: 8, bold: true, color };
    w.text(L('pos'), cols.pos, w.y, o);
    w.text(L('description'), cols.desc, w.y, o);
    w.text(L('quantity'), cols.qty - 40, w.y, { ...o, align: 'right', width: 80 });
    w.text(L('unit'), cols.unit, w.y, o);
    w.text(L('unitPrice'), cols.price, w.y, { ...o, align: 'right', width: 65 });
    w.text(L('vat'), cols.vat, w.y, { ...o, align: 'right', width: 30 });
    w.text(L('amount'), cols.amount, w.y, { ...o, align: 'right', width: width - 440 });
    if (layout === 'classic') {
      w.page.drawLine({ start: { x: M, y: w.y - 5 }, end: { x: M + width, y: w.y - 5 }, thickness: 0.8, color: rgb(0.2, 0.2, 0.2) });
    }
    w.y -= 18;
  };
  header();
  inv.lines.forEach((l, idx) => {
    const desc = wrap(l.item.name, bold, 8.5, 220);
    const extra = [
      ...(l.item.description ? wrap(l.item.description, regular, 8, 220) : []),
      ...(l.note ? wrap(l.note, regular, 8, 220) : []),
      ...l.allowances.map((a) => `${L('allowance')}${a.reason ? ` (${a.reason})` : ''}: −${money(a.amount)}`),
      ...l.charges.map((c) => `${L('charge')}${c.reason ? ` (${c.reason})` : ''}: +${money(c.amount)}`),
      ...(l.period?.start ? [`${L('period')}: ${fmtDate(l.period.start, lang)} – ${fmtDate(l.period.end, lang)}`] : []),
    ];
    const h = desc.length * 11 + extra.length * 10 + 6;
    if (w.y - h < M + FOOT) {
      w.newPage();
      header();
    }
    if (layout === 'modern' && idx % 2 === 1) {
      w.page.drawRectangle({ x: M - 4, y: w.y - h + 9, width: width + 8, height: h, color: rgb(0.95, 0.96, 0.98) });
    }
    const y0 = w.y;
    w.text(l.id, cols.pos, y0, { size: 8.5 });
    desc.forEach((d, i) => w.text(d, cols.desc, y0 - i * 11, { size: 8.5, bold: true }));
    extra.forEach((d, i) => w.text(d, cols.desc, y0 - desc.length * 11 - i * 10, { size: 8, color: muted }));
    w.text(formatNumber(l.quantity, locale), cols.qty - 40, y0, { size: 8.5, align: 'right', width: 80 });
    w.text(unitName(l.unitCode, lang), cols.unit, y0, { size: 8.5 });
    w.text(money(l.price.net), cols.price, y0, { size: 8.5, align: 'right', width: 65 });
    w.text(l.vat.rate !== undefined ? `${formatNumber(l.vat.rate, locale)} %` : l.vat.category, cols.vat, y0, { size: 8.5, align: 'right', width: 30 });
    w.text(money(l.netAmount), cols.amount, y0, { size: 8.5, align: 'right', width: width - 440 });
    w.y -= h;
    if (layout === 'classic') {
      w.page.drawLine({ start: { x: M, y: w.y + 7 }, end: { x: M + width, y: w.y + 7 }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
    }
  });
  w.y -= 8;

  // ---- totals
  const t = inv.totals;
  const rows: [string, string, boolean?][] = [
    [L('lineTotal'), money(t.lineNet)],
    ...inv.allowances.map((a): [string, string] => [`${L('allowance')}${a.reason ? ` ${a.reason}` : ''}`, `−${money(a.amount)}`]),
    ...inv.charges.map((c): [string, string] => [`${L('charge')}${c.reason ? ` ${c.reason}` : ''}`, `+${money(c.amount)}`]),
    ...(inv.allowances.length || inv.charges.length ? [[L('netTotal'), money(t.taxExclusive)] as [string, string]] : []),
    ...inv.vatBreakdown.map((v): [string, string] => [
      v.category === 'S' || v.category === 'L' || v.category === 'M'
        ? L('vatOn', { rate: formatNumber(v.rate, locale), base: money(v.taxableAmount) })
        : L('vatCategory', { category: v.category, base: money(v.taxableAmount) }),
      money(v.taxAmount),
    ]),
    [L('grossTotal'), money(t.taxInclusive), true],
    ...(t.prepaid ? [[L('prepaid'), `−${money(t.prepaid)}`] as [string, string]] : []),
    ...(t.rounding ? [[L('rounding'), money(t.rounding)] as [string, string]] : []),
    ...(t.prepaid || t.rounding || t.payable !== t.taxInclusive ? [[L('payable'), money(t.payable), true] as [string, string, boolean]] : []),
  ];
  w.ensure(rows.length * 14 + 10);
  for (const [k, v, strong] of rows) {
    if (strong) {
      w.page.drawLine({ start: { x: M + 260, y: w.y + 10 }, end: { x: M + width, y: w.y + 10 }, thickness: 0.6, color: layout === 'modern' ? accent : rgb(0.2, 0.2, 0.2) });
    }
    w.text(k, M + 260, w.y, { size: 9, bold: strong });
    w.text(v, M + 400, w.y, { size: 9, bold: strong, align: 'right', width: width - 400 });
    w.y -= 14;
  }
  w.y -= 10;

  // ---- exemption reasons, payment, notes
  const para = (heading: string | undefined, body: string[]) => {
    const lines = body.flatMap((b) => wrap(b, regular, 8.5, width));
    if (!lines.length) return;
    w.ensure(14 + lines.length * 11);
    if (heading) {
      w.text(heading, M, w.y, { size: 9, bold: true });
      w.y -= 12;
    }
    for (const l of lines) {
      w.ensure(11);
      w.text(l, M, w.y, { size: 8.5 });
      w.y -= 11;
    }
    w.y -= 8;
  };
  para(undefined, inv.vatBreakdown.map((v) => v.exemptionReason).filter((x): x is string => !!x));
  const pay = inv.payment;
  para(L('paymentTerms'), [inv.paymentTerms ?? ''].filter(Boolean));
  if (pay) {
    para(L('bankDetails'), [
      ...pay.creditTransfers.map((c) => [c.name, `IBAN ${c.iban}`, c.bic && `BIC ${c.bic}`].filter(Boolean).join(' · ')),
      pay.remittanceInfo ? `${L('remittance')}: ${pay.remittanceInfo}` : '',
      pay.directDebit?.mandateRef ? `${L('directDebit')} ${pay.directDebit.mandateRef}` : '',
    ].filter(Boolean));
  }
  para(undefined, [L('embedded', { profile })]);

  // ---- footer on every page
  const total = w.pages.length;
  w.pages.forEach((p, i) => {
    w.page = p;
    p.drawLine({ start: { x: M, y: M + FOOT - 20 }, end: { x: M + width, y: M + FOOT - 20 }, thickness: 0.4, color: rgb(0.75, 0.75, 0.75) });
    footer.forEach((f, j) => w.text(wrap(f, regular, 7, width - 70)[0] ?? '', M, M + FOOT - 32 - j * 9, { size: 7, color: muted }));
    w.text(L('page', { n: String(i + 1), total: String(total) }), M, M + FOOT - 32, { size: 7, color: muted, align: 'right', width });
  });

  // ---- PDF/A-3 + Factur-X metadata
  const producer = '@tirlogy/einvoice';
  const creator = 'E-Rechnung Kit (tiryaki.eu)';
  const docTitle = `${title} ${inv.number}`;
  doc.setTitle(docTitle);
  doc.setAuthor(inv.seller.name);
  doc.setSubject(`${title} ${inv.number}`);
  doc.setProducer(producer);
  doc.setCreator(creator);
  doc.setCreationDate(date);
  doc.setModificationDate(date);
  doc.setLanguage(localeOf(lang));

  await doc.attach(new TextEncoder().encode(xml), fileName, {
    mimeType: 'text/xml',
    description: 'Factur-X/ZUGFeRD invoice',
    creationDate: date,
    modificationDate: date,
    afRelationship: AFRelationship.Alternative,
  });

  const ctx = doc.context;
  const metadata = ctx.stream(
    new TextEncoder().encode(xmp(inv, docTitle, { fileName, level: profile, date, producer, creator })),
    { Type: 'Metadata', Subtype: 'XML' },
  );
  doc.catalog.set(PDFName.of('Metadata'), ctx.register(metadata));
  const icc = ctx.flateStream(SRGB_ICC(), { N: 3 });
  const intent = ctx.obj({
    Type: 'OutputIntent',
    S: 'GTS_PDFA1',
    OutputConditionIdentifier: PDFString.of('sRGB'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    DestOutputProfile: ctx.register(icc),
  });
  doc.catalog.set(PDFName.of('OutputIntents'), ctx.obj([ctx.register(intent)]));
  doc.catalog.set(PDFName.of('MarkInfo'), ctx.obj({ Marked: false }));
  // deterministic document ID derived from the invoice number and date
  const idSrc = `${inv.seller.name}|${inv.number}|${date.toISOString()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < idSrc.length; i++) {
    h1 = Math.imul(h1 ^ idSrc.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + idSrc.charCodeAt(i), 2246822519) >>> 0;
  }
  const id = [h1, h2, h1 ^ h2, h2 ^ 0x5bd1e995].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
  ctx.trailerInfo.ID = ctx.obj([PDFHexString.of(id), PDFHexString.of(id)]);

  return doc.save({ useObjectStreams: false });
}
