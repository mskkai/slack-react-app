import React from "react";
import { Segment, Comment } from "semantic-ui-react";
import MessagesHeader from "./MessagesHeader";
import MessageForm from "./MessageForm";
import firebase from "../../firebase";
import Message from "./Message";
import { connect } from "react-redux";
import { setUserPosts } from "../../actions";
import Typing from "./Typing";
import Skeleton from "./Skeleton";

class Messages extends React.Component {
  state = {
    isPrivateChannel: this.props.isPrivateChannel,
    messagesRef: firebase.database().ref("messages"),
    privateMessgesRef: firebase.database().ref("privateMessages"),
    channel: this.props.currentChannel,
    user: this.props.currentUser,
    messages: [],
    messagesLoading: true,
    numberOfUniqueUsers: 0,
    searchText: "",
    searchLoading: false,
    searchResults: [],
    isChannelStarred: false,
    usersRef: firebase.database().ref("users"),
    typingRef: firebase.database().ref("typing"),
    typingUsers: [],
    connectedRef: firebase.database().ref(".info/connected"),
    listeners: [],
  };

  componentDidMount() {
    const { user, channel, listeners } = this.state;

    if (user && channel) {
      this.removeListneres(listeners);
      this.addListeners(channel.id);
      this.addUserStarsListener(channel.id, user.uid);
    }
  }

  componentWillUnmount() {
    // this.state.messagesRef.off();
    this.removeListneres(this.state.listeners);
    this.state.connectedRef.off();
  }

  componentDidUpdate() {
    if (this.messagesEnd) {
      this.scrollToBottom();
    }
  }

