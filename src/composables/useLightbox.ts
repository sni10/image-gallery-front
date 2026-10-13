import { watch, onUnmounted, type Ref } from 'vue'
import PhotoSwipe from 'photoswipe'
import 'photoswipe/style.css'
import { getPhoto, type Photo } from '@/api'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const PREFETCH = 5 // start loading next page when this close to the end of loaded photos
const WHEEL_LOCK = 350 // ms between wheel-driven slide changes
// icons paint with --pswp-icon-color: .pswp__icn sets its own `color` (grey), so currentColor never sees the button's
const HEART =
  '<svg class="pswp__icn" viewBox="0 0 24 24" width="24" height="24"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.2 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5c3.4 0 5.4 3.6 4.1 6.8C19.5 16.4 12 21 12 21z"/></svg>'
const LINK =
  '<svg class="pswp__icn" viewBox="0 0 24 24" width="24" height="24" style="fill:none;stroke:var(--pswp-icon-color);stroke-width:2;stroke-linecap:round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'
const lockedSlide = (thumb: string | null, login: string, text: string) =>
  `<div style="position:relative;height:100%;overflow:hidden">${thumb ? `<img src="${encodeURI(thumb)}" alt="" style="width:100%;height:100%;object-fit:contain;filter:blur(32px);transform:scale(1.1)">` : ''}<a href="${login}" style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:600 1.25rem sans-serif;text-shadow:0 1px 3px #000">🔒 ${text}</a></div>`
const pending = (text: string) =>
  `<div style="display:grid;place-items:center;height:100%;color:#aaa">${text}</div>`

// Opens PhotoSwipe when `index` is set, resets it to null on close.
export function useLightbox(
  index: Ref<number | null>,
  photos: Readonly<Ref<Photo[]>>,
  total: Readonly<Ref<number>>,
  loadMore: () => Promise<void>,
  toggleFavorite: (p: Photo) => Promise<unknown>,
  locked: (i: number) => boolean = () => false, // guest-blurred slides: thumb in blur + sign-in link
  // element the zoom animation starts from; default: the grid thumb with that index
  thumb = (i: number) => document.querySelector<HTMLElement>(`[data-pswp-index="${i}"]`),
) {
  const { t } = useI18n()
  const router = useRouter()
  const route = useRoute()
  let pswp: PhotoSwipe | null = null

  const loginHref = () => router.resolve({ name: 'login', query: { next: route.fullPath } }).href

  function prefetch() {
    if (pswp && pswp.currIndex >= photos.value.length - PREFETCH) loadMore()
  }

  watch(index, (i) => {
    if (i == null || pswp) return
    pswp = new PhotoSwipe({
      index: i,
      loop: false,
      closeTitle: t('lightbox.close'),
      zoomTitle: t('lightbox.zoom'),
      arrowPrevTitle: t('lightbox.prev'),
      arrowNextTitle: t('lightbox.next'),
      errorMsg: t('lightbox.loadError'),
    })
    // slides count = server total, so the viewer knows the real end;
    // not-yet-loaded slides show a placeholder and get refreshed after loadMore
    pswp.addFilter('numItems', () => Math.max(total.value, photos.value.length))
    pswp.addFilter('itemData', (_, idx) => {
      const p = photos.value[idx]
      if (!p) return { html: pending(t('common.loading')) }
      if (locked(idx)) return { html: lockedSlide(p.thumbUrl, loginHref(), t('photo.locked')) }
      return {
        src: p.url!,
        msrc: p.thumbUrl ?? undefined,
        width: p.width,
        height: p.height,
        alt: p.title,
      }
    })
    // zoom-in/out animation from/to the grid thumbnail
    pswp.addFilter('thumbEl', (el, _, idx) => thumb(idx) ?? el!)
    // wheel = next/prev slide (ctrl+wheel keeps PhotoSwipe's zoom).
    // ponytail: time lock vs trackpad inertia spam; tune WHEEL_LOCK if it feels sticky/jumpy
    let wheelAt = 0
    pswp.on('wheel', (e) => {
      const ev = e.originalEvent
      if (ev.ctrlKey) return
      e.preventDefault()
      const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY
      if (Math.abs(d) < 4 || ev.timeStamp - wheelAt < WHEEL_LOCK) return
      wheelAt = ev.timeStamp
      if (d > 0) pswp!.next()
      else pswp!.prev()
    })
    // heart in the top bar, mirrors photo.isFavorite of the current slide
    pswp.on('uiRegister', () => {
      let sync = () => {}
      pswp!.ui!.registerElement({
        name: 'fav',
        order: 9,
        isButton: true,
        html: HEART,
        onInit: (el, p) => {
          sync = () => {
            const ph = photos.value[p.currIndex]
            el.style.visibility = ph ? '' : 'hidden'
            el.style.setProperty('--pswp-icon-color', ph?.isFavorite ? '#f45' : '#fff')
            el.title = t(ph?.isFavorite ? 'favorites.remove' : 'favorites.add')
            el.setAttribute('aria-pressed', String(!!ph?.isFavorite))
          }
          p.on('change', sync)
          sync()
        },
        onClick: (_, __, p) => {
          const ph = photos.value[p.currIndex]
          if (!ph) return
          toggleFavorite(ph).finally(sync) // finally: shows a rollback
          sync()
        },
      })
    })
    // link to the photo page; plain click navigates in-app (the grid unmounts and closes the viewer)
    pswp.on('uiRegister', () => {
      pswp!.ui!.registerElement({
        name: 'page',
        order: 8,
        isButton: true,
        tagName: 'a',
        title: t('lightbox.page'),
        html: LINK,
        onInit: (el, p) => {
          const sync = () => {
            const ph = photos.value[p.currIndex]
            // hidden on the photo's own page: nowhere to go
            el.style.visibility = ph && ph.id !== route.params.id ? '' : 'hidden'
            if (ph)
              el.setAttribute('href', router.resolve({ name: 'photo', params: { id: ph.id } }).href)
          }
          p.on('change', sync)
          sync()
        },
        onClick: (e, el) => {
          if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          router.push(el.getAttribute('href')!)
        },
      })
    })
    pswp.on('change', prefetch)
    pswp.on('afterInit', prefetch)
    // signed url expired while the page stayed open: fetch a fresh one once per photo and reload the slide
    const refreshed = new Set<string>()
    pswp.on('loadError', ({ slide }) => {
      const p = photos.value[slide.index]
      if (!p || refreshed.has(p.id)) return
      refreshed.add(p.id)
      getPhoto(p.id)
        .then((fresh) => {
          Object.assign(p, { url: fresh.url, locked: fresh.locked })
          pswp?.refreshSlideContent(slide.index)
        })
        .catch(() => {})
    })
    pswp.on('destroy', () => {
      pswp = null
      index.value = null
    })
    pswp.init()
  })

  // photos arrived while viewer is open: re-render slides that were placeholders
  watch(
    () => photos.value.length,
    (len, old) => {
      if (!pswp) return
      for (let i = pswp.currIndex - 1; i <= pswp.currIndex + 1; i++) {
        if (i >= old && i < len) pswp.refreshSlideContent(i)
      }
    },
  )

  onUnmounted(() => pswp?.destroy())
}
