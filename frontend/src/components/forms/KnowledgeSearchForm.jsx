import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';

const KnowledgeSearchForm = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    onSearch(query);
  };

  return (
    <Form onSubmit={handleSubmit} className="knowledge-search">
      <InputGroup>
        <Form.Control
          placeholder="Search for medical terms, diseases, or medications"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </InputGroup>
    </Form>
  );
};

export default KnowledgeSearchForm;
