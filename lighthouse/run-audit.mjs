// Auditoria Lighthouse reprodutível: `pnpm audit:lighthouse` (faz o build antes).
// `node lighthouse/run-audit.mjs --from-reports` só refaz o resumo a partir dos JSON já salvos.
// Sobe o build de produção (vite preview), roda 3× cada página × perfil num Chrome limpo por medição
// e grava relatórios HTML/JSON + resumo com medianas, metas, métricas, versões e ambiente.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { preview } from 'vite'
import { AUDIT } from './audit.config.mjs'

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function auditOnce(url, formFactor) {
  // Chrome novo a cada medição: sem cache nem service worker de medições anteriores.
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'],
  })
  try {
    const flags = { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: AUDIT.categories }
    const config = formFactor === 'desktop' ? desktopConfig : undefined
    return await lighthouse(url, flags, config)
  } finally {
    await chrome.kill()
  }
}

const reportBase = (pageId, formFactor, i) => join(AUDIT.outDir, `${pageId}-${formFactor}-${i}`)

/** Fase 1: mede e salva os relatórios (HTML + JSON) de cada página × perfil × medição. */
async function measureAll() {
  await rm(AUDIT.outDir, { recursive: true, force: true })
  await mkdir(AUDIT.outDir, { recursive: true })
  const server = await preview({ preview: { port: AUDIT.port, strictPort: true }, logLevel: 'warn' })
  const baseUrl = `http://localhost:${AUDIT.port}`
  try {
    for (const page of AUDIT.pages) {
      for (const formFactor of AUDIT.formFactors) {
        for (let i = 1; i <= AUDIT.runs; i++) {
          process.stdout.write(`→ ${page.id} · ${formFactor} · medição ${i}/${AUDIT.runs}… `)
          const { lhr, report } = await auditOnce(baseUrl + page.path, formFactor)
          await writeFile(`${reportBase(page.id, formFactor, i)}.report.html`, report[0])
          await writeFile(`${reportBase(page.id, formFactor, i)}.report.json`, report[1])
          console.log(AUDIT.categories.map((c) => `${c}=${Math.round((lhr.categories[c]?.score ?? 0) * 100)}`).join(' '))
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.httpServer.close(resolve))
  }
}

/** Fase 2: monta o resumo SEMPRE a partir dos JSON salvos (`--from-reports` pula a fase 1). */
async function main() {
  if (!process.argv.includes('--from-reports')) await measureAll()

  const results = []
  const throttlingByProfile = {}
  let firstLhr = null
  for (const page of AUDIT.pages) {
    for (const formFactor of AUDIT.formFactors) {
      const runs = []
      for (let i = 1; i <= AUDIT.runs; i++) {
        const lhr = JSON.parse(await readFile(`${reportBase(page.id, formFactor, i)}.report.json`, 'utf8'))
        firstLhr ??= lhr
        throttlingByProfile[formFactor] = {
          method: lhr.configSettings.throttlingMethod,
          ...lhr.configSettings.throttling,
          screen: `${lhr.configSettings.screenEmulation.width}×${lhr.configSettings.screenEmulation.height}`,
        }
        runs.push({
          scores: Object.fromEntries(AUDIT.categories.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
          metrics: Object.fromEntries(AUDIT.metrics.map((m) => [m, lhr.audits[m]?.numericValue ?? null])),
        })
      }
      results.push({
        page: page.id,
        path: page.path,
        formFactor,
        runs,
        median: {
          scores: Object.fromEntries(AUDIT.categories.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
          metrics: Object.fromEntries(AUDIT.metrics.map((m) => [m, median(runs.map((r) => r.metrics[m]))])),
        },
      })
    }
  }

  const environment = {
    date: firstLhr.fetchTime,
    lighthouse: firstLhr.lighthouseVersion,
    chrome: firstLhr.environment.hostUserAgent,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: (os.cpus()[0]?.model ?? 'desconhecida').trim(),
    cores: os.cpus().length,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
    throttling: throttlingByProfile,
    server: 'vite preview (build de produção), cenário de mocks "default"',
  }
  await writeFile(join(AUDIT.outDir, 'summary.json'), JSON.stringify({ environment, targets: AUDIT.targets, results }, null, 2))
  await writeFile(join(AUDIT.outDir, 'summary.md'), toMarkdown(environment, results))
  console.log(`\nRelatórios em ${AUDIT.outDir}/ (summary.md tem as medianas).`)
}

function toMarkdown(env, results) {
  const ok = (c, v) => (v >= AUDIT.targets[c] ? `${v} ✅` : `${v} ⚠️`)
  const ms = (v) => (v == null ? '–' : `${Math.round(v)} ms`)
  const lines = [
    '# Lighthouse — medianas de 3 medições',
    '',
    `Gerado em ${env.date} · Lighthouse ${env.lighthouse} · ${env.server}`,
    '',
    '| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...results.map(({ page, formFactor, median: m }) =>
      `| ${page} | ${formFactor} | ${ok('performance', m.scores.performance)} | ${ok('accessibility', m.scores.accessibility)} | ` +
      `${ok('best-practices', m.scores['best-practices'])} | ${ok('seo', m.scores.seo)} | ` +
      `${ms(m.metrics['largest-contentful-paint'])} | ${(m.metrics['cumulative-layout-shift'] ?? 0).toFixed(3)} | ${ms(m.metrics['total-blocking-time'])} |`,
    ),
    '',
    `Metas: Performance ≥ ${AUDIT.targets.performance} · Acessibilidade ≥ ${AUDIT.targets.accessibility} · Boas práticas ≥ ${AUDIT.targets['best-practices']} · SEO ≥ ${AUDIT.targets.seo}`,
    '',
    '## Ambiente',
    '',
    `- Chrome: ${env.chrome}`,
    `- Node: ${env.node} · SO: ${env.os}`,
    `- CPU: ${env.cpu} (${env.cores} núcleos) · RAM: ${env.memoryGb} GB`,
    ...Object.entries(env.throttling).map(([profile, t]) =>
      `- Throttling ${profile}: ${t.method}, RTT ${t.rttMs} ms, ${Math.round(t.throughputKbps / 1024 * 10) / 10} Mbps, CPU ${t.cpuSlowdownMultiplier}×, tela ${t.screen}`),
    '',
  ]
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
