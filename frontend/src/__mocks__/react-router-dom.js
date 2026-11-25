const React = require('react');

module.exports = {
  BrowserRouter: ({ children }) => React.createElement('div', null, children),
  Routes: ({ children }) => React.createElement('div', null, children),
  Route: ({ element }) => element || null,
  Link: ({ children }) => React.createElement('a', null, children),
  NavLink: ({ children }) => React.createElement('a', null, children),
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
};

