// XO Game with Firebase Realtime Implementation
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const gameSetup = document.getElementById('gameSetup');
  const gameBoard = document.getElementById('gameBoard');
  const createGameBtn = document.getElementById('createGameBtn');
  const joinGameBtn = document.getElementById('joinGameBtn');
  const joinGameInput = document.getElementById('joinGameInput');
  const statusMessage = document.getElementById('statusMessage');
  const playerSymbol = document.getElementById('playerSymbol');
  const roomCodeDisplay = document.getElementById('roomCode');
  const boardCells = document.querySelectorAll('.board-cell');
  const copyRoomBtn = document.getElementById('copyRoomBtn');
  const newGameBtn = document.getElementById('newGameBtn');
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notificationMessage');
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Game State
  let gameState = {
    roomCode: null,
    playerSymbol: null,
    isPlayerTurn: false,
    gameActive: false,
    board: Array(9).fill(''),
    currentTurn: 'X',
    gameEnded: false,
    winner: null,
    playerName: 'Player ' + Math.floor(Math.random() * 1000),
  };

  // References
  let gameRef = null;
  let movesRef = null;

  // Generate a random room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Initialize UI
  const initUI = () => {
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Initially hide the game board and show setup
    gameBoard.classList.remove('active');
    gameSetup.classList.add('active');
    updateStatusMessage('Create a new game or join an existing one');
    
    // Initially hide action buttons
    copyRoomBtn.style.display = 'none';
    newGameBtn.style.display = 'none';
  };

  // Update status message
  const updateStatusMessage = (message) => {
    statusMessage.textContent = message;
  };

  // Show notification
  const showNotification = (message, duration = 3000) => {
    notificationMessage.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, duration);
  };

  // Render the board based on current game state
  const renderBoard = () => {
    boardCells.forEach((cell, index) => {
      // Clear existing classes
      cell.classList.remove('x-move', 'o-move', 'winner');
      
      // Add appropriate class based on move
      if (gameState.board[index] === 'X') {
        cell.classList.add('x-move');
      } else if (gameState.board[index] === 'O') {
        cell.classList.add('o-move');
      }
      
      // Highlight winning cells
      if (gameState.winner && gameState.winner.line && gameState.winner.line.includes(index)) {
        cell.classList.add('winner');
      }
    });
  };

  // Check for a win
  const checkWin = (board) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return {
          winner: board[a],
          line: pattern
        };
      }
    }

    // Check for a draw
    if (!board.includes('')) {
      return { winner: 'Draw' };
    }

    return null;
  };

  // Create a new game
  const createGame = () => {
    const roomCode = generateRoomCode();
    gameState.roomCode = roomCode;
    gameState.playerSymbol = 'X'; // Creator is always X
    gameState.isPlayerTurn = true; // X goes first
    gameState.gameActive = true;
    gameState.board = Array(9).fill('');
    gameState.currentTurn = 'X';
    gameState.gameEnded = false;
    gameState.winner = null;

    // Update Firebase
    gameRef = database.ref(`games/${roomCode}`);
    movesRef = gameRef.child('moves');
    
    gameRef.set({
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      status: 'waiting',
      currentTurn: 'X',
      players: {
        X: gameState.playerName
      },
      board: gameState.board,
      gameEnded: false,
      winner: null
    });

    // Listen for changes
    setupGameListeners();

    // Update UI
    gameSetup.classList.remove('active');
    gameBoard.classList.add('active');
    roomCodeDisplay.textContent = roomCode;
    playerSymbol.textContent = 'X';
    updateStatusMessage("Waiting for player O to join...");
    
    // Show copy button
    copyRoomBtn.style.display = 'flex';
    newGameBtn.style.display = 'none';
    
    showNotification(`Game created! Room code: ${roomCode}`);
  };

  // Join an existing game
  const joinGame = (roomCode) => {
    if (!roomCode) {
      showNotification('Please enter a valid room code');
      return;
    }

    // Check if game exists
    const checkGameRef = database.ref(`games/${roomCode}`);
    
    checkGameRef.once('value')
      .then((snapshot) => {
        const gameData = snapshot.val();
        
        if (!gameData) {
          showNotification('Game not found');
          return;
        }
        
        if (gameData.status === 'waiting') {
          // Join as player O
          gameState.roomCode = roomCode;
          gameState.playerSymbol = 'O';
          gameState.isPlayerTurn = false; // X goes first
          gameState.board = gameData.board || Array(9).fill('');
          gameState.currentTurn = gameData.currentTurn || 'X';
          gameState.gameEnded = gameData.gameEnded || false;
          gameState.winner = gameData.winner || null;
          gameState.gameActive = true;
          
          // Update game in Firebase
          gameRef = database.ref(`games/${roomCode}`);
          movesRef = gameRef.child('moves');
          
          gameRef.update({
            status: 'active',
            players: {
              ...gameData.players,
              O: gameState.playerName
            }
          });
          
          // Listen for changes
          setupGameListeners();
          
          // Update UI
          gameSetup.classList.remove('active');
          gameBoard.classList.add('active');
          roomCodeDisplay.textContent = roomCode;
          playerSymbol.textContent = 'O';
          updateStatusMessage("X's turn");
          
          // Show action buttons
          copyRoomBtn.style.display = 'flex';
          newGameBtn.style.display = 'flex';
          
          showNotification('Joined the game successfully!');
        } else if (gameData.status === 'active') {
          // Check if we can reconnect as a player
          const players = gameData.players || {};
          
          if (!players.X || !players.O) {
            // Can join as the missing player
            const availableSymbol = !players.X ? 'X' : 'O';
            
            gameState.roomCode = roomCode;
            gameState.playerSymbol = availableSymbol;
            gameState.isPlayerTurn = gameData.currentTurn === availableSymbol;
            gameState.board = gameData.board || Array(9).fill('');
            gameState.currentTurn = gameData.currentTurn || 'X';
            gameState.gameEnded = gameData.gameEnded || false;
            gameState.winner = gameData.winner || null;
            gameState.gameActive = true;
            
            // Update game in Firebase
            gameRef = database.ref(`games/${roomCode}`);
            movesRef = gameRef.child('moves');
            
            // Update player info
            const playerUpdate = {};
            playerUpdate[availableSymbol] = gameState.playerName;
            
            gameRef.child('players').update(playerUpdate);
            
            // Listen for changes
            setupGameListeners();
            
            // Update UI
            gameSetup.classList.remove('active');
            gameBoard.classList.add('active');
            roomCodeDisplay.textContent = roomCode;
            playerSymbol.textContent = availableSymbol;
            updateStatusMessage(`${gameData.currentTurn}'s turn`);
            
            // Show action buttons
            copyRoomBtn.style.display = 'flex';
            newGameBtn.style.display = 'flex';
            
            showNotification(`Joined as Player ${availableSymbol}`);
          } else {
            showNotification('Game is already full');
          }
        } else {
          showNotification('Cannot join this game');
        }
      })
      .catch((error) => {
        console.error("Error joining game:", error);
        showNotification('Error joining game');
      });
  };

  // Setup game listeners
  const setupGameListeners = () => {
    if (!gameRef) return;
    
    // Listen for game state changes
    gameRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      
      gameState.board = data.board || gameState.board;
      gameState.currentTurn = data.currentTurn || gameState.currentTurn;
      gameState.gameEnded = data.gameEnded || false;
      gameState.winner = data.winner || null;
      gameState.isPlayerTurn = gameState.currentTurn === gameState.playerSymbol;
      
      // Update UI based on current game state
      renderBoard();
      
      if (gameState.gameEnded) {
        if (gameState.winner && gameState.winner.winner === 'Draw') {
          updateStatusMessage("Game ended in a draw!");
        } else if (gameState.winner) {
          if (gameState.winner.winner === gameState.playerSymbol) {
            updateStatusMessage("You won! 🎉");
          } else {
            updateStatusMessage(`Player ${gameState.winner.winner} won!`);
          }
        }
        newGameBtn.style.display = 'flex';
      } else {
        if (data.status === 'waiting') {
          updateStatusMessage("Waiting for player O to join...");
        } else {
          if (gameState.isPlayerTurn) {
            updateStatusMessage("Your turn");
          } else {
            updateStatusMessage(`${gameState.currentTurn}'s turn`);
          }
        }
      }
    });
    
    // Listen for player disconnect to handle reconnects
    gameRef.child('players').on('value', (snapshot) => {
      const players = snapshot.val() || {};
      
      // If the other player disconnected, update the status
      if (gameState.playerSymbol === 'X' && !players.O) {
        updateStatusMessage("Waiting for player O to join...");
      } else if (gameState.playerSymbol === 'O' && !players.X) {
        updateStatusMessage("Waiting for player X to join...");
      }
    });
  };

  // Make a move
  const makeMove = (index) => {
    // Check if it's a valid move
    if (
      !gameState.gameActive ||
      !gameState.isPlayerTurn || 
      gameState.board[index] !== '' || 
      gameState.gameEnded
    ) {
      return;
    }
    
    // Update local state
    const newBoard = [...gameState.board];
    newBoard[index] = gameState.playerSymbol;
    
    // Check for win/draw
    const result = checkWin(newBoard);
    
    // Update Firebase
    if (gameRef) {
      gameRef.update({
        board: newBoard,
        currentTurn: gameState.playerSymbol === 'X' ? 'O' : 'X',
        gameEnded: result !== null,
        winner: result
      });
      
      // Record the move
      movesRef.push({
        player: gameState.playerSymbol,
        position: index,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
    }
  };

  // Reset the game
  const resetGame = () => {
    if (!gameRef) return;
    
    // Only allow resetting if the game has ended
    if (!gameState.gameEnded) {
      showNotification("Can't reset until game is finished");
      return;
    }
    
    // Reset the board
    gameRef.update({
      board: Array(9).fill(''),
      currentTurn: 'X',
      gameEnded: false,
      winner: null,
      status: 'active'
    });
    
    showNotification('Starting a new game');
  };

  // Copy room code to clipboard
  const copyRoomCode = () => {
    if (!gameState.roomCode) return;
    
    // Use clipboard API
    navigator.clipboard.writeText(gameState.roomCode)
      .then(() => {
        showNotification('Room code copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy room code: ', err);
        // Fallback
        const input = document.createElement('input');
        input.value = gameState.roomCode;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('Room code copied to clipboard!');
      });
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // Update icon
    darkModeToggle.innerHTML = isDarkMode 
      ? '<i class="fas fa-sun"></i>' 
      : '<i class="fas fa-moon"></i>';
  };

  // Event Listeners
  createGameBtn.addEventListener('click', createGame);
  
  joinGameBtn.addEventListener('click', () => {
    joinGame(joinGameInput.value.trim());
  });
  
  joinGameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      joinGame(joinGameInput.value.trim());
    }
  });
  
  // Game board click handler
  boardCells.forEach((cell, index) => {
    cell.addEventListener('click', () => {
      makeMove(index);
    });
  });
  
  // Button event handlers
  copyRoomBtn.addEventListener('click', copyRoomCode);
  newGameBtn.addEventListener('click', resetGame);
  darkModeToggle.addEventListener('click', toggleDarkMode);

  // Initialize the UI
  initUI();
}); 