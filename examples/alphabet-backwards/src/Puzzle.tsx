import React from 'react';

import { PuzzleProps } from 'drunkmode-puzzles';
import {
  DragDropContext,
  Draggable,
  DraggableLocation,
  DropResult,
  Droppable,
} from 'react-beautiful-dnd';
import styled from 'styled-components';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
`;

const LetterList = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
`;

const LetterBlock = styled.div<{ $isDragging?: boolean }>`
  width: 60px;
  height: 60px;
  font-size: 28px;
  font-weight: bold;
  background-color: ${(p) => (p.$isDragging ? '#cce4ff' : '#f7f7f7')};
  border: 2px solid #999;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  user-select: none;
  box-shadow: ${(p) => (p.$isDragging ? '0 0 6px rgba(0,0,0,0.2)' : 'none')};
`;

interface Letter {
  id: string;
  value: string;
}

function generateLetters(): Letter[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const randomIndex = Math.floor(Math.random() * 22);
  const sortedLetters = alphabet
    .slice(randomIndex, randomIndex + 5);
  const randomizedLetters = [...sortedLetters].sort(() => 0.5 - Math.random());

  if (randomizedLetters.join('') === sortedLetters.join('')) {
    return generateLetters();
  }

  return randomizedLetters.map((v, i) => ({ id: `${v}-${i}`, value: v }));
}

