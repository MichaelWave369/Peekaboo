import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mediaKind,
  publicCamEvidence,
  publicCamKind,
  publicCamSummary,
  safePublicCamUrl,
} from './publicCam.js'

test('explicit contact:webcam becomes public webcam evidence', () => {
  const evidence = publicCamEvidence({ 'contact:webcam': 'https://cams.example.org/live.jpg' })
  assert.equal(evidence.matched, true)
  assert.equal(evidence.mediaKind, 'image')
  assert.equal(evidence.inlineEligible, true)
  assert.equal(evidence.hostname, 'cams.example.org')
})

test('unsafe webcam URL schemes and local addresses are rejected', () => {
  assert.equal(safePublicCamUrl('javascript:alert(1)'), null)
  assert.equal(safePublicCamUrl('file:///etc/passwd'), null)
  assert.equal(safePublicCamUrl('http://127.0.0.1/cam'), null)
  assert.equal(safePublicCamUrl('http://192.168.1.20/live'), null)
  assert.equal(safePublicCamUrl('http://localhost:8080/cam'), null)
  assert.equal(safePublicCamUrl('https://user:pass@example.org/cam'), null)
})

test('media kind only treats direct media paths as inline candidates', () => {
  assert.equal(mediaKind('https://example.org/current.jpg?x=1'), 'image')
  assert.equal(mediaKind('https://example.org/live.m3u8'), 'hls')
  assert.equal(mediaKind('https://example.org/camera.mp4'), 'video')
  assert.equal(mediaKind('https://example.org/watch/camera'), 'page')
})

test('http direct media remains external-only because mixed content would be blocked', () => {
  const evidence = publicCamEvidence({ 'contact:webcam': 'http://cams.example.org/live.jpg' })
  assert.equal(evidence.mediaKind, 'image')
  assert.equal(evidence.inlineEligible, false)
})

test('weather and city labels never create public-feed evidence without contact:webcam', () => {
  assert.equal(publicCamEvidence({ name: 'Downtown weather camera' }), null)
  assert.equal(publicCamKind({ name: 'Downtown weather camera' }), null)
})

test('public webcam kind can describe weather and city context without changing access evidence', () => {
  assert.deepEqual(
    publicCamKind({ 'contact:webcam': 'https://example.org/cam.jpg', name: 'Mountain Weather Conditions' }),
    { key: 'weather', label: 'Weather / conditions', strength: 'textual' },
  )
  assert.deepEqual(
    publicCamKind({ 'contact:webcam': 'https://example.org/city.jpg', surveillance: 'public', 'surveillance:zone': 'town' }),
    { key: 'city', label: 'City / public space', strength: 'explicit' },
  )
})

test('summary counts public cams by safe render mode', () => {
  const items = [
    { tags: { 'contact:webcam': 'https://example.org/a.jpg' } },
    { tags: { 'contact:webcam': 'https://example.org/b.m3u8' } },
    { tags: { 'contact:webcam': 'https://example.org/watch' } },
    { tags: { 'contact:webcam': 'http://example.org/c.mp4' } },
  ]
  assert.deepEqual(publicCamSummary(items), {
    total: 4,
    inlineEligible: 2,
    image: 1,
    video: 1,
    hls: 1,
    page: 1,
  })
})
