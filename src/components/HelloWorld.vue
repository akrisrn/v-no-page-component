<template>
  <div id="hello-world" v-html="html"></div>
</template>

<script lang="ts">
  @vno.VPD.Component({
    // mount at #hello-world. it is the element rendering in Markdown that hello-world.js was imported to.
    el: '#hello-world',
    // or create a new one to mount.
    // el: document.createElement('div'),
  })
  export default class HelloWorld extends vno.Vue {
    renderData = '';

    get html() {
      return vno.markdown.renderMD(this.renderData, false);
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      this.renderData = `## This's a v-no page component!

Recommend to use [\`vue-class-component\`](https://github.com/vuejs/vue-class-component) with TypeScript and SCSS.

\`vno.VDP\` is an alias of [\`vue-property-decorator\`](https://github.com/kaorun343/vue-property-decorator), and \`vno.Vue\` is an alias of \`vno.VDP.Vue\`.`;
    }

    // mounted() {
    //   // get the element and append it to where you want.
    //   document.querySelector('#app')!.append(this.$el);
    // }
  }
</script>

<style lang="scss" scoped>@import "../styles/hello-world";</style>
