var Note = React.createClass({
        // when the app loads, what I want to see:
        getInitialState() {
          return {editing: false}
        },
        componentWillMount() {
          this.style = {
            right: this.randomBetween(0, window.innerWidth - 150, 'px'),
            top: this.randomBetween(0, window.innerHeight - 150, 'px')
          }
        },
        componentDidUpdate() {
          if (this.state.editing) {
            this.refs.newText.focus()
            this.refs.newText.select()
          }
        },
        // This will prevent unnecessary rendering if NOTHING has changed (no edit was made)
        shouldComponentUpdate(nextProps, nextState) {
          return this.props.children !== nextProps.children ||
                 this.state !== nextState
        },
        randomBetween(x, y, s) {
          return (x + Math.ceil(Math.random() * (y-x))) + s
        },
        edit() {
          this.setState({editing: true})
        },
        save(){
          this.props.onChange(this.refs.newText.value,
                              this.props.id)
          this.setState({editing: false})
        },
        cancel(){
          this.setState({editing: false})
        },
        remove() {
          this.props.onRemove(this.props.id)
        },
        renderForm(){
          return (
            <div className="note" style={this.style}>
              <textarea ref="newText"
                         defaultValue={this.props.children}></textarea>
              <button onClick={this.save}>SAVE</button>
              <button onClick={this.cancel}>CANCEL</button>
            </div>
          )
        },
        renderDisplay(){
          return (
            <div className="note" style={this.style}>
              <p>{this.props.children}</p>
              <span>
                <button onClick={this.edit}>EDIT</button>
                <button onClick={this.remove}>X</button>
              </span>
            </div>
          )
        },
        render(){
          return (
            <ReactDraggable>
              {(this.state.editing) ? this.renderForm() : this.renderDisplay()}
            </ReactDraggable>
          )
        }
      })

      var Board = React.createClass({
        propTypes: {
          count: function(props, propName) {
            if(typeof props[propName] !== "number") {
              return new Error("the count must be a number")
            }

            if(props[propName] > 100) {
              return new Error("Creating " + props[propName] + " notes is ridiculous")
            }
          }
        },
        getInitialState() {
          return {
            notes: []
          }
        },
        componentWillMount(){
          if (this.props.count) {
            var url = `https://baconipsum.com/api/?type=all-meat&sentences=${this.props.count}`
            fetch(url)
                .then(results => results.json())
                .then(array => array[0])
                .then(text => text.split('. '))
                .then(array => array.forEach(
                    sentence => this.add(sentence)))
                .catch(function(err) {
                  console.log("Didn't connect to the API", err)
                })
          }
        },
        nextId(){
          this.uniqueId = this.uniqueId || 0
          return this.uniqueId++
        },
        add(text) {
          var notes = [
            ...this.state.notes,
            {
              id: this.nextId(),
              note: text
            }
          ]
          this.setState({notes})
        },
        update(newText, id) {
          var notes = this.state.notes.map(
            note => (note.id !== id) ? note :
              {
                ...note,
                note: newText
              }
          )
          this.setState({notes})
        },
        remove(id) {
          // Create a new copy of the array but without the note with the matching id.
          var notes = this.state.notes.filter(note => note.id !== id)
          this.setState({notes})
        },
        eachNote(note) {
          return (<Note key={note.id}
                       id={note.id}
                       onChange={this.update}
                       onRemove={this.remove}>{note.note}</Note>)
        },
        render(){
          return (
            <div className='board'>
              {this.state.notes.map(this.eachNote)}
              <button onClick={()=> this.add("new note")}>+</button>
            </div>
          )
        }
      })
      ReactDOM.render(<Board count={10}/>, document.getElementById('react-container'))