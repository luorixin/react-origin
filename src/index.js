import React from "./mReact";
import App1 from './App'
const ReactDom = React

function App(props){
  const [count, setCount] = React.useState(1)
  return <div>
    <h1 id="app">hello, {props.title} {count}</h1>
    <button onClick={()=>setCount(count+1)}>学习</button>
    <hr/>
    <a href="http://www.baidu.com">跳转</a>
    <App1></App1>
  </div>
}

let element = <App title="test" />

ReactDom.render(element, document.getElementById('root'))