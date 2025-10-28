import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';

const PrescriptionUpload = ({ onUpload, loading }) => {
  const [file, setFile] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (file) {
      onUpload(file);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="prescription-upload">
      <Form.Group controlId="prescriptionFile" className="mb-3">
        <Form.Label>Upload handwritten prescription image</Form.Label>
        <Form.Control
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          disabled={loading}
        />
        <Form.Text className="text-muted">
          Supported formats: JPG, PNG, HEIC. Max size 5 MB.
        </Form.Text>
      </Form.Group>
      <Button type="submit" disabled={!file || loading}>
        {loading ? 'Processing...' : 'Analyze Prescription'}
      </Button>
    </Form>
  );
};

export default PrescriptionUpload;
