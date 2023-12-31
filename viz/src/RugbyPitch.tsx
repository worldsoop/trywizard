import React, { useEffect, useState, useRef, useMemo } from 'react';
import { DashboardPartitionState } from './dashboard_state';
import rugbyPitchImage from './assets/pitch-background.png';
import ballImage from './assets/trywizard-ball.png';
import './App.css';


const RugbyPitch: React.FC = () => {
  const [data, setData] = useState<{
    cumulativeTimesteps: number;
    partitionIndex: number;
    state: number[];
  }[]>([]);
  const [selectedPartitionIndex, setSelectedPartitionIndex] = useState<string | null>(null);
  const [scoreboard, setScoreboard] = useState<number[]>([0, 0]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentEvent, setCurrentEvent] = useState<string>("");
  var gameStates: {[value: number] : string; } = {
    0:  "Penalty",
    1:  "Free Kick",
    2:  "Goal",
    3:  "Drop Goal",
    4:  "Try",
    5:  "Kick Phase",
    6:  "Run Phase",
    7:  "Knock-on",
    8:  "Scrum",
    9:  "Lineout",
    10: "Ruck",
    11: "Maul",
    12: "Kickoff",
  };

  // create a memoized version of a function that generates the datasets
  const datasets = useMemo(() => {
    const result: { [partitionIndex: string]: {
      label: string;
      data: {
        time: number;
        state: number;
      }[];
    }[]} = {};

    data.forEach((datum) => {
      for (let index = 0; index < datum.state.length; index++) {
        const partitionIndexString = String(datum.partitionIndex);

        if (!(partitionIndexString in result)) {
          result[partitionIndexString] = [];
        }

        if (!(index in result[partitionIndexString])) {
          result[partitionIndexString].push({
            label: `Element ${index}`,
            data: [{
              time: datum.cumulativeTimesteps,
              state: datum.state[index],
            }],
          });
        } else {
          result[partitionIndexString][index].data.push({
            time: datum.cumulativeTimesteps,
            state: datum.state[index],
          })
        }
      }
    });

    return result;
  }, [data]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:2112/dashboard');
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = async (event: MessageEvent) => {
      const decodedMessage = DashboardPartitionState.deserializeBinary(event.data);
      setData((prevData) => [
        {
          cumulativeTimesteps: decodedMessage.cumulative_timesteps, 
          partitionIndex: decodedMessage.partition_index, 
          state: decodedMessage.state
        },
      ]);

      setScoreboard([decodedMessage.state[4], decodedMessage.state[5]]);
      setCurrentTime(decodedMessage.cumulative_timesteps);
      setCurrentEvent(gameStates[decodedMessage.state[0]]);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    return () => {
      ws.close();
    };
  }, []);

  // Implement a function to update the selected partitionIndex
  const handlePartitionIndexChange = (partitionIndex: string) => {
    setSelectedPartitionIndex(partitionIndex);
  };

  return (
    <div>
      <div className="flex items-center justify-center h-64 border border-gray-300 rounded-lg p-4">
        <div className="rugby-pitch-container">
          <div className="pitch-image-wrapper">
            <img src={rugbyPitchImage} alt="Rugby Pitch" className="rugby-pitch-image" />
            {data.map((datum, index) => (
              <div
                key={index}
                className="ball-image"
                style={{
                  position: 'absolute',
                  gridArea: 'center',
                  bottom: `${110.0 * (datum.state[3]) / 70.0}%`,
                  left: `${97.5 * (datum.state[2]) / 100.0}%`,
                  transition: 'top 0.5s ease-in-out, left 0.5s ease-in-out',
                }}
              >
                <img
                  src={ballImage}
                  alt="Rugby Ball"
                  width="30"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="scoreboard-container">
          <p><strong>Score:</strong> Home - {scoreboard[0]} | Away - {scoreboard[1]}</p>
          <p><strong>Time:</strong> {currentTime}</p>
          <p><strong>Event:</strong> {currentEvent}</p>
        </div>
      </div>
      <div>
        <div>
          {Object.entries(datasets).map(([k, v]) => (
            <button
              key={k}
              onClick={() => handlePartitionIndexChange(k)}
            >
              Show Partition {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RugbyPitch;