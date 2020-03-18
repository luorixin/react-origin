import React from './mReact'

class App extends React.Component{
  constructor(props){
    super(props)
    this.state={
      age: 18
    }
  }
  handleClick = () => {
    this.setState({
      age: this.state.age + 1
    })
  }
  render() {
    return <div>
      <h1>年龄: {this.state.age} 岁</h1>
      <button onClick = {this.handleClick}>累加</button>
    </div>
  }
}

export default React.transefer(App)