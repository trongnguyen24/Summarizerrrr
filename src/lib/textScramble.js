class TextScramble {
  constructor(el) {
    this.el = el
    this.chars = '!<>-_\\/[]{}—=+*^?#________'
    this.speed = 1
    this.update = this.update.bind(this)
    this.timeoutId = null
  }

  play(phrases, interval = 5000) {
    this.stop()
    let counter = 0
    const next = () => {
      this.setText(phrases[counter]).then(() => {
        this.timeoutId = setTimeout(next, interval)
      })
      counter = (counter + 1) % phrases.length
    }
    next()
  }

  stop() {
    clearTimeout(this.timeoutId)
    cancelAnimationFrame(this.frameRequest)
  }

  setText(newText, options) {
    if (options && options.speed) {
      this.speed = options.speed
    } else {
      this.speed = 1
    }
    const oldText = this.el.innerText
    const length = Math.max(oldText.length, newText.length)
    const promise = new Promise((resolve) => (this.resolve = resolve))
    this.queue = []
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || ''
      const to = newText[i] || ''
      const start = Math.floor(Math.random() * 40)
      const end = start + Math.floor(Math.random() * 40)
      this.queue.push({ from, to, start, end })
    }
    cancelAnimationFrame(this.frameRequest)
    this.frame = 0
    this.update()
    return promise
  }
  update() {
    let output = ''
    let complete = 0
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i]
      if (this.frame >= end) {
        complete++
        output += to
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar()
          this.queue[i].char = char
        }
        output += `<span class="dud">${char}</span>`
      } else {
        output += from
      }
    }
    this.el.innerHTML = output
    if (complete === this.queue.length) {
      this.resolve()
    } else {
      this.frameRequest = requestAnimationFrame(this.update)
      this.frame += this.speed
    }
  }
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)]
  }
}

export default TextScramble

// ——————————————————————————————————————————————————
// HOW TO USE
// ——————————————————————————————————————————————————

// const el = document.querySelector('.text');
// const fx = new TextScramble(el);

// // 1. Default speed
// fx.setText("This runs at default speed");

// // 2. Custom speed
// // Pass an options object with a 'speed' property.
// // Higher speed value means faster animation.
// fx.setText("This is much faster", { speed: 5 });
// fx.setText("This is slower", { speed: 0.5 });
