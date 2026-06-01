const DIRECTIONS = [
  { name: 'north', dx: 0, dy: -1, opposite: 'south' },
  { name: 'east', dx: 1, dy: 0, opposite: 'west' },
  { name: 'south', dx: 0, dy: 1, opposite: 'north' },
  { name: 'west', dx: -1, dy: 0, opposite: 'east' },
];

function posKey(x, y) {
  return `${x},${y}`;
}

function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createRoom(id, x, y) {
  return {
    id,
    position: { x, y },
    connections: {
      north: null,
      east: null,
      south: null,
      west: null,
    },
    type: 'normal',
  };
}

function getNeighbors(position) {
  return DIRECTIONS.map(({ name, dx, dy, opposite }) => ({
    direction: name,
    opposite,
    x: position.x + dx,
    y: position.y + dy,
  }));
}

function computeDistances(rooms, startId) {
  const distances = {};
  const queue = [startId];
  distances[startId] = 0;

  while (queue.length) {
    const currentId = queue.shift();
    const currentRoom = rooms[currentId];
    for (const [dir, neighborId] of Object.entries(currentRoom.connections)) {
      if (neighborId === null || distances[neighborId] !== undefined) continue;
      distances[neighborId] = distances[currentId] + 1;
      queue.push(neighborId);
    }
  }

  return distances;
}

function assignRoomTypes(rooms, startId) {
  const distances = computeDistances(rooms, startId);
  const roomList = rooms.slice();
  roomList.sort((a, b) => (distances[a.id] || 0) - (distances[b.id] || 0));

  const bossRoom = roomList[roomList.length - 1];
  bossRoom.type = 'boss';

  const midIndex = Math.floor(roomList.length / 2);
  const candidateShop = roomList.slice(1, roomList.length - 1).find((room, index) => index === midIndex - 1 || index === midIndex || index === midIndex + 1);
  if (candidateShop) {
    candidateShop.type = 'shop';
  }

  const deadEnds = roomList.filter(room => {
    const degree = Object.values(room.connections).filter(conn => conn !== null).length;
    return degree === 1 && room.id !== startId && room.type === 'normal';
  });

  const specialCount = Math.min(2, Math.max(1, Math.floor(deadEnds.length / 2)));
  shuffle(deadEnds).slice(0, specialCount).forEach((room) => {
    room.type = 'special';
  });

  // if no dead ends were available, assign special rooms to high-distance normals
  if (!deadEnds.length) {
    const fallback = roomList.filter(room => room.type === 'normal' && room.id !== startId && room.id !== bossRoom.id);
    shuffle(fallback).slice(0, specialCount).forEach((room) => {
      room.type = 'special';
    });
  }
}

export function generateRoomGraph(targetRoomCount = null) {
  const roomCount = targetRoomCount || Math.floor(Math.random() * 9) + 12;
  const count = Math.max(12, Math.min(20, roomCount));

  const rooms = [];
  const occupied = new Set();
  const positionToId = new Map();
  const frontier = [];

  const addRoom = (x, y) => {
    const id = rooms.length;
    const room = createRoom(id, x, y);
    rooms.push(room);
    const key = posKey(x, y);
    occupied.add(key);
    positionToId.set(key, id);
    frontier.push(room);
    return room;
  };

  const startRoom = addRoom(0, 0);

  while (rooms.length < count && frontier.length) {
    const sourceIndex = Math.floor(Math.random() * frontier.length);
    const sourceRoom = frontier[sourceIndex];
    const neighbors = shuffle(getNeighbors(sourceRoom.position));
    let addedRoom = false;

    for (const neighbor of neighbors) {
      const neighborKey = posKey(neighbor.x, neighbor.y);
      if (occupied.has(neighborKey)) continue;

      const newRoom = addRoom(neighbor.x, neighbor.y);
      sourceRoom.connections[neighbor.direction] = newRoom.id;
      newRoom.connections[neighbor.opposite] = sourceRoom.id;
      addedRoom = true;
      break;
    }

    if (!addedRoom) {
      frontier.splice(sourceIndex, 1);
    }
  }

  // optional extra connections to reduce strictly linear structure
  const extraEdges = Math.max(0, Math.floor(count / 6));
  for (let i = 0; i < extraEdges; i += 1) {
    const candidateRooms = shuffle(rooms);
    let linked = false;

    for (const room of candidateRooms) {
      const neighbors = shuffle(getNeighbors(room.position));
      for (const neighbor of neighbors) {
        const key = posKey(neighbor.x, neighbor.y);
        if (!positionToId.has(key)) continue;
        const neighborId = positionToId.get(key);
        if (room.connections[neighbor.direction] !== null) continue;

        room.connections[neighbor.direction] = neighborId;
        rooms[neighborId].connections[neighbor.opposite] = room.id;
        linked = true;
        break;
      }
      if (linked) break;
    }
  }

  assignRoomTypes(rooms, startRoom.id);

  return {
    rooms: rooms.map((room) => ({
      id: room.id,
      position: room.position,
      connections: room.connections,
      type: room.type,
    })),
    startRoomId: startRoom.id,
    bossRoomId: rooms.find((room) => room.type === 'boss')?.id ?? startRoom.id,
    shopRoomId: rooms.find((room) => room.type === 'shop')?.id ?? null,
    specialRoomIds: rooms.filter((room) => room.type === 'special').map((room) => room.id),
  };
}

export function debugPrintRoomGraph(graph) {
  if (!graph || !Array.isArray(graph.rooms)) {
    console.warn('Invalid room graph provided for debug print.');
    return;
  }

  console.group('Room Graph Debug');
  console.log(`Rooms: ${graph.rooms.length}`);
  graph.rooms.forEach((room) => {
    console.log(`Room ${room.id} (${room.type}) @ ${room.position.x},${room.position.y} ->`, room.connections);
  });

  const xs = graph.rooms.map((room) => room.position.x);
  const ys = graph.rooms.map((room) => room.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => ' . '));

  graph.rooms.forEach((room) => {
    const char = room.type === 'boss' ? 'B' : room.type === 'shop' ? 'S' : room.type === 'special' ? '*' : room.id === graph.startRoomId ? 'X' : 'O';
    const x = room.position.x - minX;
    const y = room.position.y - minY;
    grid[y][x] = ` ${char} `;
  });

  console.log('Room graph layout (X=start, B=boss, S=shop, *=special, O=normal):');
  for (const row of grid) {
    console.log(row.join(''));
  }
  console.groupEnd();
}
