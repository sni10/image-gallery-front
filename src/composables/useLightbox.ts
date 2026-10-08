import { watch, onUnmounted, type Ref } from 'vue'
import PhotoSwipe from 'photoswipe'
import 'photoswipe/style.css'
import type { Photo } from '@/api'
import { i18n } from '@/i18n'

const PREFETCH = 5 // start loading next page when this close to the end of loaded photos
const WHEEL_LOCK = 350 // ms between wheel-driven slide changes
const pending = () =>
  `<div style="display:grid;place-items:center;height:100%;color:#aaa">${i18n.global.t('common.loading')}</div>`

// Opens PhotoSwipe when `index` is set, resets it to null on close.
export function useLightbox(
  index: Ref<number | null>,
  photos: Ref<Photo[]>,
  total: Ref<number>,
  loadMore: () => Promise<void>,
) {
  let pswp: PhotoSwipe | null = null

  function prefetch() {
    if (pswp && pswp.currIndex >= photos.value.length - PREFETCH) loadMore()
  }

  watch(index, (i) => {
    if (i == null || pswp) return
    const { t } = i18n.global
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
      if (!p) return { html: pending() }
      return { src: p.url, msrc: p.thumbUrl, width: p.width, height: p.height, alt: p.title }
    })
    // zoom-in/out animation from/to the grid thumbnail
    pswp.addFilter(
      'thumbEl',
      (el, _, idx) => document.querySelector<HTMLElement>(`[data-pswp-index="${idx}"]`) ?? el!,
    )
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
    pswp.on('change', prefetch)
    pswp.on('afterInit', prefetch)
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
