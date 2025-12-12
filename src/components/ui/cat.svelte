<script>
  import { animate } from 'animejs'

  let { isClosing = false } = $props()

  function moveIris(e, heads, eyeId, irisId, irisId2) {
    const eye = document.getElementById(eyeId)
    const iris = document.getElementById(irisId)
    const iris2 = document.getElementById(irisId2)
    const face = document.getElementById(heads)

    if (!eye || !iris || !iris2 || !face) return

    const eyeRect = eye.getBoundingClientRect()

    const eyeCenterX = eyeRect.x + eyeRect.width / 2
    const eyeCenterY = eyeRect.y + eyeRect.height / 2
    let mouseX = e.clientX
    let mouseY = e.clientY

    const deltaX = mouseX - eyeCenterX
    const deltaY = mouseY - eyeCenterY
    const angle = Math.atan2(deltaY, deltaX)

    const windowWidth = window.innerWidth
    // Normalize mouse X position to range [-0.5, 0.5]
    const normalizedMouseX = mouseX / windowWidth - 0.5
    // Map normalized X to degree range [-5, 5]
    const headTilt = normalizedMouseX * 20 // Multiply by 10 to get a range of [-5, 5] degrees

    const irisMaxMove = eyeRect.width / 7 // Max distance iris can move from center
    const irisX = eyeCenterX + irisMaxMove * Math.cos(angle)
    const irisY = eyeCenterY + irisMaxMove * Math.sin(angle)

    // Update iris position
    animate(iris, {
      translateX: irisX - eyeCenterX,
      translateY: irisY - eyeCenterY,
      duration: 300,
      ease: 'outQuad',
    })
    animate(iris2, {
      translateX: irisX - eyeCenterX,
      translateY: irisY - eyeCenterY,
      duration: 300,
      ease: 'outQuad',
    })

    // Update head tilt
    animate(face, {
      rotate: -headTilt,
      transformOrigin: '50% 100%',
      duration: 300,
      ease: 'outQuad',
    })
  }

  $effect(() => {
    const handleMouseMove = (e) => {
      moveIris(e, 'heads', 'cat', 'iris', 'iris_2')
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  })
</script>

<div
  class="w-24 absolute left-2 -top-px cat overflow-hidden group transition-transform duration-300 ease-out"
  class:-translate-y-full={!isClosing}
  class:translate-y-0={isClosing}
>
  <svg
    class=" group-hover:translate-y-1/3 transition-transform"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 190 190"
    ><g id="Frame"
      ><g id="cat"
        ><g xmlns="http://www.w3.org/2000/svg" id="cat-body">
          <path
            id="c-body"
            d="M65.9993 176.5C65.4953 163.454 74.5973 135.641 95.7633 136.003C116.928 136.003 124.269 160.366 124.269 174.5C124.269 187.986 127.999 190 95.7633 190C65.9993 190 66.5033 189.546 65.9993 176.5Z"
            fill="var(--color-cat)"
          />
          <path
            id="Vector 23"
            d="M94.5 165L70.5 153L72 146.499C80.3333 146.333 103.1 146.099 117.5 146.499C119.9 149.699 120.333 151.667 120.5 153L94.5 165Z"
            fill="#FF870E"
          />
        </g>
        <path
          id="tail"
          fill="var(--color-cat)"
          fill-rule="evenodd"
          d="M136.5 159c1.875-1.5 5-.875 6.5 1 3.359 4.199 3.997 9.475 3.411 13.458-.579 3.937-2.843 7.21-5.786 9.417-5.785 4.339-15.076 5.024-20.625-2.375a2.5 2.5 0 0 1 4-3c3.451 4.601 9.411 4.536 13.625 1.375C139.682 177.332 140 175.5 140 173s-1.359-5.699-4-9c-1.6-2-.578-4.137.5-5Z"
          clip-rule="evenodd"
        /><g id="heads"
          ><g id="head"
            ><path
              id="face"
              fill="var(--color-cat)"
              fill-rule="evenodd"
              d="M80.642 56.1627C85.2043 55.3284 89.833 54.91 94.471 54.9127C99.589 54.9127 104.571 55.3497 109.351 56.1747C114.195 47.6997 130.695 37.7167 136.181 40.4647C143.35 43.7917 144.652 59.0047 143.747 71.5147C157 80.5 159 103 159 117.5C159 149 130.629 152.116 94.471 152.116C58.312 152.116 32.5 147.957 32.5 117.5C32.5 103.067 35.583 82.7627 46.358 72.8497C45.262 60.1117 46.393 43.9117 53.818 40.4647C59.302 37.7177 75.79 47.6907 80.642 56.1627Z"
              clip-rule="evenodd"
            /><path
              id="nose"
              fill="#fff"
              fill-rule="evenodd"
              d="M91 115.5a1.502 1.502 0 0 1 1.5-1.5h5a1.501 1.501 0 0 1 1.5 1.5c0 .852-1.331 2.129-2.507 3.169-.828.732-2.158.732-2.986 0-1.176-1.04-2.507-2.317-2.507-3.169Z"
              clip-rule="evenodd"
            /><path
              id="fur3"
              stroke="var(--color-muted)"
              stroke-linecap="round"
              stroke-width="2"
              d="M159.333 83.5a2.667 2.667 0 1 0 5.334 0 2.667 2.667 0 0 0-5.334 0ZM160.5 99h.5c0-1.907.075-4.969.299-7.95.225-3.004.598-5.851 1.169-7.374L162 83.5l-.468-.176c-.629 1.677-1.006 4.663-1.231 7.651-.226 3.01-.301 6.098-.301 8.025h.5ZM32.667 83.5a2.667 2.667 0 1 1-5.334 0 2.667 2.667 0 0 1 5.334 0ZM31.5 99H31c0-1.907-.075-4.969-.299-7.95-.225-3.004-.598-5.851-1.17-7.374L30 83.5l.468-.176c.629 1.677 1.006 4.663 1.23 7.651.227 3.01.302 6.098.302 8.025h-.5Z"
            /><path
              id="fur2"
              fill="var(--color-muted)"
              d="m29.5 98.5 4.615-1.923a1 1 0 0 1 1.385.923v23a1 1 0 0 1-1.385.923L29.5 119.5l-.338-1.013a30 30 0 0 1 0-18.974L29.5 98.5Z"
            /><path
              id="fur1"
              fill="var(--color-muted)"
              d="m163 98.5-4.615-1.923A1 1 0 0 0 157 97.5v23a1 1 0 0 0 1.385.923L163 119.5l.338-1.013a30.01 30.01 0 0 0 0-18.974L163 98.5Z"
            /><g id="eyes"
              ><g id="eye_L"
                ><path
                  id="eye"
                  fill="#fff"
                  d="M71.5 109c10.77 0 19.5-8.73 19.5-19.5S82.27 70 71.5 70 52 78.73 52 89.5 60.73 109 71.5 109Z"
                /><path
                  id="iris"
                  fill="var(--color-cat)"
                  fill-rule="evenodd"
                  d="M71.775 98.55a8.775 8.775 0 1 0 0-17.55 8.775 8.775 0 0 0 0 17.55Zm-3.25-8.45a3.575 3.575 0 1 0 0-7.15 3.575 3.575 0 0 0 0 7.15Z"
                  clip-rule="evenodd"
                /></g
              ><g id="eye_R"
                ><path
                  id="eye_2"
                  fill="#fff"
                  d="M118.5 109c10.77 0 19.5-8.73 19.5-19.5S129.27 70 118.5 70 99 78.73 99 89.5s8.73 19.5 19.5 19.5Z"
                /><path
                  id="iris_2"
                  fill="var(--color-cat)"
                  fill-rule="evenodd"
                  d="M118.775 98.55a8.777 8.777 0 0 0 6.205-14.98A8.777 8.777 0 0 0 110 89.775a8.778 8.778 0 0 0 8.775 8.775Zm-3.25-8.45a3.577 3.577 0 0 0 2.528-6.103 3.577 3.577 0 0 0-6.103 2.528 3.577 3.577 0 0 0 3.575 3.575Z"
                  clip-rule="evenodd"
                /></g
              ></g
            ></g
          ></g
        ></g
      ></g
    ></svg
  >
</div>

<style>
  #cat-body {
    animation: catScaleBody 1s infinite;
    transform-origin: center bottom;
  }
  @keyframes catScaleBody {
    0%,
    90%,
    100% {
      transform: scaleY(1.05) scaleX(1.07);
    }
    45%,
    50% {
      transform: scaleY(1) scaleX(1);
    }
  }
  #tail {
    animation: catScaleTail 1s infinite;
    transform-origin: bottom;
  }
  @keyframes catScaleTail {
    0%,
    100% {
      transform: scaleY(1) rotate(-3deg);
    }
    50% {
      transform: scaleY(0.9) rotate(3deg);
    }
  }

  #face {
    animation: catScaleFace 1s infinite;
    transform-origin: center;
  }
  @keyframes catScaleFace {
    0%,
    95%,
    100% {
      transform: translateY(0);
    }
    45%,
    50% {
      transform: translateY(3px);
    }
  }
  #eyes {
    animation: catMoveEyes 1s infinite;
    transform-origin: center;
  }
  @keyframes catMoveEyes {
    0%,
    100% {
      transform: translateY(0) scaleX(0.75);
    }
    50% {
      transform: translateY(2px) scaleX(0.75);
    }
  }

  #fur1,
  #fur2,
  #fur3,
  #fur4 {
    animation: catFur 1s infinite;
    transform-origin: center;
  }

  @keyframes catFur {
    0%,
    95%,
    100% {
      transform: translateY(0);
    }
    45%,
    50% {
      transform: translateY(3px);
    }
  }
  #head {
    animation: catHead 2s infinite;
    transform-origin: 50% 100%;
  }

  @keyframes catHead {
    0%,
    100% {
      transform: rotate(-3deg);
    }
    50% {
      transform: rotate(3deg);
    }
  }
</style>
