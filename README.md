# Web RTC Chatroom
<hr>


### This django server work with Redis. <br> **Please run redis on localhost:6379**

## Introduction: 
A self study of building webrtc chatroom with streaming webcam. <br>
https://www.youtube.com/watch?v=MBOlZMLaQ8g <br>
Without https, this website can only work in localhost, or via ngrok and make it works on LAN.

## Installation:
1. redis:
   1. start docker 
   2. `docker run --name my-redis -p 6379:6379 -d redis`
   

2. Django server:
   1. clone source code
   2. `cd webrtcChatroom`
   3. `python -m venv venv`
   4. `source venv/bin/activate`
   5. `pip install -r requirements.txt`
   6. `python manage.py runserver 0.0.0.0:8000`


3. run ngrok:
   1. `ngrok http 8000`
<hr>
   
## Study Notes:
### [Django channels](https://channels.readthedocs.io/en/stable/):
#### intro:
[Django Channels](https://channels.readthedocs.io/en/stable/) is an app that allows client start a web socket connection with django server. 
It also allows developer define behaviours of server whenever the server get message from client.

[Django channels](https://channels.readthedocs.io/en/stable/) support since django v3.0 when ASGI support available. 
It doesn't mean you can't use channels with django2, it just needs more setup work with it.

<br><br>

There are some files to create and setup for django channels to run.
I'll try to explain the character of each file, and what they do.

1. **"consumers.py"**: This is somehow works like views.py file, but for the websocket.
Everytime when a new connection is created, a new consumer instance will be created, and be responsible to handle the receiving data from client.
What special is these consumer instances can communicate with each other.
By using channel_layer commends like `self.channel_layer.send()`or `self.channel_layer.group_send()`, one consumer can pass message to the client on another web socket connection.
The consumer instance will be killed after the connection is closed.
2. **"asgi.py"**: not like wsgi(Web Server Gateway Interface), web socket is an async structure.
So we have to use asgi(Asynchronous Server Gateway Interface) as our interface in production.

3. **routing.py**: This is like urls.py file for web socket. 
It maps different consumers (we can write many consumers for different cases) to connections that came from different url.

<br><br>

#### Case study:
In this project, our django channels are used for sdp exchanging.
sdp (Session Description Protocol) is like a personal information pack. 
Two peers need sdp form each other for creating p2p connection.

We only got one page on this site, so we keep path in urls.py & routing.py with "</empty string>".

In the consumers.py, we define reaction of server when "connect", "disconnect", "receive".
"connect" & "disconnect" are simple. 

About the behavior in "receive", we'll describe it when we go throw the webrtc part.

### [WebRTC](https://webrtc.org/): 
#### intro:
WebRTC (real-time communication) allows user create p2p connections via javascript running on browser. 
It supports video, voice, and generic data to be sent between peers. 
I'll describe some terms and objects we may use later.
1. sdp
2. data channel
3. audioTrack/videoTrack
4. RTCPeerConnection
5. icecandidate
