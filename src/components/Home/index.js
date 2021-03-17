import React, { Component, useState, useEffect } from 'react';
import { withAuthorization, AuthUserContext } from '../Session';
import { withFirebase } from '../Firebase';
import { jobs } from '../../constants/jobs';

import { Doughnut, Line, Bar } from 'react-chartjs-2';

const JobPostings = () => {
    const [jobData, setJobData] = useState(null);

    const openings = jobs.reduce((acc, value) => {
        //console.log(acc);
        //console.log(value.agency)

        // Check to see if a key with the name of the current agency (value.agency) already exists within our accumulator object.
        /*if (acc[value.agency]) {
            // key fanns!
            // add 1 to its existing value.
            acc[value.agency] = acc[value.agency] + 1
        } else {
            // key fanns icke!
            // Add it to the accumulator object and set its value to 1
            acc[value.agency] = 1;
        }*/
        acc[value.agency] = acc[value.agency] ? acc[value.agency] + 1 : 1;

        return acc
    }, {});
    useEffect(() => {
        console.log("Hej från useEffect")
        setJobData(openings)
    }, [])

    return (<>{jobData && <JobGraph data={jobData} />}</>);
}

const JobGraph = (props) => {
    const labels = Object.keys(props.data).slice(0, 5); // todo slice off the first 3
    const labelData = Object.values(props.data).slice(0, 5);; // todo slce
    console.log(labels);
    console.log(labelData)
    const data = {
        labels,
        datasets: [{
            data: labelData,
            backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56'
            ],
            hoverBackgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56'
            ]
        }]
    };

    return (<div>
        <h2>Job openings!</h2>
        <Bar data={data} />
    </div>)
}
const HomePage = () => (
    <div>
        <h1>Home</h1>
        <JobPostings />
        <p>The Home Page is accessible by every signed in user.</p>
        <Messages />
    </div>
);

class MessagesBase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            text: '',
            loading: false,
            messages: [],
        };
    }

    componentDidMount() {

        this.setState({ loading: true });
        this.props.firebase.messages().orderByChild('createdAt').on('value', snapshot => {
            const messageObject = snapshot.val();
            if (messageObject) {
                const messageList = Object.keys(messageObject).map(key => ({
                    ...messageObject[key],
                    uid: key,
                }));
                this.setState({ messages: messageList, loading: false });
            } else {
                this.setState({ messages: null, loading: false });
            }
            this.setState({ loading: false });
        });
    }

    componentWillUnmount() {
        this.props.firebase.messages().off();
    }

    onRemoveMessage = (uid) => {
        this.props.firebase.message(uid).remove();
    };

    onChangeText = event => {
        this.setState({ text: event.target.value });
    };

    onCreateMessage = (event, authUser) => {
        this.props.firebase.messages().push({
            text: this.state.text,
            userId: authUser.uid,
            createdAt: this.props.firebase.serverValue.TIMESTAMP,
        });
        this.setState({ text: '' });

        event.preventDefault();
    };

    onEditMessage = (message, text) => {
        const { uid, ...messageSnapshot } = message;
        this.props.firebase.message(message.uid).set({
            ...messageSnapshot,
            text,
            editedAt: this.props.firebase.serverValue.TIMESTAMP,
        });
    };

    render() {
        const { text, messages, loading } = this.state;
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div>
                        {loading && <div>Loading ...</div>}
                        {messages ? (
                            <MessageList messages={messages}
                                onRemoveMessage={this.onRemoveMessage}
                                onEditMessage={this.onEditMessage}
                                authUser={authUser} />
                        ) : (
                            <div>There are no messages ...</div>
                        )}
                        <form onSubmit={event => this.onCreateMessage(event, authUser)}>
                            <input
                                type="text"
                                value={text}
                                onChange={this.onChangeText}
                            />
                            <button type="submit">Send</button>
                        </form>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

const MessageList = ({ authUser, messages, onRemoveMessage, onEditMessage }) => (
    <ul>
        {messages.map(message => (
            <MessageItem key={message.uid}
                message={message}
                onRemoveMessage={onRemoveMessage}
                onEditMessage={onEditMessage}
                authUser={authUser} />
        ))} </ul>
);
class MessageItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editMode: false,
            editText: this.props.message.text,
        };
    }

    onToggleEditMode = () => {
        this.setState(state => ({
            editMode: !state.editMode,
            editText: this.props.message.text,
        }));
    };

    onChangeEditText = event => {
        this.setState({ editText: event.target.value });
    };
    onSaveEditText = () => {
        this.props.onEditMessage(this.props.message, this.state.editText);
        this.setState({ editMode: false });
    };

    render() {
        const { authUser, message, onRemoveMessage } = this.props;
        const { editMode, editText } = this.state;
        return (

            <li>

                {editMode ? (
                    <input
                        type="text"
                        value={editText}
                        onChange={this.onChangeEditText}
                    />) : (
                    <span>
                        <strong>{message.userId}</strong> {message.text}
                        {message.editedAt && <span>(Edited)</span>}
                    </span>
                )}
                {authUser.uid === message.userId && (
                    <span>
                        {editMode ? (
                            <span>
                                <button onClick={this.onSaveEditText}>Save</button>
                                <button onClick={this.onToggleEditMode}>Reset</button>
                            </span>
                        ) : (
                            <button onClick={this.onToggleEditMode}>Edit</button>
                        )}
                        {!editMode && (
                            <button
                                type="button"
                                onClick={() => onRemoveMessage(message.uid)}>
                                Delete
                            </button>
                        )}
                    </span>
                )}
            </li>);
    }
}

const Messages = withFirebase(MessagesBase);

const condition = authUser => !!authUser;

export default withAuthorization(condition)(HomePage);
