import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); document.documentElement.className = '' })

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
window.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}