export const Puzzle = (props: PuzzleProps) => {
  const [availableLetters, setAvailableLetters] = React.useState<Letter[]>([]);
  const [placedLetters, setPlacedLetters] = React.useState<( Letter | null)[]>([]);
  const [completed, setCompleted] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    let letters: Letter[];
    if (props.data && !props.startFresh) {
      try {
        const saved = typeof props.data === 'string' ? JSON.parse(props.data) : props.data;
        letters = saved;
      } catch {
        letters = generateLetters();
      }
    } else {
      letters = generateLetters();
    }
    setAvailableLetters(letters);
    // Not sure if I'm properly saving the placed letters here...
    // Circle back to this
    setPlacedLetters(Array(letters.length).fill(null));
  }, [props.data, props.startFresh]);

  function handleSelect(source: DraggableLocation, destSlot: number) {
    const movedLetter = availableLetters[source.index];
    if (!movedLetter) {
      return;
    }

    const newAvailable = Array.from(availableLetters);
    newAvailable.splice(source.index, 1);

    const newPlaced = Array.from(placedLetters);
    // if destination slot occupied, swap
    if (newPlaced[destSlot]) {
      const displaced = newPlaced[destSlot];
      newPlaced[destSlot] = movedLetter;
      newAvailable.push(displaced);
    } else {
      newPlaced[destSlot] = movedLetter;
    }

    setAvailableLetters(newAvailable);
    setPlacedLetters(newPlaced);
  }

  function handleDeselect(destination: DraggableLocation, srcSlot: number) {
    const letter = placedLetters[srcSlot];
    if (!letter) {
      return;
    }

    const newPlaced = Array.from(placedLetters);
    newPlaced[srcSlot] = null;

    const newAvailable = Array.from(availableLetters);
    newAvailable.splice(destination.index, 0, letter);

    setAvailableLetters(newAvailable);
    setPlacedLetters(newPlaced);
  }

  function handleChangeSlot(srcSlot: number, destSlot: number) {
    const newPlaced = Array.from(placedLetters);
    const moved = newPlaced[srcSlot];
    const target = newPlaced[destSlot];

    // swap or move into empty slot
    newPlaced[destSlot] = moved;
    newPlaced[srcSlot] = target || null;

    setPlacedLetters(newPlaced);
  }

  function handleReorder(source: DraggableLocation, destination: DraggableLocation) {
    const newAvailable = Array.from(availableLetters);
    const [moved] = newAvailable.splice(source.index, 1);
    newAvailable.splice(destination.index, 0, moved);
    setAvailableLetters(newAvailable);
  }

  function handleOnDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) {
      return;
    }

    const srcSlot = source.droppableId.startsWith('slot-')
      ? parseInt(source.droppableId.split('-')[1], 10)
      : null;
    const destSlot = destination.droppableId.startsWith('slot-')
      ? parseInt(destination.droppableId.split('-')[1], 10)
      : null;

    // Selecting Letter
    if (source.droppableId === 'bottom' && destSlot !== null) {
      handleSelect(source, destSlot);
      return;
    }

    // Deselecting letter
    if (srcSlot !== null && destination.droppableId === 'bottom') {
      handleDeselect(destination, srcSlot);
      return;
    }

    // Changing slots
    if (srcSlot !== null && destSlot !== null && srcSlot !== destSlot) {
      handleChangeSlot(srcSlot, destSlot);
      return;
    }

    // Reordering bottom row
    if (source.droppableId === 'bottom' && destination.droppableId === 'bottom') {
      handleReorder(source, destination);
      return;
    }
  }

  function checkAnswer() {
    const correct = [...placedLetters].map((l) => l?.value).sort().reverse();
    const current = placedLetters.map((l) => l?.value);
    if (JSON.stringify(current) === JSON.stringify(correct)) {
      setCompleted(true);
      props.onSuccess?.();
    } else {
      setCompleted(false);
      props.onMistake?.();
    }
  }

  function resetGame() {
    const letters = generateLetters();
    setAvailableLetters(letters);
    setPlacedLetters(Array(letters.length).fill(null));
    setCompleted(false);
  }

  return (
    <StyledContainer>
      {props.preview && <div>Alphabet Reversal Puzzle Preview</div>}
      <h3>Arrange the letters in reverse alphabetical order!</h3>

      {isClient && (
        <DragDropContext onDragEnd={ handleOnDragEnd }>
          {/* Top row - empty slots */}
          <div style={ {
            display: 'flex', gap: '10px', justifyContent: 'center', 
          } }>
            {placedLetters.map((letter, index) => (
              <Droppable droppableId={ `slot-${index}` } key={ `slot-${index}` }>
                {(provided, snapshot) => (
                  <div
                    ref={ provided.innerRef }
                    { ...provided.droppableProps }
                    style={ {
                      alignItems: 'center',
                      backgroundColor: snapshot.isDraggingOver ? '#e6f2ff' : '#fafafa',
                      border: '2px dashed #999',
                      borderRadius: 8,
                      display: 'flex',
                      height: 60,
                      justifyContent: 'center',
                      width: 60,
                    } }>
                    {letter && (
                      <Draggable draggableId={ letter.id } index={ 0 }>
                        {(provided, snapshot) => (
                          <LetterBlock
                            ref={ provided.innerRef }
                            { ...provided.draggableProps }
                            { ...provided.dragHandleProps }
                            $isDragging={ snapshot.isDragging }>
                            {letter.value}
                          </LetterBlock>
                        )}
                      </Draggable>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>

          {/* Bottom row - available letters */}
          <Droppable droppableId="bottom" direction="horizontal">
            {(provided) => (
              <LetterList ref={ provided.innerRef } { ...provided.droppableProps }>
                {availableLetters.map((letter, index) => (
                  <Draggable key={ letter.id } draggableId={ letter.id } index={ index }>
                    {(provided, snapshot) => (
                      <LetterBlock
                        ref={ provided.innerRef }
                        { ...provided.draggableProps }
                        { ...provided.dragHandleProps }
                        $isDragging={ snapshot.isDragging }>
                        {letter.value}
                      </LetterBlock>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </LetterList>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <div style={ {
        display: 'flex', gap: '1rem', marginTop: '1rem', 
      } }>
        <button onClick={ resetGame }>New Letters</button>
        <button onClick={ checkAnswer } disabled={ Boolean(availableLetters.length) }>Check Answer</button>
      </div>

      {completed ? (
        <div style={ { color: 'green' } }>✅ Nice! You got it right!</div>
      ) : (
        <div style={ { color: '#888' } }>{'Drag all letters to the top row and click "Check Answer".'}</div>
      )}
    </StyledContainer>
  );
};
