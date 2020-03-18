function createElement(type, props, ...children){
  delete props.__source
  return {
    type,
    props: {
      ...props,
      children: children.map(child => {
        return typeof child === 'object' ? child: createTextElement(child) 
      })
    }
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

/**
 * 通过虚拟dom新建dom元素
 * @param {虚拟dom} vdom 
 */
function createDom(vdom) {
  const dom = vdom.type==="TEXT"
    ? document.createTextNode('')
    : document.createElement(vdom.type)
  updateDom(dom, {}, vdom.props)
  return dom
}

function updateDom(dom, prevProps, nextProps){
  // 1. 规避children属性
  // 2. 老的存在 取消
  // 3. 新的存在 新增
  Object.keys(prevProps)
    .filter(name => name!=='children')
    .filter(name => !(name in nextProps))
    .forEach(name => {
      if(name.slice(0, 2) === 'on'){
        dom.removeEventListener(name.slice(2).toLowerCase(), prevProps[name], false)
      }else{
        dom[name] = ''
      }
    })

  Object.keys(nextProps)
    .filter(name => name!=='children')
    .forEach(name => {
      if(name.slice(0, 2) === 'on'){
        dom.addEventListener(name.slice(2).toLowerCase(), nextProps[name], false)
      }else{
        dom[name] = nextProps[name]
      }
    })
}

function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom],
    },
    base: currentRoot // 存储上一个节点
  }
  deletions = []
  nextUnitOfWork = wipRoot
  // vdom.props.children.forEach(child => {
  //   render(child, dom)
  // });
  // container.appendChild(dom)
  // container.innerHTML = '<pre>'+JSON.stringify(vdom, null, 2) +'</pre>'
}
function commitRoot(){
  deletions.forEach(commitWorker)
  commitWorker(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}
function commitWorker(fiber){
  if(!fiber){
    return
  }
  // const domParent = fiber.parent.dom
  // 向上查找
  let domParentFiber = fiber.parent
  while(!domParentFiber.dom){
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom!==null){
    domParent.appendChild(fiber.dom)
  }else if(fiber.effectTag === 'DELETION'){
    commitDeletion(fiber, domParent)
    // domParent.removeChild(fiber.dom)
  }else if(fiber.effectTag === 'UPDATE' && fiber.dom!==null){
    updateDom(fiber.dom, fiber.base.props, fiber.props)
  }
  // domParent.appendChild(fiber.dom)
  commitWorker(fiber.child)
  commitWorker(fiber.slibing)
}

function commitDeletion(fiber,domParent){
  if(fiber.dom){
    domParent.removeChild(fiber.dom)
  }else{
    // 函数组件递归删除
    commitDeletion(fiber.child, domParent)
  }
}

// 下一个单元任务
// render会初始化第一个任务
let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null
let deletions = null
/**
 * 调度diff或者渲染任务
 */
function workLoop(deadline) {
  //有下一个任务，并且当前帧没有结束
  while (nextUnitOfWork && deadline.timeRemaining()>1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  // 没有任务并且更节点还在
  if(!nextUnitOfWork && wipRoot){
    commitRoot()
  }
  requestIdleCallback(workLoop)
}

//启动空闲时间处理
requestIdleCallback(workLoop)

function performUnitOfWork(fiber){
  const isFunctionComponent = fiber.type instanceof Function
  if(isFunctionComponent){
    updateFunctionComponent(fiber)
  }else{
    updateHostComponent(fiber)
  }
  
  // 找下一个任务
  if(fiber.child){
    return fiber.child
  }
  let nextFiber = fiber
  while(nextFiber){
    if(nextFiber.slibing){
      return nextFiber.slibing
    }
    // 没有兄弟元素，找父元素
    nextFiber = nextFiber.parent
  }
}

let wipFiber = null
let hookIndex = null
function useState(init){
  const oldHook = wipFiber.base && wipFiber.base.hooks && wipFiber.base.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state: init,
    queue: []
  }
  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => {
    hook.state = action
  })
  const setState = action => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      base: currentRoot
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }
  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  // 执行函数，传入props
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}
function updateHostComponent(fiber) {
  // 根据当前任务获取下一个
  if(!fiber.dom){
    // 不是入口
    fiber.dom = createDom(fiber)
  }
  // 真实的dom操作
  // if (fiber.parent){
  //   fiber.parent.dom.appendChild(fiber.dom)
  // }
  const elements = fiber.props.children
  reconcileChildren(fiber, elements)
}
// 调和子元素
function reconcileChildren(wipFiber, elements) {
  // 构建fiber
  let index = 0;
  let oldFiber = wipFiber.base && wipFiber.base.child
  let prevSlibing = null
  // while(index<elements.length){
  while(index<elements.length || oldFiber!=null){
    let element = elements[index]
    let newFiber = null

    // 对比oldfiber的状态和当前element
    const sameType = oldFiber && element && oldFiber.type === element.type

    if(sameType){
      // 复用节点，更新
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        base: oldFiber,
        effectTag: 'UPDATE'
      }
    }
    if(!sameType && element){
      // 替换
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        base: null,
        effectTag: 'PLACEMENT'
      }
    }
    if(!sameType && oldFiber){
      // 删除
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if(oldFiber){
      oldFiber = oldFiber.slibing
    }
    if(index === 0){
      wipFiber.child = newFiber
    }else{
      prevSlibing.slibing = newFiber
    }
    prevSlibing = newFiber
    index++
  }
}

// fiber = {
//   dom:  真实dom
//   parent: 父元素
//   child: 第一个子元素
//   slibing:兄弟元素
// }


class Component {
  constructor(props){
    this.props = props
  }
}
/**
 * 用hooks模拟
 */
function transefer(Component){
  return function(props){
    const component = new Component(props)
    let [state, setState] = useState(component.state)
    component.props = props
    component.state = state
    component.setState = setState
    return component.render();
  }
}

export default{
  createElement,
  render,
  useState,
  Component,
  transefer
}