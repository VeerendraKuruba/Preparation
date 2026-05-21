import React, { useState, useEffect, useRef } from 'react';
import './CountdownTimer.css';

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds (default)
  const [isRunning, setIsRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(300);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (timeLeft > 0) {
      setIsRunning(true);
    }
  };

  const handlePauseResume = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(initialTime);
  };

  const handleTimeChange = (minutes) => {
    const newTime = minutes * 60;
    setInitialTime(newTime);
    if (!isRunning) {
      setTimeLeft(newTime);
    }
  };

  return (
    <div className="countdown-timer">
      <h1>Countdown Timer</h1>
      
      <div className="timer-display">
        <div className="time">{formatTime(timeLeft)}</div>
        {timeLeft === 0 && <div className="finished">Time's Up!</div>}
      </div>

      <div className="time-input">
        <label>Set Time (minutes):</label>
        <input
          type="number"
          min="1"
          max="60"
          value={Math.floor(initialTime / 60)}
          onChange={(e) => handleTimeChange(parseInt(e.target.value) || 1)}
          disabled={isRunning}
        />
      </div>

      <div className="controls">
        {!isRunning && timeLeft > 0 && (
          <button onClick={handleStart} className="btn btn-start">
            Start
          </button>
        )}
        {isRunning && (
          <button onClick={handlePauseResume} className="btn btn-pause">
            Pause
          </button>
        )}
        {!isRunning && timeLeft < initialTime && timeLeft > 0 && (
          <button onClick={handlePauseResume} className="btn btn-resume">
            Resume
          </button>
        )}
        <button onClick={handleReset} className="btn btn-reset">
          Reset
        </button>
      </div>
    </div>
  );
};

export default CountdownTimer;


