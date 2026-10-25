/*
import React from 'react'
import {useState, useEffect} from 'react';
import {Link} from 'react-router-dom';
import { useSearchParams } from "react-router";
import { Chess } from "chess.js"; // install with: npm install chess.js
import { Chessboard } from "react-chessboard"; 

function Game() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [socket, setsocket]  = useState(null);

    const [iserror, setiserror] = useState(false);
    const [errormessage, seterrormessage] = useState('');


    //game setup
    const [game,setgame] = useState(null);
    const [fen, setFen] = useState('start');
    const [orientation, setorientation] = useState('white');
    const [opponent, setopponent] = useState('');

    //room
    const name = searchParams.get('name');
    const roomid = searchParams.get('id');

    //states of chess winning and losing
    const [iswon, setiswon] = useState(false);
    const [isdraw, setisdraw] = useState(false);
    const [isStalemate, setisstalemate]  = useState(false);

    //winner
    const [winner, setwinner] = useState('');

    //draw 
    const [isdrawnotification, setisdrawnotification] = useState(false);
    const [drawmessage, setdrawmessage]  = useState('');
    const [drawrequest, setdrawrequest] = useState(false);
    const [rejectmessage, setrejectmessage] = useState('');

    //resign
    const [isresign, setisresign] = useState(false);
    const [wonbyresign, setwonbyresign] = useState('');

    

    const handleSideSelect = (side) => {
      const chess = new Chess();
      setgame(chess);
      setFen(chess.fen());
      setorientation(side)
      setisdraw(false);
      setisdrawnotification(false);
      setdrawrequest(false);
      setiswon(false);
      setisresign(false);
      setrejectmessage('');

    }

    const handledraw = ()=>{
      setdrawrequest(true);
      setrejectmessage('');

      const msgtosend = {
        type: 'request',
        msg: `${name} requests to draw`,
        roomid: roomid,
      }
      socket.send(JSON.stringify(msgtosend))
    }

    const acceptdraw = ()=>{
      setisdraw(true);
      setisdrawnotification(false);

      const msgtosend = {
        type: 'acceptance',
        roomid: roomid,
      }
      socket.send(JSON.stringify(msgtosend));
      setgame(null);


    }
    const rejectdraw = ()=>{
      setisdrawnotification(false);
      setisdraw(false);
      const msgtosend = {
        type: 'rejection',
        roomid: roomid,
      }
      socket.send(JSON.stringify(msgtosend));

    }

    const handleresign = ()=>{
      setisresign(true);
      setgame(null);

      const msgtosend = {
        type: 'resign',
        roomid: roomid,
        msg: `${name} has resigned. You Have Won!!`
      }
      socket.send(JSON.stringify(msgtosend));

    }

    const handlemove = (from, to)=>{
      const move = game.move({ from, to, promotion: "q" });
      let result = null
      if (move){
        setFen(game.fen())
        if(game.isCheckmate()){
          result = 'won'
          setiswon(true)
          setwinner(name);
        }
        if(game.isDraw()){
          setisdraw(true)
          result = 'draw'
        }
        if(game.isStalemate()){
          setisstalemate(true);
          result = 'stalemate'
        }
        socket.send(JSON.stringify({
          move: { from, to, promotion: "q" },
          type: 'move',
          roomid: roomid,
          result:result,
          winner: name,
        }))
      } 
      return !!move
    }
    useEffect(()=>{
      const newsocket = new WebSocket('ws://localhost:4000');
      newsocket.onopen = ()=>{
        setsocket(newsocket);
        const msgtosend  = {
          type: 'join-room',
          name: name,
          roomid: roomid,
        }
        newsocket.send(JSON.stringify(msgtosend));

      }
      newsocket.onmessage = (msg)=>{
        const message = JSON.parse(msg.data);
        if(message.type==='error'){
          setiserror(true);
          seterrormessage(message.msg);
        }
        if(message.type==='opponent'){
          console.log("Got opponent:", message.opponent); 
          setopponent(message.opponent[0])
        }
        if(message.type==='move'){

          setgame(currentGame => {
            if (!currentGame) {
          // Initialize game if not already done
              const newGame = new Chess();
              newGame.move(message.move);
              return newGame;
            }
            const newGame = new Chess(currentGame.fen());
            newGame.move(message.move);
            return newGame;
          });

          
          if(message.result==='won'){
            setwinner(message.winner);
            setiswon(true);
          }
          else if(message.result ==='draw'){
            
            setisdraw(true);
          }
          else if(message.result ==='stalemate'){
            
            setisstalemate(true);
          }
          

        }

        if(message.type==='response'){
          setisdrawnotification(true);
          setdrawmessage(message.msg);

        }
        if(message.type==='acceptance'){
          setisdraw(true);
          setgame(null);

        }
        if(message.type==='rejection'){
          setdrawrequest(false);
          setisdraw(false)
          setrejectmessage(message.msg)
        }
        if(message.type==='resign'){
          setgame(null);
          setiswon(true);
          setwinner(name);
          setwonbyresign(message.msg);

        }
      }
      return ()=>{
        newsocket.close()
      }
    }, [])
  return (
    <div className = 'bg-white h-screen flex flex-col items-center justify-center'>
        {!game && iserror && (
          <div className =  'bg-white shadow-md shadow-gray-400 h-30 w-90 text-center'>
            <h1 className = 'text-red-700 font-semibold text-3xl mt-3'>{errormessage}</h1>
          </div>
        )}
        {!game && !iserror && (
          <>
            <h2>Choose sides</h2>
            <br></br>
            <button onClick = {()=>{
              handleSideSelect('white')
            }} className = 'bg-green-600 text-white px-5 py-2 rounded-md mr-2 mb-3'>White</button>
            <button onClick = {()=>{
              handleSideSelect('black')
            }} className = 'bg-green-600 text-white px-5 py-2 rounded-md mr-2'>Black</button>
          </>
        )}
        {game && !iserror && (
          <div className = 'h-screen flex  flex-col items-center justify-center bg-white'>
            {isdrawnotification && (
              <>
                <div className = 'bg-gray-100 text-gray-700 fixed h-20 w-140 flex mb-170 text-center'>
                  <p className = 'mt-5 ml-2 text-sm'>{drawmessage}</p>
                  <button onClick = {acceptdraw} className = 'bg-green-600 text-white rounded-md mr-4 px-3 py-2 h-10 w-30 mt-5'>Accept</button>
                  <button onClick = {rejectdraw} className = 'bg-red-600 text-white rounded-md px-3 py-2 h-10 w-30 mt-5 mr-5'>Reject</button>
                </div>
              </>
            )}
            <p className="mb-4 text-md text-gray-800">
              {opponent ? `Opponent: ${opponent}` : "Waiting for opponent..."}
            </p>
            <Chessboard
              position={game.fen()}
              onPieceDrop={(from, to)=>{
                handlemove(from, to)
              }}
              boardWidth={400}
              boardOrientation={orientation}
              isDraggablePiece={({ piece}) => {
                if (!game) return false;
                const turn = game.turn();
                
    // Only allow dragging pieces if the orientation is white and piece is white
                const playerColor = orientation === 'white' ? 'w' : 'b';
                 return turn === playerColor && piece.startsWith(playerColor);

              }}
            />
            <br></br>
              <p>{name}</p>
              <p>{rejectmessage ? rejectmessage : ''}</p>
              <div className = 'bg-white flex items-center justify-center gap-2 mt-2'>
                <button onClick = {handledraw} className = 'bg-green-600 text-white px-5 py-2 rounded-md'>{drawrequest ? 'Sent..' : 'Draw'}</button>
                <button onClick = {handleresign} className = 'bg-green-600 text-white px-5 py-2 rounded-md '>Resign</button>
              </div>
          </div>
        )}
        {iswon && (
          <>
            <p>{wonbyresign}</p>
            <p>{winner} has won the game</p>
          </>
        )}
        {isdraw && (
          <>
            <p>Draw between both the players</p>
          </>
        )}
        {isStalemate && (
          <>
            <p>Stalemate!!!!</p>
          </>
        )}
        {isresign && (
          <>
            <p>You have lost the game by resigning</p>
          </>
        )}
    </div>
  )
}

export default Game

;
*/

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const WS_URL = 'ws://localhost:3000';

