import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AppNavbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand as={NavLink} to="/">MediAssist AI</Navbar.Brand>
        <Navbar.Toggle aria-controls="mediassist-nav" />
        <Navbar.Collapse id="mediassist-nav">
          <Nav className="ms-auto">
            {isAuthenticated ? (
              <>
                <Nav.Link as={NavLink} to="/dashboard">Dashboard</Nav.Link>
                <Nav.Link as={NavLink} to="/medicine-logs">Medicine Tracker</Nav.Link>
                <Nav.Link as={NavLink} to="/diagnosis">Smart Diagnosis</Nav.Link>
                <Nav.Link as={NavLink} to="/prescription">Prescription Insight</Nav.Link>
                <Nav.Link as={NavLink} to="/knowledge">Knowledge Simplifier</Nav.Link>
                <NavDropdown title={user?.name || 'Account'} id="user-dropdown">
                  <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <Nav.Link as={NavLink} to="/login">Login</Nav.Link>
                <Nav.Link as={NavLink} to="/register">Sign Up</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
