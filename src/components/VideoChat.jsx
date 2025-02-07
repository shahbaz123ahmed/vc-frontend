import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';

// Load environment variable
const socket = io(import.meta.env.VITE_BACKEND_URL);


const VideoChat = () => {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const userVideo = useRef();
  const peerVideo = useRef();
  const peerInstance = useRef(null);
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);

  useEffect(() => {
    const peer = new Peer();

    peer.on('open', (id) => {
      setPeerId(id);
      socket.emit('join', id);
    });

    peer.on('call', (call) => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        userVideo.current.srcObject = stream;
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          peerVideo.current.srcObject = remoteStream;
        });
      });
    });

    peerInstance.current = peer;

    return () => {
      peer.destroy();
    };
  }, []);

  const callPeer = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      userVideo.current.srcObject = stream;
      const call = peerInstance.current.call(remotePeerId, stream);
      call.on('stream', (remoteStream) => {
        peerVideo.current.srcObject = remoteStream;
      });
    });
  };

  const toggleMute = () => {
    const stream = userVideo.current.srcObject;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = !audioTracks[0].enabled;
      setIsMuted(!audioTracks[0].enabled);
    }
  };

  const toggleVideo = () => {
    const stream = userVideo.current.srcObject;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].enabled = !videoTracks[0].enabled;
      setIsVideoDisabled(!videoTracks[0].enabled);
    }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      userVideo.current.srcObject = screenStream;
      screenStream.getVideoTracks()[0].onended = () => {
        alert("Screen sharing stopped.");
      };
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const startRecording = () => {
    const stream = userVideo.current.srcObject;
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (event) => {
      recordedChunks.current.push(event.data);
    };
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = 'recording.webm';
      link.click();
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current.stop();
    setIsRecording(false);
  };

  const endCall = () => {
    const stream = userVideo.current.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    socket.emit('disconnect');
  };

  return (
    <div className="video-chat-container">
      {/* Peer ID and Input */}
      <div className="peer-info">
        <h2>WebRTC Video Call App</h2>
        <p>My Peer ID: <strong>{peerId}</strong></p>
        <input
          type="text"
          placeholder="Enter remote peer ID"
          value={remotePeerId}
          onChange={(e) => setRemotePeerId(e.target.value)}
        />
        <button onClick={callPeer}>Call</button>
      </div>

      {/* Video Container */}
      <div className="video-container">
        <video ref={peerVideo} autoPlay playsInline className="big-video" />
        <video ref={userVideo} autoPlay playsInline className="small-video" />
      </div>

      {/* Buttons */}
      <div className="controls">
        <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleVideo}>{isVideoDisabled ? 'Enable Video' : 'Disable Video'}</button>
        <button onClick={shareScreen}>Share Screen</button>
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button onClick={endCall}>End Call</button>
      </div>
    </div>
  );
};

export default VideoChat;