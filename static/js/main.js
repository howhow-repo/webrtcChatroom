var usernameInput = document.querySelector('#username');
var btnJoin = document.querySelector('#btn-join');
var username;
var webSocket;

var mapPeers = {}; // mapPeers[peerUsername] = [peer, peer.dc]
                   // [<RTCPeerConnection>, <DataChannel>]

var messageInput = document.querySelector('#msg');
var messageList = document.querySelector('#message-list');

var btnSendMessage = document.querySelector('#btn-send-msg');
btnSendMessage.addEventListener('click', sendMsgOnClick);


function webSocketOnMessage(event) {
    /*
        Actions that client side will do when receiving websocket data from django server.
    */

    var parsedData = JSON.parse(event.data);
    /*
        in our design, websockets data send by consumer.py will be in json style.
        with th format like: {
            'peer': <string, the sender's username>
            'action': <string, the sender's intense>
            'message': <any, payload>
        }
    */

    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];

    if (peerUsername == username) { // Do nothing when the data is send by ourself.
        return;
    }

    var receiver_channel_name = parsedData['message']['receiver_channel_name']
    /*
        actually, in this period, this is save the sender's channel name.
    */

    if (action == 'new-peer'){
        createOffer(peerUsername, receiver_channel_name);
        return;
    }

    if(action == 'new-offer'){
        var offer = parsedData['message']['sdp'];
        createAnswer(offer, peerUsername, receiver_channel_name);
        return;
    }

    if(action == 'new-answer'){
        var answer = parsedData['message']['sdp'];
        var peer = mapPeers[peerUsername][0];
        peer.setRemoteDescription(answer);
        return;
    }
}

btnJoin.addEventListener('click', function() {
    username = usernameInput.value;
    console.log('username:', username);
    if(username=='') { // can not use empty string as username.
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;

    var loc = window.location;
    var wsStart = "ws://"
    if(loc.protocol == "https:") {
        wsStart = 'wss://';
    }
    var endPoint = wsStart + loc.host + loc.pathname; // create websockets url.

    console.log('endPoint:', endPoint)

    webSocket = new WebSocket(endPoint); // create websockets connection with django server.

    webSocket.addEventListener('open', (e) => {
        console.log("Connection Opened")
        sendSignal('new-peer', {})  // when websockets connection was created, send a message to django server consumer.
    });

    webSocket.addEventListener('message',webSocketOnMessage);

    webSocket.addEventListener('close', (e) => {
        console.log("Connection Closed")
    });

    webSocket.addEventListener('error', (e) => {
        console.log("Error occurred")
    });
})


// var localStream = new MediaStream();

const constraints = { // UserMedia config (stream video + audio)
    'video': true,
    'audio': true
}

const localVideo = document.querySelector('#local-video')

const btnToggleAudio = document.querySelector('#btn-toggle-audio')
const btnToggleVideo = document.querySelector('#btn-toggle-video')

var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    /*
        init and show client's media stream.
        save self Audio & Video track as object.
    */
    .then( stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        var audioTrack = stream.getAudioTracks();
        var videoTrack = stream.getVideoTracks();

        audioTrack[0].enabled = true;
        videoTrack[0].enabled = true;

        btnToggleAudio.addEventListener('click',() => {
            audioTrack[0].enabled = !audioTrack[0].enabled;
            if(audioTrack[0].enabled){
                btnToggleAudio.innerHTML = 'Audio Mute';
                return;
            }
            btnToggleAudio.innerHTML = 'Audio Unmute';
        });


        btnToggleVideo.addEventListener('click',() => {
            videoTrack[0].enabled = !videoTrack[0].enabled;
            if(videoTrack[0].enabled){
                btnToggleVideo.innerHTML = 'Video OFF';
                return;
            }
            btnToggleVideo.innerHTML = 'Video ON';
        })

    })
    .catch(error => {
        console.log('Error when accessingmedia devices: ', error);
    })

