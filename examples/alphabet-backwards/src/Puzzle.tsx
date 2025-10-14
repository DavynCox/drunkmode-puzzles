import React from 'react';

import { PuzzleProps } from 'drunkmode-puzzles';
import { 
  DragDropContext, 
  Draggable, 
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

function generateLetters(): { id: string; value: string }[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const randomIndex = Math.floor(Math.random() * 22);
  const values = alphabet.slice(randomIndex, randomIndex+5).sort(() => 0.5 - Math.random());

  // ensure not alphabetical
  const sorted = [...values].sort();
  if (values.join('') === sorted.join('')) {
    return generateLetters();
  }

  // stable ids based on value and index
  return values.map((v, i) => ({ id: `${v}-${i}`, value: v }));
}

export const Puzzle = (props: PuzzleProps) => {
  const [letters, setLetters] = React.useState<{ id: string; value: string }[]>([]);
  const [completed, setCompleted] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  // detect client
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // initialize letters
  React.useEffect(() => {
    if (props.data && !props.startFresh) {
      try {
        const saved = typeof props.data === 'string' ? JSON.parse(props.data) : props.data;
        setLetters(saved);
      } catch {
        setLetters(generateLetters());
      }
    } else {
      setLetters(generateLetters());
    }
  }, []);

  const handleOnDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    const reordered = Array.from(letters);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLetters(reordered);
    
    props.onProgress?.(JSON.stringify(reordered.map((l) => l.value)));
    
    const correct = [...reordered.map((l) => l.value)].sort().reverse();
    if (JSON.stringify(reordered.map((l) => l.value)) === JSON.stringify(correct)) {
      if (!completed) {
        setCompleted(true);
        props.onSuccess?.();
      }
    } else {
      setCompleted(false);
      props.onMistake?.();
    }
  };

  const resetGame = () => {
    setLetters(generateLetters());
    setCompleted(false);
  };

  return (
    <StyledContainer>
      {props.preview && <div>Alphabet Reversal Puzzle Preview</div>}
      <h3>Arrange the letters in reverse alphabetical order!</h3>

      {isClient && (
        <DragDropContext onDragEnd={ handleOnDragEnd }>
          <Droppable droppableId="letters" direction="horizontal">
            {(provided) => (
              <LetterList ref={ provided.innerRef } { ...provided.droppableProps }>
                {letters.map((letterObj, index) => (
                  <Draggable key={ letterObj.id } draggableId={ letterObj.id } index={ index }>
                    {(provided, snapshot) => (
                      <LetterBlock
                        ref={ provided.innerRef }
                        { ...provided.draggableProps }
                        { ...provided.dragHandleProps }
                        $isDragging={ snapshot.isDragging }>
                        {letterObj.value}
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

      {completed ? (
        <div style={ { color: 'green' } }>✅ Nice! You got it right!</div>
      ) : (
        <div style={ { color: '#888' } }>Drag to rearrange.</div>
      )}

      <div style={ {
        display: 'flex', gap: '1rem', marginTop: '1rem', 
      } }>
        <button onClick={ resetGame }>New Letters</button>
      </div>
    </StyledContainer>
  );
};

