<template>
  <div id="sandbox">
    <div id="preview" v-html="html"></div>
    <div id="separator"></div>
    <!--suppress HtmlFormInputWithoutLabel -->
    <textarea ref="textarea" v-model="text" class="ipt"></textarea>
  </div>
</template>

<script lang="ts">
  import { updateAsyncScript } from '@/utils';

  @vno.VPD.Component({ el: '#sandbox' })
  export default class Sandbox extends vno.Vue {
    // noinspection JSUnusedGlobalSymbols
    $refs!: {
      textarea: HTMLTextAreaElement
    };

    text = '';
    html = '';
    enableLS = true;
    key = 'sandbox';

    // noinspection JSUnusedGlobalSymbols
    created() {
      const data = document.querySelector('#sandbox')?.getAttribute('data');
      if (data) {
        this.enableLS = false;
        this.text = decodeURIComponent(data);
      } else {
        this.text = vno.storage.getItem(this.key) || '';
      }
      vno.addEventListener(document, vno.EEvent.rendered, () => updateAsyncScript());
    }

    @vno.VPD.Watch('text')
    onTextChanged() {
      this.resize();
      vno.renderMD(vno.filePath, vno.title, this.text, false, vno.articleSelf.asyncResults).then(html => {
        this.html = html;
        this.$nextTick(() => {
          if (!updateAsyncScript()) {
            vno.updateDom();
          }
        });
      });
      if (!this.enableLS) {
        return;
      }
      if (this.text) {
        vno.storage.setItem(this.key, this.text);
      } else {
        vno.storage.removeItem(this.key);
      }
    }

    resize() {
      this.$refs.textarea.style.height = '';
      this.$refs.textarea.style.height = `${this.$refs.textarea.scrollHeight}px`;
    }
  }
</script>

<style lang="scss" scoped>@import "../styles/sandbox";</style>
