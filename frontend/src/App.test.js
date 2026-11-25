import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthContext } from './context/AuthContext';

test('renders navbar brand', () => {
  const ctx = { user: null, login: () => {}, logout: () => {} };
  render(
    <AuthContext.Provider value={ctx}>
      <App />
    </AuthContext.Provider>
  );
  expect(screen.getByLabelText('EduShare Home')).toBeInTheDocument();
});
