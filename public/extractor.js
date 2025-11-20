(function () {
  try {
    const minLength = 50
    let content = document.body.innerText?.trim()
    if (content && content.length >= minLength) return content
    content = document.body.textContent?.trim()
    if (content && content.length >= minLength) return content
    return null
  } catch (e) {
    return null
  }
})()