  addToListeners = (id, ref, event) => {
    const index = this.state.listeners.findIndex((listener) => {
      return (
        listener.id === id && listener.ref === ref && listener.event === event
      );
    });

    if (index === -1) {
      const newListener = { id, ref, event };
      this.setState({ listeners: this.state.listeners.concat(newListener) });
    }
  };

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: "smooth" });
  };

  addListeners = (channelId) => {
    this.addMessagesListener(channelId);
    this.addTypingListeners(channelId);
  };

  addTypingListeners = (channelId) => {
    let typingUsers = [];
    this.state.typingRef.child(channelId).on("child_added", (snap) => {
      if (snap.key !== this.state.user.uid) {
        typingUsers = typingUsers.concat({
          id: snap.key,
          name: snap.val(),
        });

        this.setState({ typingUsers });
      }
    });

    this.addToListeners(channelId, this.state.typingRef, "child_added");

    this.state.typingRef.child(channelId).on("child_removed", (snap) => {
      const index = typingUsers.findIndex((user) => user.id === snap.key);
      if (index !== -1) {
        typingUsers = typingUsers.filter((user) => user.id !== snap.key);
        this.setState({ typingUsers });
      }
    });

    this.addToListeners(channelId, this.state.typingRef, "child_removed");

    this.state.connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        this.state.typingRef
          .child(channelId)
          .child(this.state.user.uid)
          .onDisconnect()
          .remove((err) => {
            if (err !== null) {
              console.error(err);
            }
          });
      }
    });
  };

  addMessagesListener = (channelId) => {
    let loadMessages = [];
    const ref = this.getMessagesRef();
    ref.child(channelId).on("child_added", (snap) => {
      loadMessages.push(snap.val());
      this.setState({ messages: loadMessages, messagesLoading: false });
      this.loadUniqueUsers(loadMessages);
      this.countUserPosts(loadMessages);
    });
    this.addToListeners(channelId, ref, "child_added");
  };

  addUserStarsListener = (channelId, userUid) => {
    this.state.usersRef
      .child(userUid)
      .child("starred")
      .once("value")
      .then((data) => {
        if (data.val() !== null) {
          const channelIds = Object.keys(data.val());
          const prevStarred = channelIds.includes(channelId);
          this.setState({ isChannelStarred: prevStarred });
        }
      });
  };
  getMessagesRef = () => {
    const { messagesRef, privateMessgesRef, isPrivateChannel } = this.state;
    return isPrivateChannel ? privateMessgesRef : messagesRef;
  };

  handleStar = () => {
    this.setState(
      (prevState) => ({
        isChannelStarred: !prevState.isChannelStarred,
      }),
      () => this.starChannel()
    );
  };

  starChannel = () => {
    if (this.state.isChannelStarred) {
      this.state.usersRef.child(`${this.state.user.uid}/starred`).update({
        [this.state.channel.id]: {
          name: this.state.channel.name,
          details: this.state.channel.details,
          createdBy: {
            name: this.state.channel.createdBy.name,
            avatar: this.state.channel.createdBy.avatar,
          },
        },
      });
    } else {
      this.state.usersRef
        .child(`${this.state.user.uid}/starred`)
        .child(this.state.channel.id)
        .remove((err) => {
          if (err != null) {
            console.log(err);
          }
        });
    }
  };

  countUserPosts = (messages) => {
    let userPosts = messages.reduce((acc, message) => {
      if (message.user.name in acc) {
        acc[message.user.name].count += 1;
      } else {
        acc[message.user.name] = {
          avatar: message.user.avatar,
          count: 1,
        };
      }
      return acc;
    }, {});

    this.props.setUserPosts(userPosts);
  };

  loadUniqueUsers = (messages) => {
    const uniqueUsers = messages.reduce((acc, curr) => {
      if (!acc.includes(curr.user.name)) {
        acc.push(curr.user.name);
      }
      return acc;
    }, []);

    const isPlural = uniqueUsers.length > 1 || uniqueUsers.length === 0;
    const numberOfUniqueUsers = `${uniqueUsers.length} User${
      isPlural ? "s" : ""
    }`;
    this.setState({ numberOfUniqueUsers });
  };

  handleSearchChange = (event) => {
    this.setState(
      {
        searchText: event.target.value,
        searchLoading: true,
      },
      () => {
        this.handleSearchMessages();
      }
    );
  };

  handleSearchMessages = () => {
    const channelMessages = [...this.state.messages];
    const regexExp = new RegExp(this.state.searchText, "gi");
    const searchResults = channelMessages.reduce((acc, message) => {
      if (
        (message.content && message.content.match(regexExp)) ||
        message.user.name.match(regexExp)
      ) {
        acc.push(message);
      }
      return acc;
    }, []);

    this.setState({ searchResults });
    setTimeout(() => {
      this.setState({ searchLoading: false });
    }, 1000);
  };

  removeListneres = (listeners) => {
    listeners.forEach((listener) => {
      listener.ref.child(listener.id).off(listener.event);
    });
  };

  displayMessages = (messages) =>
    messages.length > 0 &&
    messages.map((message) => (
      <Message
        key={message.timestamp}
        message={message}
        user={this.state.user}
      />
    ));

  displayTypingUsers = (users) =>
    users.length > 0 &&
    users.map((user) => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "0.2em",
        }}
        key={user.id}
      >
        <span className="user__typing">{user.name} is typing</span>
        <Typing />
      </div>
    ));

  displayMessagesSkeleton = (loading) =>
    loading ? (
      <React.Fragment>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i}></Skeleton>
        ))}
      </React.Fragment>
    ) : null;

  displayChannelName = (channel) =>
    channel ? `${this.state.isPrivateChannel ? "@" : "#"}${channel.name}` : "";

  render() {
    const {
      channel,
      user,
      messages,
      numberOfUniqueUsers,
      searchText,
      searchResults,
      searchLoading,
      isPrivateChannel,
      isChannelStarred,
      messagesLoading,
      typingUsers,
    } = this.state;

    return (
      <React.Fragment>
        <MessagesHeader
          numberOfUniqueUsers={numberOfUniqueUsers}
          channelName={this.displayChannelName(channel)}
          handleSearchChange={this.handleSearchChange}
          searchLoading={searchLoading}
          isPrivateChannel={isPrivateChannel}
          handleStar={this.handleStar}
          isChannelStarred={isChannelStarred}
        />
        <Segment>
          <Comment.Group className="messages">
            {this.displayMessagesSkeleton(messagesLoading)}
            {searchText
              ? this.displayMessages(searchResults)
              : this.displayMessages(messages)}
            {this.displayTypingUsers(typingUsers)}
            <div ref={(node) => (this.messagesEnd = node)}></div>
          </Comment.Group>
        </Segment>
        <MessageForm
          currentChannel={channel}
          currentUser={user}
          messagesRef={this.getMessagesRef()}
          isPrivateChannel={isPrivateChannel}
        />
      </React.Fragment>
    );
  }
}

export default connect(null, { setUserPosts })(Messages);
