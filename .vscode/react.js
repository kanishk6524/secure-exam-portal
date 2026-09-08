import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styled from 'styled-components';

const TodoApp = () => {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState('all');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([
        ...todos,
        {
          id: uuidv4(),
          text: inputValue,
          completed: false,
          createdAt: new Date().toISOString()
        }
      ]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed') return todo.completed;
    if (filter === 'active') return !todo.completed;
    return true;
  });

  return (
    <Container>
      <Header>Todo List</Header>
      <InputContainer>
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a new task..."
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <AddButton onClick={addTodo}>Add</AddButton>
      </InputContainer>
      
      <FilterContainer>
        <FilterButton 
          active={filter === 'all'} 
          onClick={() => setFilter('all')}
        >
          All
        </FilterButton>
        <FilterButton 
          active={filter === 'active'} 
          onClick={() => setFilter('active')}
        >
          Active
        </FilterButton>
        <FilterButton 
          active={filter === 'completed'} 
          onClick={() => setFilter('completed')}
        >
          Completed
        </FilterButton>
      </FilterContainer>
      
      <TodoList>
        {filteredTodos.length > 0 ? (
          filteredTodos.map(todo => (
            <TodoItem key={todo.id} completed={todo.completed}>
              <Checkbox
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <TodoText>{todo.text}</TodoText>
              <DeleteButton onClick={() => deleteTodo(todo.id)}>×</DeleteButton>
            </TodoItem>
          ))
        ) : (
          <EmptyState>No todos found</EmptyState>
        )}
      </TodoList>
      
      <Status>
        {todos.filter(todo => !todo.completed).length} items left
      </Status>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Header = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 20px;
`;

const InputContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
`;

const AddButton = styled.button`
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
  &:hover {
    background: #218838;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  gap: 10px;
`;

const FilterButton = styled.button`
  padding: 5px 15px;
  background: ${props => props.active ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: ${props => props.active ? '#0069d9' : '#5a6268'};
  }
`;

const TodoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
`;

const TodoItem = styled.li`
  display: flex;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 4px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-decoration: ${props => props.completed ? 'line-through' : 'none'};
  opacity: ${props => props.completed ? 0.7 : 1};
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const TodoText = styled.span`
  flex: 1;
`;

const DeleteButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover {
    background: #c82333;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 20px;
  color: #6c757d;
`;

const Status = styled.div`
  text-align: center;
  color: #6c757d;
  font-size: 14px;
`;

export default TodoApp;