function Game() {
  const [searchParams] = useSearchParams();
  const socketRef = useRef(null);

  const [iserror, setiserror] = useState(false);
  const [errormessage, seterrormessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [game, setgame] = useState(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [orientation, setorientation] = useState('white');
  const [opponent, setopponent] = useState('');

  const name = searchParams.get('name') || 'Player';
  const roomid = searchParams.get('id');

  const [iswon, setiswon] = useState(false);
  const [isdraw, setisdraw] = useState(false);
  const [isStalemate, setisstalemate] = useState(false);
  const [winner, setwinner] = useState('');

  const [isdrawnotification, setisdrawnotification] = useState(false);
  const [drawmessage, setdrawmessage] = useState('');
  const [drawrequest, setdrawrequest] = useState(false);
  const [rejectmessage, setrejectmessage] = useState('');

  const [isresign, setisresign] = useState(false);
  const [wonbyresign, setwonbyresign] = useState('');

  const sendMessage = useCallback((message) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setiserror(true);
      seterrormessage('Not connected to the game server. Please refresh.');
      return false;
    }

    socket.send(JSON.stringify({
      ...message,
      roomid,
    }));

    return true;
  }, [roomid]);

  useEffect(() => {
    if (!roomid) {
      setiserror(true);
      seterrormessage('Missing room ID. Please return to the home page.');
      return;
    }

    let active = true;
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!active) return;

      setConnected(true);
      setiserror(false);

      socket.send(JSON.stringify({
        type: 'join-room',
        name,
        roomid,
      }));
    };

    socket.onmessage = (event) => {
      if (!active) return;

      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        console.error('Invalid server message:', event.data);
        return;
      }

      switch (message.type) {
        case 'error':
          setiserror(true);
          seterrormessage(message.msg || 'Server error');
          break;

        case 'opponent': {
          const opponents = Array.isArray(message.opponent)
            ? message.opponent
            : [];

          setopponent(opponents[0] || '');
          break;
        }

        case 'move': {
          setgame((currentGame) => {
            const nextGame = currentGame
              ? new Chess(currentGame.fen())
              : new Chess();

            try {
              nextGame.move(message.move);
              setFen(nextGame.fen());
            } catch (error) {
              console.error('Could not apply opponent move:', error);
              return currentGame;
            }

            return nextGame;
          });

          if (message.result === 'won') {
            setwinner(message.winner || 'Opponent');
            setiswon(true);
          } else if (message.result === 'draw') {
            setisdraw(true);
          } else if (message.result === 'stalemate') {
            setisstalemate(true);
          }
          break;
        }

        case 'response':
          setisdrawnotification(true);
          setdrawmessage(message.msg || 'Your opponent requests a draw.');
          break;

        case 'acceptance':
          setisdraw(true);
          setgame(null);
          break;

        case 'rejection':
          setdrawrequest(false);
          setisdraw(false);
          setrejectmessage(message.msg || 'Draw request rejected.');
          break;

        case 'resign':
          setgame(null);
          setiswon(true);
          setwinner(name);
          setwonbyresign(message.msg || 'Your opponent resigned.');
          break;

        default:
          console.log('Unhandled server message:', message);
      }
    };

    socket.onerror = () => {
      if (!active) return;
      setiserror(true);
      seterrormessage('Cannot connect to the game server on port 4000.');
    };

    socket.onclose = () => {
      if (!active) return;
      setConnected(false);
      setopponent('');
    };

    return () => {
      active = false;
      socket.close();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [name, roomid]);

  const handleSideSelect = (side) => {
    const chess = new Chess();

    setgame(chess);
    setFen(chess.fen());
    setorientation(side);

    setisdraw(false);
    setisdrawnotification(false);
    setdrawrequest(false);
    setiswon(false);
    setisstalemate(false);
    setisresign(false);
    setwinner('');
    setwonbyresign('');
    setrejectmessage('');
  };

  const handlemove = (from, to) => {
    if (!game || !opponent || !connected || iswon || isdraw || isStalemate) {
      return false;
    }

    const chess = new Chess(game.fen());
    let move;

    try {
      move = chess.move({
        from,
        to,
        promotion: 'q',
      });
    } catch {
      return false;
    }

    if (!move) return false;

    let result = null;

    if (chess.isCheckmate()) {
      result = 'won';
    } else if (chess.isStalemate()) {
      result = 'stalemate';
    } else if (chess.isDraw()) {
      result = 'draw';
    }

    setgame(chess);
    setFen(chess.fen());

    if (result === 'won') {
      setiswon(true);
      setwinner(name);
    } else if (result === 'draw') {
      setisdraw(true);
    } else if (result === 'stalemate') {
      setisstalemate(true);
    }

    sendMessage({
      type: 'move',
      move: {
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      },
      result,
      winner: name,
    });

    return true;
  };

  const handledraw = () => {
    if (!opponent || !connected) return;

    if (sendMessage({
      type: 'request',
      msg: `${name} requests a draw`,
    })) {
      setdrawrequest(true);
      setrejectmessage('');
    }
  };

  const acceptdraw = () => {
    if (sendMessage({ type: 'acceptance' })) {
      setisdraw(true);
      setisdrawnotification(false);
      setgame(null);
    }
  };

  const rejectdraw = () => {
    if (sendMessage({ type: 'rejection' })) {
      setisdrawnotification(false);
      setisdraw(false);
    }
  };

  const handleresign = () => {
    if (!opponent || !connected) return;

    if (sendMessage({
      type: 'resign',
      msg: `${name} has resigned. You have won!`,
    })) {
      setisresign(true);
      setgame(null);
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center p-4">
      {!connected && !iserror && (
        <p className="mb-3 text-gray-600">Connecting to game server...</p>
      )}

      {iserror && (
        <div className="bg-white shadow-md p-5 rounded text-center mb-4">
          <h1 className="text-red-700 font-semibold text-xl">
            {errormessage}
          </h1>
        </div>
      )}

      {!game && !iserror && !iswon && !isdraw && !isresign && !isStalemate && (
        <>
          <h2 className="text-xl font-semibold mb-4">Choose your side</h2>
          <button
            onClick={() => handleSideSelect('white')}
            className="bg-green-600 text-white px-5 py-2 rounded-md mb-3"
          >
            White
          </button>
          <button
            onClick={() => handleSideSelect('black')}
            className="bg-green-600 text-white px-5 py-2 rounded-md"
          >
            Black
          </button>
        </>
      )}

      {game && !iserror && (
        <div className="flex flex-col items-center">
          {isdrawnotification && (
            <div className="bg-gray-100 p-4 rounded mb-4 flex flex-wrap items-center gap-3">
              <p>{drawmessage}</p>
              <button
                onClick={acceptdraw}
                className="bg-green-600 text-white rounded px-4 py-2"
              >
                Accept
              </button>
              <button
                onClick={rejectdraw}
                className="bg-red-600 text-white rounded px-4 py-2"
              >
                Reject
              </button>
            </div>
          )}

          <p className="mb-4 text-gray-800">
            {opponent
              ? `Opponent: ${opponent}`
              : 'Waiting for opponent to join the room...'}
          </p>

          <Chessboard
            position={fen}
            onPieceDrop={handlemove}
            boardWidth={400}
            boardOrientation={orientation}
            isDraggablePiece={({ piece }) => {
              if (!game || !opponent || !connected || iswon || isdraw || isStalemate) {
                return false;
              }

              const playerColor = orientation === 'white' ? 'w' : 'b';

              return (
                game.turn() === playerColor &&
                piece.startsWith(playerColor)
              );
            }}
          />

          <p className="mt-3">{name}</p>
          <p className="text-red-600 mt-2">{rejectmessage}</p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handledraw}
              disabled={!opponent || !connected || drawrequest}
              className="bg-green-600 text-white px-5 py-2 rounded-md disabled:opacity-50"
            >
              {drawrequest ? 'Sent...' : 'Draw'}
            </button>

            <button
              onClick={handleresign}
              disabled={!opponent || !connected}
              className="bg-red-600 text-white px-5 py-2 rounded-md disabled:opacity-50"
            >
              Resign
            </button>
          </div>
        </div>
      )}

      {iswon && (
        <div className="text-center">
          <p>{wonbyresign}</p>
          <p className="text-xl font-semibold">{winner} has won the game.</p>
        </div>
      )}

      {isdraw && <p className="text-xl">Draw between both players.</p>}

      {isStalemate && <p className="text-xl">Stalemate!</p>}

      {isresign && <p>You have resigned from the game.</p>}
    </div>
  );
}

export default Game;
