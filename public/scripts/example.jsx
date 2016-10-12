var CommentBox = React.createClass({
  loadCommentsFromServer: function() {
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString);
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {
    this.loadCommentsFromServer();
    setInterval(this.loadCommentsFromServer, this.props.pollInterval)
  },
  handleCommentDelete: function(comment) {
    var comments = this.state.data;
    var optimistic = comments.filter(function(c) {
      return c.id != comment.id
    });
    $.ajax({
      url: this.props.url + "?id=" + comment.id,
      dataType: 'json',
      method: 'DELETE',
      cache: false,
      success: function(data) {
        this.setState({data: optimistic});
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({data: comments})
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  handleCommentSubmit: function(comment) {
    var comments = this.state.data;

    // optimistic id
    // will be replaced by the server
    comment.id = Date.now();

    var optimistic = comments.concat([comment]);

    this.setState({data: optimistic});

    $.ajax({
      url: this.props.url,
      method: 'POST',
      dataType: 'json',
      data: comment,
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({data: comments})
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  render: function() {
    return (
      <div className="commentBox">
        <CommentList url={this.props.url} data={this.state.data} onDelete={this.handleCommentDelete} />
        <CommentForm onCommentSubmit={this.handleCommentSubmit} />
      </div>
    );
  }
});

var CommentList = React.createClass({
  render: function() {
    var onDelete = this.props.onDelete;
    var commentNodes = this.props.data.map(function(comment) {
      return (
        <Comment url={this.props.url} author={comment.author} key={comment.id} id={comment.id} onDelete={onDelete} text={comment.text} />
      );
    }.bind(this));

    return (
      <div className="commentList">
        {commentNodes}
      </div>
    );
  }
});

var CommentForm = React.createClass({
  flashMessage: function(message) {
    this.setState({'flash': message})
  },
  clearForm: function() {
    this.setState({author: '', text: '', 'flash': ''});
  },
  getInitialState: function() {
    return {author: this.props.author, text: this.props.text};
  },
  handleAuthorChange: function(e) {
    this.setState({author: e.target.value});
  },
  handleTextChange: function(e) {
    this.setState({text: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var author = this.state.author.trim();
    var text = this.state.text.trim();

    if (!text || !author) {
      this.flashMessage('Please provide a author and a comment')
      return;
    }

    this.props.onCommentSubmit({author: author, text: text});

    this.clearForm();
  },
  handleReset: function(e) {
    e.preventDefault();
    this.clearForm();
  },
  render: function() {
    var flashMessage = null;
    if (this.state.flash) {
      flashMessage = (
        <div className="alert alert-danger animated fadeIn">
          {this.state.flash}
        </div>
      );
    }
    return (
      <form className="commentForm" onSubmit={this.handleSubmit}>
        {flashMessage}

        <div className="form-group">
          <input
            type="text"
            placeholder="Your name"
            className="form-control"
            value={this.state.author}
            onChange={this.handleAuthorChange}
            />
        </div>
        <div className="form-group">
          <textarea value={this.state.text} className="form-control" rows="3" onChange={this.handleTextChange} placeholder="Write your comment here...">
          </textarea>
        </div>

        <div className="form-group">
          <input type="submit" value="Post" className="btn btn-primary"/>
          <input type="reset" value="Cancel" className="btn" onClick={this.clearForm}/>
        </div>

      </form>
    )
  }
});

var Comment = React.createClass({
  rawMarkup: function() {
    var md = new Remarkable();
    var rawMarkup = md.render(this.state.text);
    return { __html: rawMarkup };
  },

  handleDeleteClick: function() {
    this.props.onDelete({'id': this.props.id});
  },

  handleEditClick: function() {
    this.setState({'edit': !this.state.edit});
  },

  handeCommentUpdate: function(comment) {
    var oldComment = {'author': this.props.author, 'text': this.props.text}
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      method: 'PUT',
      data: {'id': this.props.id, 'author': comment.author, 'text': comment.text},
      cache: false,
      success: function(data) {
        console.log('success')
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState(oldComment);
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });

    this.setState(comment);
    this.setState({'edit': false});
  },

  getInitialState: function() {
    return {'edit': false, 'author': this.props.author, 'text': this.props.text};
  },

  render: function() {
    var comment;

    if (this.state.edit) {
      comment = (
        <CommentForm author={this.state.author} text={this.state.text} onCommentSubmit={this.handeCommentUpdate} />
      );
    } else {
      comment = (
        <div>
          <h2 className="comment" onDoubleClick={this.handleEditClick}>
            {this.state.author}
          </h2>

          <span dangerouslySetInnerHTML={this.rawMarkup()} />
        </div>
      );
    }

    return (
      <div className="comment well well well">
        <div className="buttons">
          <span className="glyphicon glyphicon-remove" aria-hidden="true" onClick={this.handleDeleteClick}></span>
          <span className="glyphicon glyphicon-edit" aria-hidden="true" onClick={this.handleEditClick}></span>
        </div>

        {comment}
      </div>
    );
  }
});

ReactDOM.render(
  <CommentBox url="/api/comments" pollInterval={2000}/>,
  document.getElementById('content')
);