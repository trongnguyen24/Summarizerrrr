<div class="plus-icon top-left">
  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
    ><path d="M4 0h1v9H4z" fill="currentColor" /><path
      d="M9 4v1H0V4z"
      fill="currentColor"
    /></svg
  >
</div>
<div class="plus-icon bottom-right">
  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
    ><path d="M4 0h1v9H4z" fill="currentColor" /><path
      d="M9 4v1H0V4z"
      fill="currentColor"
    /></svg
  >
</div>

<style>
  .plus-icon {
    position: absolute;
    z-index: 11;
    width: 9px; /* Kích thước container dấu cộng */
    height: 9px; /* Kích thước container dấu cộng */
    overflow: hidden; /* Ẩn phần thừa của pseudo-elements */
  }

  /* .red-plus-icon:before,
  .red-plus-icon:after {
    background-color: var(--color-error);
  } */

  .top-left {
    top: 0;
    left: 0;
    transform: translateX(-5px) translateY(-5px);
  }

  .bottom-right {
    bottom: 0;
    right: 0;
    transform: translateX(5px) translateY(5px);
  }
</style>
