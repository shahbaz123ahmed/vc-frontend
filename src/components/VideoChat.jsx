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
  const [stream, setStream] = useState(null);
  const userVideo = useRef();
  const peerVideo = useRef();
  const peerInstance = useRef(null);
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);

  // Modify the getUserMedia calls with audio constraints
  const mediaConstraints = {
    video: true,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  };

  useEffect(() => {
    const peer = new Peer();
    
    const initializeStream = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setStream(mediaStream);
        userVideo.current.srcObject = mediaStream;
      } catch (err) {
        console.error('Failed to get media stream:', err);
      }
    };

    initializeStream();
    
    peer.on('open', (id) => {
      setPeerId(id);
      socket.emit('join', id);
    });

    peer.on('call', (call) => {
      call.answer(stream);
      call.on('stream', (remoteStream) => {
        peerVideo.current.srcObject = remoteStream;
      });
    });

    peerInstance.current = peer;

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      peer.destroy();
    };
  }, []);

  const callPeer = () => {
    if (!stream) {
      console.error('Local stream not initialized');
      return;
    }
    
    const call = peerInstance.current.call(remotePeerId, stream);
    call.on('stream', (remoteStream) => {
      peerVideo.current.srcObject = remoteStream;
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

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const shareScreen = async () => {
    if (isMobile()) {
      alert('Screen sharing is not fully supported on mobile devices. Please use a desktop browser for this feature.');
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Save the original stream to revert back later
      const originalStream = userVideo.current.srcObject;

      // Replace all tracks
      const senders = peerInstance.current.getSenders();
      const tracks = screenStream.getTracks();

      for (const sender of senders) {
        const track = tracks.find(t => t.kind === sender.track.kind);
        if (track) {
          sender.replaceTrack(track);
        }
      }

      userVideo.current.srcObject = screenStream;

      // Handle stream end
      screenStream.getVideoTracks()[0].onended = () => {
        // Revert back to original stream
        const senders = peerInstance.current.getSenders();
        const tracks = originalStream.getTracks();

        for (const sender of senders) {
          const track = tracks.find(t => t.kind === sender.track.kind);
          if (track) {
            sender.replaceTrack(track);
          }
        }
        userVideo.current.srcObject = originalStream;
      };
    } catch (err) {
      console.error('Error sharing screen:', err);
      alert('Failed to share screen: ' + err.message);
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
        <video 
          ref={peerVideo} 
          autoPlay 
          playsInline 
          className="big-video"
          volume={0.5} // Adjust this value as needed (0.0 to 1.0)
        />
        <video 
          ref={userVideo} 
          autoPlay 
          playsInline 
          className="small-video"
          muted // Always mute local video to prevent feedback
        />
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