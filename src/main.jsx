import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

function Controls({
  isMuted,
  toggleMute,
  isVideoDisabled,
  toggleVideo,
  shareScreen,
  isRecording,
  startRecording,
  stopRecording,
  endCall,
}) {
  return (
    <div className="controls">
      <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
      <button onClick={toggleVideo}>{isVideoDisabled ? 'Enable Video' : 'Disable Video'}</button>
      {!isMobile() && <button onClick={shareScreen}>Share Screen</button>}
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <button onClick={endCall}>End Call</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
