(()=>{var t={647:t=>{t.exports=function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}},372:t=>{t.exports=function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}},816:t=>{function e(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}t.exports=function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}},620:t=>{function e(n){return t.exports=e=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)},e(n)}t.exports=e},422:(t,e,n)=>{var r=n(276);t.exports=function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&r(t,e)}},66:(t,e,n)=>{var r=n(873),o=n(647);t.exports=function(t,e){return!e||"object"!==r(e)&&"function"!=typeof e?o(t):e}},276:t=>{function e(n,r){return t.exports=e=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t},e(n,r)}t.exports=e},873:t=>{function e(n){return"function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?t.exports=e=function(t){return typeof t}:t.exports=e=function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},e(n)}t.exports=e}},e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={exports:{}};return t[r](o,o.exports,n),o.exports}n.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return n.d(e,{a:e}),e},n.d=(t,e)=>{for(var r in e)n.o(e,r)&&!n.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:e[r]})},n.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),(()=>{"use strict";var t=function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("div",{attrs:{id:"sandbox"}},[n("div",{attrs:{id:"preview"},domProps:{innerHTML:t._s(t.html)}}),t._v(" "),n("div",{attrs:{id:"separator"}}),t._v(" "),n("textarea",{directives:[{name:"model",rawName:"v-model",value:t.text,expression:"text"}],ref:"textarea",staticClass:"ipt",domProps:{value:t.text},on:{input:function(e){e.target.composing||(t.text=e.target.value)}}})])};t._withStripped=!0;var e=n(372),r=n.n(e),o=n(816),i=n.n(o),a=n(422),c=n.n(a),s=n(66),u=n.n(s),f=n(620),l=n.n(f);function p(t,e,n,r){var o,i=arguments.length,a=i<3?e:null===r?r=Object.getOwnPropertyDescriptor(e,n):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,n,r);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(a=(i<3?o(a):i>3?o(e,n,a):o(e,n))||a);return i>3&&a&&Object.defineProperty(e,n,a),a}function v(){var t=!1;return vno.articleSelf.asyncResults.forEach((function(e){vno.markdown.updateAsyncScript(e)&&!t&&(t=!0)})),t&&vno.markdown.updateDom().then(),t}var d=function(t){c()(a,t);var e,n,o=(e=a,n=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}(),function(){var t,r=l()(e);if(n){var o=l()(this).constructor;t=Reflect.construct(r,arguments,o)}else t=r.apply(this,arguments);return u()(this,t)});function a(){var t;return r()(this,a),(t=o.apply(this,arguments)).text="",t.html="",t.enableLS=!0,t.key="sandbox",t}return i()(a,[{key:"created",value:function(){var t,e=null===(t=document.querySelector("#sandbox"))||void 0===t?void 0:t.getAttribute("data");e?(this.enableLS=!1,this.text=decodeURIComponent(e)):this.text=vno.storage.getItem(this.key)||"",vno.addEventListener(document,vno.EEvent.rendered,(function(){return v()}))}},{key:"onTextChanged",value:function(){var t=this;this.resize(),vno.renderMD(vno.filePath,vno.title,this.text,!1,vno.articleSelf.asyncResults).then((function(e){t.html=e,t.$nextTick((function(){v()||vno.updateDom()}))})),this.enableLS&&(this.text?vno.storage.setItem(this.key,this.text):vno.storage.removeItem(this.key))}},{key:"resize",value:function(){this.$refs.textarea.style.height="",this.$refs.textarea.style.height="".concat(this.$refs.textarea.scrollHeight,"px")}}]),a}(vno.Vue);p([vno.VPD.Watch("text")],d.prototype,"onTextChanged",null);var y=function(t,e,n,r,o,i,a,c){var s,u="function"==typeof t?t.options:t;if(e&&(u.render=e,u.staticRenderFns=[],u._compiled=!0),u._scopeId="data-v-95ba4888",s)if(u.functional){u._injectStyles=s;var f=u.render;u.render=function(t,e){return s.call(e),f(t,e)}}else{var l=u.beforeCreate;u.beforeCreate=l?[].concat(l,s):[s]}return{exports:t,options:u}}(d=p([vno.VPD.Component({el:"#sandbox"})],d),t);y.options.__file="components/Sandbox.vue",new(0,y.exports)})()})();