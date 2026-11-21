# Third-party notices

This project (MIT) uses or downloads the following third-party components.

| Component | Version | License | How it is used |
|---|---|---|---|
| EN 16931 validation artefacts (CEN/TC 434, ConnectingEurope/eInvoicing-EN16931) | 1.3.17 | EUPL-1.2 | Schematron XSLT downloaded at build time, compiled to SEF, shipped in `packages/einvoice/rules` and the web app |
| XRechnung Schematron (KoSIT, itplr-kosit/xrechnung-schematron) | 2.6.0 for XRechnung 3.0.2 | Apache-2.0 | as above |
| XRechnung test suite (KoSIT) | 2026-08-31 | Apache-2.0 | downloaded for tests only, not redistributed |
| KoSIT validator and XRechnung configuration | 1.6.3 / 2026-08-31 | Apache-2.0 | CI only |
| ZUGFeRD 2.5.2 sample invoices (FeRD), mirrored in ZUGFeRD/mustangproject | commit 5299f2a | see FeRD / Apache-2.0 repository | downloaded for tests only, not redistributed |
| SaxonJS 2.7 (`saxon-js`, `SaxonJS2.rt.js`) | 2.7 | Saxonica SaxonJS License 1.0 | runtime for Schematron validation (Node: npm peer dependency; web app: redistributed in unmodified binary form) |
| xslt3 | 2.7.0 | Saxonica SaxonJS License 1.0 | build time compiler XSLT to SEF |
| Open Sans (Regular, Bold) | 1.10 (open-sans-fontface 1.4.0) | Apache-2.0 | embedded in generated PDF/A-3 files |
| Compact sRGB ICC profile `sRGB-v4.icc` (Clinton Ingram) | 2018 | CC0-1.0 | OutputIntent of generated PDF/A-3 files |
| pdf-lib, @pdf-lib/fontkit | 1.17.1 / 1.1.1 | MIT | PDF creation and reading |
| @xmldom/xmldom | 0.9 | MIT | XML parsing |
| big.js | 7 | MIT | decimal arithmetic |
| React, React DOM | 19 | MIT | web app |
| idb-keyval | 6 | Apache-2.0 | IndexedDB storage in the web app |
| veraPDF (Docker image `verapdf/cli`) | 1.30 | GPL-3.0 / MPL-2.0 | CI only, not redistributed |

## SaxonJS notice

The SaxonJS license requires the following notice in documentation of redistributions:

> Copyright (c) Saxonica Ltd. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS." ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The full license text is shipped next to the runtime as `SaxonJS-LICENSE.txt`.

## EUPL-1.2 notice

The compiled EN 16931 rule files in `rules/*.sef.json` are a derivative (compiled form) of the CEN/TC 434 validation artefacts and remain under the EUPL-1.2. Source: https://github.com/ConnectingEurope/eInvoicing-EN16931
