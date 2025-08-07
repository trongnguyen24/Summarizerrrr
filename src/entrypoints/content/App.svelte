<script>
  export let name = 'world'
</script>

<div class="button-fff">
  Hello {name}!
</div>

<style>
  .button-fff {
    width: 50px;
    height: 50px;
    background-color: #fff;
    position: fixed;
    top: 24px;
    left: 24px;
    z-index: 999999999999;
    border: 2px solid #333;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
</style>
