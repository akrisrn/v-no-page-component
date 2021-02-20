export function updateAsyncScript() {
  let needUpdate = false;
  vno.articleSelf.asyncResults.forEach(result => {
    if (vno.markdown.updateAsyncScript(result) && !needUpdate) {
      needUpdate = true;
    }
  });
  if (needUpdate) {
    vno.markdown.updateDom().then();
  }
  return needUpdate;
}

export function strToRGB(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return `#${'00000'.substring(0, 6 - hex.length)}${hex}`;
}
