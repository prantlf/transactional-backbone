function place (left, top, width, height) {
  return { left, top, width, height }
}

function pad (left = 1, right = 1) {
  return { padding: { left, right } }
}

function outline () {
  return { border: { type: 'line' } }
}

module.exports = { place, pad, outline }