function sendSignal(action, message){
    var jsonStr = JSON.stringify({
            'peer': username,
            'action':action,
            'message':message,
    });
    webSocket.send(jsonStr);
}

function createOffer(peerUsername, receiver_channel_name ){
    var peer = new RTCPeerConnection(null); //TODO: This 'null' will only allow local connection.
                                            //TODO: To use remote connection, need more research on turn server credential.
    addLocalTracks(peer);
    var dc = peer.createDataChannel('channel'); // dc means data channel
    dc.addEventListener('open', () => {
        console.log('Connection opened!: ', username);
    })
    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];
            if (iceConnectionState != 'closed'){
                peer.close();
            }
            removeVideo(remoteVideo)
        }
    });

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => {
            console.log('Local description set successfully.')
    });

    peer.addEventListener('icecandidate', (event) => {
    /*
        An icecandidate event is sent to an RTCPeerConnection when an RTCIceCandidate has been identified
        and added to the local peer by a call to RTCPeerConnection.setLocalDescription().
    */
        if (event.candidate){
            // console.log('new ice candidate: ',JSON.stringify(peer.localDescription));
            return;
        }
        console.log("send new offer ->")
        sendSignal('new-offer',{
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name,
        })
    });

}


function createAnswer(offer, peerUsername, receiver_channel_name){
    var peer = new RTCPeerConnection(null); //TODO: This 'null' will only allow local connection.
                                            //TODO: To use remote connection, need more research on turn server credential.
    addLocalTracks(peer);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log('Connection opened!: ', username);
        })
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
    })

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];
            if (iceConnectionState != 'closed'){
                peer.close();
            }
            removeVideo(remoteVideo)
        }
    });

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log("Remote description set successfully for %s", peerUsername);
            var a = peer.createAnswer();
            console.log('Answer created!');
            peer.setLocalDescription(a);
            return
        })

    peer.addEventListener('icecandidate', (event) => {
    /*
        An icecandidate event is sent to an RTCPeerConnection when an RTCIceCandidate has been identified
        and added to the local peer by a call to RTCPeerConnection.setLocalDescription().
    */
        if (event.candidate){
            // console.log('new ice candidate: ',JSON.stringify(peer.localDescription));
            return;
        }
        console.log("send new answer ->")
        sendSignal('new-answer',{
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name,
        })
    });

}


function sendMsgOnClick(){
    var message = messageInput.value;
    var li = document.createElement('li');
    li.appendChild(document.createTextNode('ME:' + message));
    messageList.appendChild(li);

    var dataChannels = getDataChannels();

    message = username + ': ' + message;
    for(index in dataChannels){
        dataChannels[index].send(message);
    }
    console.log("Send message to: ", dataChannels)
    messageInput.value = '';
}


function addLocalTracks(peer){
    /*
        attach self media stream to peer connection.
    */
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    })
    return;
}


function dcOnMessage(event){
    var message = event.data;
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}


function createVideo(peerUsername){
    /*
        create a video window on the current html page.
    */
    var videoContainer = document.querySelector('#video-container');
    var remoteVideo = document.createElement('video');
    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');
    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo);
    return remoteVideo;
}


function setOnTrack(peer, remoteVideo){
    /*
        attach a peer connection to the video window on html.
    */
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;
    peer.addEventListener('track', async => {
        remoteStream.addTrack(event.track, remoteStream);
    })
}


function removeVideo(video){
    var videoWrapper = video.parentNode;
    videoWrapper.parentNode.removeChild(videoWrapper);
}

function getDataChannels(){
    /*
        get all current peer connection channel.
        return a list of channel.
    */
    var dataChannels = [];
    console.log('now mapPeers: ',mapPeers)
    for (peerUsername in mapPeers){
        var Channel = mapPeers[peerUsername][1];
        dataChannels.push(Channel);
    }
    return dataChannels
}