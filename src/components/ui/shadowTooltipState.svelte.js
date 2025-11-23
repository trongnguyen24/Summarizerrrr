export class ShadowTooltipState {
  activeContent = $state(null)
  isGroupActive = $state(false)
  delayDuration = 500
  graceDuration = 300
  
  #delayTimeout
  #graceTimeout

  constructor(delayDuration = 500) {
    this.delayDuration = delayDuration
  }

  triggerEnter(content) {
    clearTimeout(this.#graceTimeout)
    
    if (this.isGroupActive) {
      // If group is already active, show immediately
      this.activeContent = content
      clearTimeout(this.#delayTimeout)
    } else {
      // Otherwise wait for delay
      clearTimeout(this.#delayTimeout)
      this.#delayTimeout = setTimeout(() => {
        this.activeContent = content
        this.isGroupActive = true
      }, this.delayDuration)
    }
  }

  triggerLeave() {
    clearTimeout(this.#delayTimeout)
    this.activeContent = null
    
    // Start grace period to keep group active
    this.#graceTimeout = setTimeout(() => {
      this.isGroupActive = false
    }, this.graceDuration)
  }
}
