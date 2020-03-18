import React from "./mReact";
const ReactDom = React

let element = <div>
  <h1 id="app">测试</h1>
  <p>学习</p>
  <a href="http://www.baidu.com">跳转</a>
</div>

React.render(element, document.getElementById('root'))