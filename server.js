// SSR server: `npm run dev` (Vite middleware, HMR) or `npm run preview` (built dist/).
import fs from 'node:fs/promises'
import express from 'express'

const prod = process.argv.includes('--prod') || process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 5173 // 5173: the origin the API allows via CORS

const app = express()
let vite
let template = ''

if (prod) {
  const sirv = (await import('sirv')).default
  template = await fs.readFile('./dist/client/index.html', 'utf-8')
  const assets = sirv('./dist/client', { extensions: [] })
  // static files, but never the raw index.html template — pages always go through render()
  app.use((req, res, next) =>
    req.path === '/' || req.path.endsWith('.html') ? next() : assets(req, res, next),
  )
} else {
  const { createServer } = await import('vite')
  vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  app.use(vite.middlewares)
}

app.use('*all', async (req, res) => {
  try {
    const url = req.originalUrl
    let tpl = template
    let render
    if (prod) {
      render = (await import('./dist/server/entry-server.js')).render
    } else {
      tpl = await vite.transformIndexHtml(url, await fs.readFile('./index.html', 'utf-8'))
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
    }

    const r = await render(url, req.headers.cookie, req.headers['accept-language'])
    const html = tpl
      .replace('__APP_LANG__', r.lang)
      .replace('<!--app-head-->', r.head)
      .replace('<!--app-html-->', r.html)
      .replace('<!--app-state-->', r.state)

    res.status(r.status).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.error(e)
    res.status(500).end(prod ? 'Internal Server Error' : e.stack)
  }
})

app.listen(port, () => console.log(`http://localhost:${port}`))
