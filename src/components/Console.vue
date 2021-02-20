<template>
  <div id="console">
    <!--suppress HtmlFormInputWithoutLabel -->
    <input v-model.trim="evalStr" class="ipt" @keyup.enter="submit">
    <div v-for="(result, i) of results" :key="i" class="result">
      <div v-html="result.code"></div>
      <div :class="['value', { error: result.isError }]">
        <span v-if="result.isAsync" v-html="result.value"></span>
        <template v-else>{{ result.value }}</template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { updateAsyncScript } from '@/utils';

  @vno.VPD.Component({ el: '#console' })
  export default class Console extends vno.Vue {
    evalStr = '';
    results: {
      code: string,
      isError: boolean,
      isAsync: boolean,
      value: string
    }[] = [];

    // noinspection JSUnusedGlobalSymbols
    created() {
      this.reset();
    }

    reset() {
      this.evalStr = 'return ';
    }

    submit() {
      const evalStr = this.evalStr;
      const isAsync = evalStr.indexOf('await ') >= 0;
      const [value, isError] = vno.utils.evalFunction(evalStr, {
        path: vno.filePath,
        title: vno.title,
        data: vno.mainSelf.fileData,
        isSnippet: false,
      }, vno.articleSelf.asyncResults);
      this.results.unshift({
        code: vno.markdown.renderMD(`\`\`\`js\n${evalStr}\n\`\`\``, false),
        isError, isAsync, value,
      });
      this.reset();
      this.$nextTick(() => {
        if (!updateAsyncScript()) {
          vno.markdown.updateDom();
        }
      });
    }
  }
</script>

<style lang="scss" scoped>@import "../styles/console";</style>
